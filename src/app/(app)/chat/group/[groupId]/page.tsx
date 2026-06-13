'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'
import AttachmentPicker from '@/components/AttachmentPicker'
import GenderBadge from '@/components/GenderBadge'
import { Avatar } from '@/components/Avatar'

interface FriendGroupMessage {
  id: string
  group_id: string
  user_id: string
  content: string | null
  image_url: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
}

interface Profile {
  user_id: string
  nickname: string
  avatar_url: string | null
  gender?: string | null
}

interface Member {
  user_id: string
  profiles: { user_id: string; nickname: string; avatar_url: string | null; gender?: string | null } | null
}

export default function FriendGroupChatPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string
  const supabase = createClient()

  const [messages, setMessages] = useState<FriendGroupMessage[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [input, setInput] = useState('')
  const [myId, setMyId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [isCreator, setIsCreator] = useState(false)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // 設定シート
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [addableFriends, setAddableFriends] = useState<Profile[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set())
  const [addingMembers, setAddingMembers] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const profilesRef = useRef<Record<string, Profile>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { profilesRef.current = profiles }, [profiles])

  const reloadMembers = async () => {
    const res = await fetch(`/api/group-members/${groupId}`)
    if (res.ok) setMembers(await res.json())
  }

  useEffect(() => {
    let cleanup: (() => void) | undefined
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: group } = await supabase
        .from('friend_groups')
        .select('id, name, created_by')
        .eq('id', groupId)
        .single()
      if (!group) { router.push('/chat'); return }
      setGroupName(group.name)
      setEditName(group.name)
      setIsCreator(group.created_by === user.id)

      // icon_url は列が存在する場合のみ取得
      const { data: iconData } = await supabase
        .from('friend_groups')
        .select('icon_url')
        .eq('id', groupId)
        .single()
      if (iconData) setIconUrl((iconData as any).icon_url ?? null)

      const { data: membership } = await supabase
        .from('friend_group_members')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) { router.push('/chat'); return }

      await reloadMembers()

      const { data: msgs } = await supabase
        .from('friend_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (msgs && msgs.length > 0) {
        setMessages(msgs)
        const userIds = [...new Set(msgs.map((m: FriendGroupMessage) => m.user_id))]
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url, gender')
          .in('user_id', userIds)
        if (profileData) {
          const map: Record<string, Profile> = {}
          profileData.forEach((p: Profile) => { map[p.user_id] = p })
          setProfiles(map)
          profilesRef.current = map
        }
        setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'auto' }) }, 100)
      }

      localStorage.setItem(`friend_group_last_seen_${groupId}`, new Date().toISOString())
      setLoading(false)

      const channel = supabase
        .channel(`friend-group-chat:${groupId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_group_messages',
          filter: `group_id=eq.${groupId}`,
        }, async (payload) => {
          const newMsg = payload.new as FriendGroupMessage
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          if (!profilesRef.current[newMsg.user_id]) {
            const { data: p } = await supabase
              .from('profiles')
              .select('user_id, nickname, avatar_url, gender')
              .eq('user_id', newMsg.user_id)
              .single()
            if (p) setProfiles(prev => ({ ...prev, [p.user_id]: p }))
          }
          localStorage.setItem(`friend_group_last_seen_${groupId}`, new Date().toISOString())
        })
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    }
    init()
    return () => { cleanup?.() }
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const sendMsg = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || !myId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    let imageUrl: string | null = null
    let fileUrl: string | null = null
    let fileName: string | null = null

    if (selectedImage) {
      const imgName = `${myId}/${Date.now()}_img`
      const { error } = await supabase.storage.from('user-photos').upload(imgName, selectedImage, { contentType: selectedImage.type, upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(imgName)
        imageUrl = data.publicUrl
      }
      setSelectedImage(null); setImagePreview(null)
    }
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop() ?? 'pdf'
      const safeName = `${myId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('user-files').upload(safeName, selectedFile, { contentType: selectedFile.type, upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('user-files').getPublicUrl(safeName)
        fileUrl = data.publicUrl; fileName = selectedFile.name
      }
      setSelectedFile(null)
    }

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, group_id: groupId, user_id: myId, content: content || null, image_url: imageUrl, file_url: fileUrl, file_name: fileName, created_at: new Date().toISOString() }])

    const { data: savedMsg } = await supabase
      .from('friend_group_messages')
      .insert({ group_id: groupId, user_id: myId, content: content || null, image_url: imageUrl, file_url: fileUrl, file_name: fileName })
      .select().single()
    if (savedMsg) setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m))
    setSending(false)
  }

  const handleSaveName = async () => {
    const name = editName.trim()
    if (!name || name === groupName || savingName) return
    setSavingName(true)
    const res = await fetch(`/api/group-settings/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setGroupName(name)
    } else {
      alert('名前の変更に失敗しました')
    }
    setSavingName(false)
  }

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIcon(true)
    const path = `group-icons/${groupId}/${Date.now()}`
    const { error } = await supabase.storage.from('user-photos').upload(path, file, { contentType: file.type, upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('user-photos').getPublicUrl(path)
      const res = await fetch(`/api/group-settings/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon_url: data.publicUrl }),
      })
      if (res.ok) {
        setIconUrl(data.publicUrl)
      } else {
        const err = await res.json()
        alert(`アイコン更新に失敗: ${err.error}`)
      }
    }
    setUploadingIcon(false)
  }

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return
    const res = await fetch(`/api/group-members/${groupId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.user_id !== targetUserId))
    } else {
      alert('削除に失敗しました')
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('グループから退会しますか？')) return
    setLeaving(true)
    const res = await fetch(`/api/group-members/${groupId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: myId }),
    })
    if (res.ok) {
      router.push('/chat?tab=group')
    } else {
      alert('退会に失敗しました')
      setLeaving(false)
    }
  }

  const openAddMembersModal = async () => {
    const memberIds = new Set(members.map(m => m.user_id))
    const [{ data: myFavs }, { data: favMe }] = await Promise.all([
      supabase.from('favorites').select('target_id').eq('user_id', myId),
      supabase.from('favorites').select('user_id').eq('target_id', myId),
    ])
    if (!myFavs || !favMe) return
    const favMeSet = new Set(favMe.map((f: any) => f.user_id))
    const mutualIds = myFavs
      .filter((f: any) => favMeSet.has(f.target_id))
      .map((f: any) => f.target_id)
      .filter((id: string) => !memberIds.has(id))
    if (mutualIds.length > 0) {
      const { data } = await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', mutualIds)
      setAddableFriends(data ?? [])
    } else {
      setAddableFriends([])
    }
    setAddSelected(new Set())
    setShowAddModal(true)
  }

  const handleAddMembers = async () => {
    if (addSelected.size === 0 || addingMembers) return
    setAddingMembers(true)
    const res = await fetch(`/api/group-members/${groupId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: Array.from(addSelected) }),
    })
    if (res.ok) {
      await reloadMembers()
      setShowAddModal(false)
      setAddSelected(new Set())
    } else {
      alert('メンバーの追加に失敗しました')
    }
    setAddingMembers(false)
  }

  if (loading) return <PageLoading />

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--off)' }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '16px', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.push('/chat?tab=group')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {iconUrl ? <img src={iconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '👥'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groupName}</div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>{members.length}名のメンバー</div>
        </div>
        <button onClick={() => setShowSettings(true)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
      </div>

      {/* メンバーアバターバー */}
      {members.length > 0 && (
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', flexShrink: 0 }}>
          {members.map(m => (
            <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ border: '2px solid var(--line)', borderRadius: '50%', overflow: 'hidden', lineHeight: 0 }}>
                <Avatar size={40} nickname={m.profiles?.nickname ?? ''} gender={m.profiles?.gender} avatarUrl={m.profiles?.avatar_url ?? null} />
              </div>
              <div style={{ fontSize: 8, color: 'var(--mute)', maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {m.profiles?.nickname ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>グループチャットへようこそ！</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>メンバー全員とメッセージを共有できます</div>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.user_id === myId
          const isTemp = m.id.startsWith('temp-')
          const profile = profiles[m.user_id]
          const time = new Date(m.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id} style={{ maxWidth: '76%', alignSelf: isMe ? 'flex-end' : 'flex-start', opacity: isTemp ? 0.7 : 1 }}>
              {!isMe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <Avatar size={22} nickname={profile?.nickname ?? ''} gender={profile?.gender} avatarUrl={profile?.avatar_url ?? null} />
                  <span style={{ fontSize: 10, color: 'var(--mute)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>{profile?.nickname ?? 'メンバー'}<GenderBadge gender={profile?.gender} size={10} /></span>
                </div>
              )}
              <div style={{ padding: m.image_url || m.file_url ? '6px' : '10px 13px', borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isMe ? 'var(--g1)' : 'white', color: isMe ? 'white' : 'var(--txt)', fontSize: 13, lineHeight: 1.5, border: !isMe ? '1px solid var(--line)' : 'none' }}>
                {m.image_url && <img src={m.image_url} alt="画像" style={{ width: '100%', maxWidth: 200, borderRadius: 8, display: 'block' }} />}
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: isMe ? 'var(--lime)' : 'var(--g2)', textDecoration: 'none', padding: '4px 6px' }}>
                    <span>📄</span><span style={{ fontSize: 12 }}>{m.file_name ?? 'ファイル'}</span>
                  </a>
                )}
                {m.content && <div style={{ padding: m.image_url || m.file_url ? '4px 4px 0' : '0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>}
              </div>
              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                {isTemp ? '送信中...' : time}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 添付プレビュー */}
      {(imagePreview || selectedFile) && (
        <div style={{ padding: '8px 16px', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {imagePreview && (
            <div style={{ position: 'relative' }}>
              <img src={imagePreview} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => { setSelectedImage(null); setImagePreview(null) }} style={{ position: 'absolute', top: -6, right: -6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: 'white', cursor: 'pointer', fontSize: 10 }}>×</button>
            </div>
          )}
          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surf)', borderRadius: 8, padding: '6px 10px', flex: 1 }}>
              <span>📄</span>
              <span style={{ fontSize: 12, color: 'var(--txt)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--mute)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          )}
        </div>
      )}

      {/* 入力エリア */}
      <div style={{ padding: '10px 16px calc(env(safe-area-inset-bottom) + 10px)', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <AttachmentPicker
          onImageSelect={(file) => { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)) }}
          onFileSelect={(file) => setSelectedFile(file)}
        />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          rows={1}
          style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', overflow: 'hidden', lineHeight: 1.5, fontFamily: 'inherit', minHeight: 40, maxHeight: 120 }}
        />
        <button onClick={sendMsg} disabled={sending} style={{ width: 38, height: 38, borderRadius: '50%', background: sending ? 'var(--mute)' : 'var(--g1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>

      {/* 設定シート */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>グループ設定</div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--mute)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* アイコン＋グループ名（作成者のみ編集可） */}
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surf)', border: '2px solid var(--line)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {uploadingIcon
                      ? <div style={{ fontSize: 10, color: 'var(--mute)' }}>...</div>
                      : iconUrl
                        ? <img src={iconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : '👥'}
                  </div>
                  {isCreator && (
                    <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconUpload} />
                    </label>
                  )}
                </div>

                {isCreator ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 300 }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontWeight: 600, color: 'var(--txt)', outline: 'none', textAlign: 'center' }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !editName.trim() || editName.trim() === groupName}
                      style={{ background: editName.trim() && editName.trim() !== groupName ? 'var(--g1)' : 'var(--surf)', color: editName.trim() && editName.trim() !== groupName ? 'white' : 'var(--mute)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {savingName ? '...' : '保存'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>{groupName}</div>
                )}
              </div>

              {/* メンバー一覧 */}
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>メンバー {members.length}名</div>
                {members.map(m => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--surf)' }}>
                    <Avatar size={38} nickname={m.profiles?.nickname ?? ''} gender={m.profiles?.gender} avatarUrl={m.profiles?.avatar_url ?? null} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                      {m.profiles?.nickname ?? '不明'}
                      {m.user_id === myId && <span style={{ fontSize: 10, color: 'var(--mute)', marginLeft: 5 }}>（あなた）</span>}
                    </div>
                    {isCreator && m.user_id !== myId && (
                      <button onClick={() => handleRemoveMember(m.user_id)} style={{ background: 'none', border: '1px solid rgba(200,60,60,.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#c05050', cursor: 'pointer', flexShrink: 0 }}>
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* メンバー追加 */}
              <div style={{ padding: '12px 16px' }}>
                <button onClick={openAddMembersModal} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--g2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  メンバーを追加
                </button>
              </div>

              {/* 退会 */}
              <div style={{ padding: '0 16px 40px' }}>
                <button onClick={handleLeaveGroup} disabled={leaving} style={{ width: '100%', background: 'rgba(200,60,60,.06)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 600, color: '#c05050', cursor: leaving ? 'not-allowed' : 'pointer' }}>
                  {leaving ? '退会中...' : 'グループから退会'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メンバー追加モーダル */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 110, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>メンバーを追加</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--mute)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {addableFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 13, color: 'var(--mute)' }}>追加できるフレンドがいません</div>
              ) : addableFriends.map(f => (
                <div key={f.user_id} onClick={() => setAddSelected(prev => { const n = new Set(prev); n.has(f.user_id) ? n.delete(f.user_id) : n.add(f.user_id); return n })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: addSelected.has(f.user_id) ? 'rgba(46,125,85,.06)' : 'transparent' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surf)', overflow: 'hidden', border: `2px solid ${addSelected.has(f.user_id) ? 'var(--g2)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--g2)', flexShrink: 0 }}>
                    {f.avatar_url ? <img src={f.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : f.nickname?.[0]}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{f.nickname}</div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${addSelected.has(f.user_id) ? 'var(--g2)' : 'var(--line)'}`, background: addSelected.has(f.user_id) ? 'var(--g2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {addSelected.has(f.user_id) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
              <button onClick={handleAddMembers} disabled={addSelected.size === 0 || addingMembers} style={{ width: '100%', background: addSelected.size > 0 ? 'var(--g1)' : 'var(--mute)', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: addSelected.size > 0 ? 'pointer' : 'not-allowed' }}>
                {addingMembers ? '追加中...' : addSelected.size > 0 ? `${addSelected.size}名を追加する` : 'メンバーを選択してください'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
