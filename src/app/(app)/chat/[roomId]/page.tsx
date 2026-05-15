'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
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
  const bottomRef = useRef<HTMLDivElement>(null)

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .eq('user_id', otherUserId)
        .single()
      if (profile) setOtherProfile(profile)

      // メッセージ取得
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (msgs) {
        setMessages(msgs)
        // 読み込み後に一番下にスクロール
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 100)
      }

      setLoading(false)

      // リアルタイム購読
      const channel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [roomId])

  // 新メッセージで自動スクロール
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMsg = async () => {
    if (!input.trim() || !myId) return
    const content = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: myId,
      content,
    })

    // 相手にプッシュ通知を送信
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
          body: content.length > 30 ? content.slice(0, 30) + '...' : content,
          url: `/chat/${roomId}`,
        }),
      })
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--off)' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8F0F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#3a6aaa' }}>
          {otherProfile?.nickname?.[0] ?? '?'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{otherProfile?.nickname ?? 'チャット'}</div>
          <div style={{ fontSize: 10, color: 'var(--lime)', marginTop: 1 }}>● オンライン</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--mute)', fontSize: 13, marginTop: 40 }}>読み込み中...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>最初のメッセージを送りましょう！</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>{otherProfile?.nickname ?? '相手'}さんとのチャットが始まります</div>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === myId
          const time = new Date(m.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id} style={{ maxWidth: '76%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <div style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 3 }}>{otherProfile?.nickname}</div>
              )}
              <div style={{ padding: '10px 13px', borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isMe ? 'var(--g1)' : 'white', color: isMe ? 'white' : 'var(--txt)', fontSize: 13, lineHeight: 1.5, border: !isMe ? '1px solid var(--line)' : 'none' }}>
                {m.content}
              </div>
              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{time}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px 34px', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          placeholder="メッセージを入力..."
          style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--txt)', outline: 'none' }}
        />
        <button onClick={sendMsg} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--g1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
