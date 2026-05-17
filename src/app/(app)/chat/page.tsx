'use client'
import { Icons } from '@/components/icons'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  last_message: string | null
  last_message_at: string
  unread_count_user1: number
  unread_count_user2: number
  other_user: {
    user_id: string
    nickname: string
    avatar_url: string | null
  }
}

export default function ChatListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (data) {
        const roomsWithProfiles = await Promise.all(data.map(async (room) => {
          const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url')
            .eq('user_id', otherUserId)
            .single()
          return {
            ...room,
            other_user: profile ?? { user_id: otherUserId, nickname: '不明', avatar_url: null }
          }
        }))
        // 最新メッセージ順にソート（nullは最後）
        roomsWithProfiles.sort((a: any, b: any) => {
          if (!a.last_message_at && !b.last_message_at) return 0
          if (!a.last_message_at) return 1
          if (!b.last_message_at) return -1
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        })
        setRooms(roomsWithProfiles)
      }
      setLoading(false)
    }
    init()
  }, [])

  const getUnreadCount = (room: ChatRoom) => {
    if (!myId) return 0
    return room.user1_id === myId ? room.unread_count_user1 : room.unread_count_user2
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const todayStr = now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const datStr = date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    if (todayStr === datStr) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
    }
    if (diffDays === 1) return '昨日'
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' })
  }

  const totalUnread = rooms.reduce((sum, room) => sum + getUnreadCount(room), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo />
        {totalUnread > 0 && (
          <div style={{ background: '#e05070', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
            {totalUnread}件の未読
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

        {!loading && rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: 16, color: "var(--mute)" }}>{Icons.chat(48, "var(--mute)")}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)', marginBottom: 8 }}>チャットがまだありません</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 24 }}>フレンドと<br/>チャットを始めましょう</div>
            <button onClick={() => router.push('/match')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>マッチングを探す</button>
          </div>
        )}

        {rooms.map((room) => {
          const unread = getUnreadCount(room)
          return (
            <div
              key={room.id}
              onClick={() => router.push(`/chat/${room.id}`)}
              style={{ background: unread > 0 ? '#fffbf5' : 'white', borderBottom: '1px solid var(--line)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', position: 'relative', borderLeft: unread > 0 ? '3px solid #e05070' : '3px solid transparent' }}
            >
              {/* アバター */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--g1)', overflow: 'hidden' }}>
                  {room.other_user.avatar_url
                    ? <img src={room.other_user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : room.other_user.nickname?.[0] ?? '?'
                  }
                </div>
                {unread > 0 && (
                  <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', border: '2px solid white', padding: '0 4px' }}>
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              </div>

              {/* テキスト */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: 'var(--txt)' }}>
                    {room.other_user.nickname}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', flexShrink: 0 }}>
                    {formatTime(room.last_message_at)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.last_message ?? 'チャットを始めましょう'}
                </div>
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
