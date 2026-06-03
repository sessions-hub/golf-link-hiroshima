'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'ホーム',
    path: '/home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" width={22} height={22}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    key: 'match',
    label: 'フレンド',
    path: '/match',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" width={22} height={22}>
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
        <path d="M21 21v-2a4 4 0 00-3-3.87"/>
      </svg>
    ),
  },
  {
    key: 'chat',
    label: 'チャット',
    path: '/chat',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" width={22} height={22}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    key: 'course',
    label: '募集・予約',
    path: '/course',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" width={22} height={22}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'マイページ',
    path: '/profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" width={22} height={22}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  // 全ナビルートをマウント時にプリフェッチ
  useEffect(() => {
    NAV_ITEMS.forEach(item => router.prefetch(item.path))
  }, [])

  // 遷移完了後に楽観的状態をリセット
  useEffect(() => {
    setActiveKey(null)
  }, [pathname])

  const handleNav = (key: string, path: string) => {
    if (pathname.startsWith(path)) return
    setActiveKey(key)
    router.push(path)
  }

  useEffect(() => {
    const fetchUnread = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // DM unread
      const { data } = await supabase
        .from('chat_rooms')
        .select('user1_id, unread_count_user1, unread_count_user2')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      let dmUnread = 0
      if (data) {
        dmUnread = data.reduce((sum, room) => sum + (room.user1_id === user.id ? room.unread_count_user1 : room.unread_count_user2), 0)
      }

      // グループ unread
      const [{ data: orgComps }, { data: entries }, { data: memberships }] = await Promise.all([
        supabase.from('competitions').select('id').eq('organizer_id', user.id),
        supabase.from('comp_entries').select('comp_id').eq('user_id', user.id),
        supabase.from('friend_group_members').select('group_id').eq('user_id', user.id),
      ])
      const compIds = [...new Set([...(orgComps?.map(c => c.id) ?? []), ...(entries?.map(e => e.comp_id) ?? [])])]
      const groupIds = memberships?.map(m => m.group_id) ?? []

      const [compCounts, friendCounts] = await Promise.all([
        Promise.all(compIds.map(async (compId) => {
          const lastSeen = localStorage.getItem(`comp_chat_last_seen_${compId}`) ?? '2000-01-01T00:00:00Z'
          const { count } = await supabase.from('comp_group_messages').select('*', { count: 'exact', head: true }).eq('comp_id', compId).gt('created_at', lastSeen).neq('user_id', user.id)
          return count ?? 0
        })),
        Promise.all(groupIds.map(async (groupId) => {
          const lastSeen = localStorage.getItem(`friend_group_last_seen_${groupId}`) ?? '2000-01-01T00:00:00Z'
          const { count } = await supabase.from('friend_group_messages').select('*', { count: 'exact', head: true }).eq('group_id', groupId).gt('created_at', lastSeen).neq('user_id', user.id)
          return count ?? 0
        })),
      ])
      const groupUnread = [...compCounts, ...friendCounts].reduce((a, b) => a + b, 0)
      setUnreadCount(dmUnread + groupUnread)
    }
    fetchUnread()

    const fetchUnreadNotif = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('post_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifCount(count ?? 0)
    }
    fetchUnreadNotif()
  }, [pathname])

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.97)',
      borderTop: '1px solid var(--line)',
      display: 'flex', padding: '8px 0 calc(env(safe-area-inset-bottom) + 12px)', zIndex: 50,
      boxShadow: '0 -2px 16px rgba(13,61,43,.07)',
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey ? activeKey === item.key : pathname.startsWith(item.path)
        return (
          <button
            key={item.key}
            onPointerDown={() => handleNav(item.key, item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? 'var(--g2)' : 'var(--mute)',
              opacity: isActive ? 1 : 0.45, transition: 'opacity 0.1s',
              position: 'relative',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            {item.icon(isActive)}
            {/* チャット未読バッジ */}
            {item.key === 'chat' && unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: '20%',
                width: 16, height: 16, borderRadius: '50%',
                background: '#e05070', color: 'white',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid white',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            {/* マイページ通知赤ぽっち */}
            {item.key === 'profile' && unreadNotifCount > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: '20%',
                width: 8, height: 8, borderRadius: '50%',
                background: '#e05070', border: '1.5px solid white',
              }} />
            )}
            <span style={{
              fontSize: 'calc(9px * var(--font-scale, 1))', fontWeight: isActive ? 600 : 400,
              fontFamily: 'Inter, sans-serif',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
