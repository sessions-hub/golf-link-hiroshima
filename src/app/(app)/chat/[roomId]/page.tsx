'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { ReactionPalette, ReactionBar } from '@/components/ReactionPalette'
import { FriendAvatar } from '@/components/FriendAvatar'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  image_url: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
}

interface Profile {
  user_id: string
  nickname: string
  avatar_url: string | null
}

export default function ChatRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.roomId as string
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [myId, setMyId] = useState('')
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({})
  const [paletteMessageId, setPaletteMessageId] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (!room) { router.push('/match'); return }

      const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id

      const [{ data: profile }, { data: myFav }, { data: theirFav }] = await Promise.all([
        supabase.from('profiles').select('user_id, nickname, avatar_url').eq('user_id', otherUserId).single(),
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', otherUserId).maybeSingle(),
        supabase.from('favorites').select('id').eq('user_id', otherUserId).eq('target_id', user.id).maybeSingle(),
      ])
      if (profile) setOtherProfile(profile)
      setIsFriend(!!(myFav && theirFav))

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (msgs) {
        setMessages(msgs)
        // リアクション読み込み
        const msgIds = msgs.map((m: any) => m.id)
        if (msgIds.length > 0) {
          const { data: rxnData } = await supabase
            .from('message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', msgIds)
          if (rxnData) {
            const rxns: Record<string, Record<string, string[]>> = {}
            rxnData.forEach((r: any) => {
              if (!rxns[r.message_id]) rxns[r.message_id] = {}
              if (!rxns[r.message_id][r.emoji]) rxns[r.message_id][r.emoji] = []
              rxns[r.message_id][r.emoji].push(r.user_id)
            })
            setMessageReactions(rxns)
          }
        }
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 100)
      }

      // 未読カウントをリセット
      const { data: roomInfo } = await supabase
        .from('chat_rooms')
        .select('user1_id')
        .eq('id', roomId)
        .single()

      if (roomInfo) {
        const isUser1 = roomInfo.user1_id === user.id
        await supabase.from('chat_rooms').update({
          unread_count_user1: isUser1 ? 0 : undefined,
          unread_count_user2: isUser1 ? undefined : 0,
        }).eq('id', roomId)
      }

      setLoading(false)

      const channel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // 重複チェック
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startPress = (msgId: string) => {
    pressTimer.current = setTimeout(() => {
      setPaletteMessageId(msgId)
    }, 600)
  }

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const toggleMessageReaction = async (messageId: string, emoji: string) => {
    if (!myId) return
    const existing = messageReactions[messageId]?.[emoji] ?? []
    const hasReacted = existing.includes(myId)
    if (hasReacted) {
      await supabase.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', myId)
        .eq('emoji', emoji)
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          [emoji]: (prev[messageId]?.[emoji] ?? []).filter(id => id !== myId),
        },
      }))
    } else {
      await supabase.from('message_reactions')
        .insert({ message_id: messageId, user_id: myId, emoji })
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          [emoji]: [...(prev[messageId]?.[emoji] ?? []), myId],
        },
      }))
    }
    setPaletteMessageId(null)
  }

  const sendMsg = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || !myId || sending) return
    setSending(true)

    const content = input.trim()
    setInput('')

    let imageUrl: string | null = null
    let fileUrl: string | null = null
    let fileName: string | null = null

    // 画像アップロード
    if (selectedImage) {
      const imgName = `${myId}/${Date.now()}_img`
      const { error } = await supabase.storage
        .from('user-photos')
        .upload(imgName, selectedImage, { contentType: selectedImage.type, upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(imgName)
        imageUrl = data.publicUrl
      }
      setSelectedImage(null)
      setImagePreview(null)
    }

    // ファイルアップロード
    if (selectedFile) {
      // ファイル名をASCIIのみに変換
      const ext = selectedFile.name.split('.').pop() ?? 'file'
      const safeName = `${myId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('user-photos')
        .upload(safeName, selectedFile, { contentType: selectedFile.type, upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(safeName)
        fileUrl = data.publicUrl
        fileName = selectedFile.name  // 元のファイル名は表示用に保持
      } else {
        console.error('File upload error:', error)
      }
      setSelectedFile(null)
    }

    // 楽観的UI更新（即時表示）
    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: myId,
      content: content || '',
      image_url: imageUrl,
      file_url: fileUrl,
      file_name: fileName,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    // DBに保存
    const { data: savedMsg } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: myId,
      content: content || '',
      image_url: imageUrl,
      file_url: fileUrl,
      file_name: fileName,
    }).select().single()

    // チャットルームのlast_messageと未読カウントを更新
    const lastMsgText = imageUrl ? '📷 画像' : fileUrl ? '📄 ファイル' : content

    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id, unread_count_user1, unread_count_user2')
      .eq('id', roomId)
      .single()

    if (roomData) {
      const isUser1 = roomData.user1_id === myId
      await supabase.from('chat_rooms').update({
        last_message: lastMsgText,
        last_message_at: new Date().toISOString(),
        // 相手の未読カウントを増やす
        unread_count_user1: isUser1 ? roomData.unread_count_user1 : (roomData.unread_count_user1 ?? 0) + 1,
        unread_count_user2: isUser1 ? (roomData.unread_count_user2 ?? 0) + 1 : roomData.unread_count_user2,
      }).eq('id', roomId)
    }

    // tempメッセージをDBのメッセージに置換
    if (savedMsg) {
      setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m))
    }

    // プッシュ通知
    try {
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('user1_id, user2_id')
        .eq('id', roomId)
        .single()

      if (room) {
        const otherUserId = room.user1_id === myId ? room.user2_id : room.user1_id
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: otherUserId,
            title: 'GLH. 新しいメッセージ',
            body: imageUrl ? '📷 画像が届きました' : fileUrl ? '📄 ファイルが届きました' : content.length > 30 ? content.slice(0, 30) + '...' : content,
            url: `/chat/${roomId}`,
          }),
        })
      }
    } catch (e) {}

    setSending(false)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--off)' }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '52px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <FriendAvatar
          avatarUrl={otherProfile?.avatar_url ?? null}
          nickname={otherProfile?.nickname ?? ''}
          isFriend={isFriend}
          size={38}
          bg="#E8F0F8"
          textColor="#3a6aaa"
          onClick={() => otherProfile && router.push(`/user/${otherProfile.user_id}`)}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{otherProfile?.nickname ?? 'チャット'}</div>

        </div>
      </div>

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <SectionLoading />}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: 12, color: "var(--mute)" }}>{Icons.chat(32, "var(--mute)")}</div>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>最初のメッセージを送りましょう！</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>{otherProfile?.nickname ?? '相手'}さんとのチャットが始まります</div>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === myId
          const isTemp = m.id.startsWith('temp-')
          const time = new Date(m.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          const rxns = messageReactions[m.id] ?? {}
          const myEmoji = Object.entries(rxns).find(([, ids]) => ids.includes(myId))?.[0] ?? null
          return (
            <div key={m.id} style={{ maxWidth: '76%', alignSelf: isMe ? 'flex-end' : 'flex-start', opacity: isTemp ? 0.7 : 1 }}>
              {!isMe && <div style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 3 }}>{otherProfile?.nickname}</div>}
              <div
                onContextMenu={(e) => { e.preventDefault(); if (!isTemp) setPaletteMessageId(m.id) }}
                onTouchStart={() => { if (!isTemp) startPress(m.id) }}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                style={{ padding: m.image_url || m.file_url ? '6px' : '10px 13px', borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isMe ? 'var(--g1)' : 'white', color: isMe ? 'white' : 'var(--txt)', fontSize: 13, lineHeight: 1.5, border: !isMe ? '1px solid var(--line)' : 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {m.image_url && (
                  <img src={m.image_url} alt="画像" style={{ width: '100%', maxWidth: 200, borderRadius: 8, display: 'block' }} />
                )}
                {m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: isMe ? 'var(--lime)' : 'var(--g2)', textDecoration: 'none', padding: '4px 6px' }}>
                    <span>📄</span>
                    <span style={{ fontSize: 12 }}>{m.file_name ?? 'ファイル'}</span>
                  </a>
                )}
                {m.content && <div style={{ padding: m.image_url || m.file_url ? '4px 4px 0' : '0' }}>{m.content}</div>}
              </div>
              <ReactionBar reactions={rxns} myId={myId} onToggle={(emoji) => toggleMessageReaction(m.id, emoji)} />
              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                {isTemp ? '送信中...' : time}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* リアクションパレット（メッセージ長押し） */}
      {paletteMessageId && (
        <div style={{ position: 'fixed', bottom: '38%', left: '50%', transform: 'translateX(-50%)', zIndex: 350 }}>
          <ReactionPalette
            myEmoji={Object.entries(messageReactions[paletteMessageId] ?? {}).find(([, ids]) => ids.includes(myId))?.[0] ?? null}
            onSelect={(emoji) => toggleMessageReaction(paletteMessageId, emoji)}
            onClose={() => setPaletteMessageId(null)}
          />
        </div>
      )}

      {/* プレビュー */}
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
      <div style={{ padding: '10px 16px 34px', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {/* 画像ボタン */}
        <button onClick={() => imageRef.current?.click()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}>{Icons.camera(16, 'var(--mid)')}</button>
        {/* ファイルボタン */}
        <button onClick={() => fileRef.current?.click()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMsg()}
          placeholder="メッセージを入力..."
          style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--txt)', outline: 'none' }}
        />
        <button onClick={sendMsg} disabled={sending} style={{ width: 38, height: 38, borderRadius: '50%', background: sending ? 'var(--mute)' : 'var(--g1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>

        <input ref={imageRef} type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setSelectedImage(file)
          setImagePreview(URL.createObjectURL(file))
        }} style={{ display: 'none' }} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setSelectedFile(file)
        }} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
