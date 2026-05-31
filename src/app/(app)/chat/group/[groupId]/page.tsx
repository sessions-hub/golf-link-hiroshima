'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'
import AttachmentPicker from '@/components/AttachmentPicker'
import GenderBadge from '@/components/GenderBadge'

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
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const profilesRef = useRef<Record<string, Profile>>({})

  useEffect(() => { profilesRef.current = profiles }, [profiles])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: group } = await supabase
        .from('friend_groups')
        .select('id, name')
        .eq('id', groupId)
        .single()
      if (!group) { router.push('/chat'); return }
      setGroupName(group.name)

      const { data: membership } = await supabase
        .from('friend_group_members')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) { router.push('/chat'); return }

      const { count } = await supabase
        .from('friend_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
      setMemberCount(count ?? 0)

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

  if (loading) return <PageLoading />

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--off)' }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '16px', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.push('/chat?tab=group')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👥</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groupName}</div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>{memberCount}名のメンバー</div>
        </div>
      </div>

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
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--g1)', flexShrink: 0 }}>
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : profile?.nickname?.[0] ?? '?'}
                  </div>
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
                {m.content && <div style={{ padding: m.image_url || m.file_url ? '4px 4px 0' : '0' }}>{m.content}</div>}
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
        <div style={{ padding: '8px 16px', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
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
      <div style={{ padding: '10px 16px calc(env(safe-area-inset-bottom) + 10px)', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <AttachmentPicker
          onImageSelect={(file) => { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)) }}
          onFileSelect={(file) => setSelectedFile(file)}
        />
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMsg()} placeholder="メッセージを入力..." style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
        <button onClick={sendMsg} disabled={sending} style={{ width: 38, height: 38, borderRadius: '50%', background: sending ? 'var(--mute)' : 'var(--g1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>
    </div>
  )
}
