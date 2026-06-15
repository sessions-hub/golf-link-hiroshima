'use client'
import { FriendAvatar } from '@/components/FriendAvatar'
import GenderBadge from '@/components/GenderBadge'
import { SectionLoading } from '@/components/LoadingDots'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChatNoticeItem {
  kind: 'chat'
  id: string
  name: string
  chatType: 'dm' | 'comp' | 'friend'
  lastMessage: string | null
  sortAt: string | null
  unread: number
  otherUser?: { user_id: string; nickname: string; avatar_url: string | null; avatar_character_id?: string | null; gender: string | null }
  isFriend?: boolean
  memberProfiles?: Array<{ user_id: string; nickname: string; avatar_url: string | null }>
}

interface CompNoticeItem {
  kind: 'competition'
  id: string
  title: string
  compDate: string
  type: string
  sortAt: string
}

type NoticeItem = ChatNoticeItem | CompNoticeItem

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<NoticeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString()

      const [{ data: chatRooms }, { data: myFavs }, { data: favMe }] = await Promise.all([
        supabase.from('chat_rooms').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).order('last_message_at', { ascending: false }),
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
      ])

      const allItems: NoticeItem[] = []
      const favMeSet = new Set(favMe?.map((f: any) => f.user_id) ?? [])
      const friendSet = new Set(myFavs?.filter((f: any) => favMeSet.has(f.target_id)).map((f: any) => f.target_id) ?? [])

      // 未読DMチャット
      if (chatRooms) {
        const unreadRooms = chatRooms.filter(room => {
          const unread = room.user1_id === user.id ? room.unread_count_user1 : room.unread_count_user2
          return (unread ?? 0) > 0
        })
        const dmItems = await Promise.all(unreadRooms.map(async (room) => {
          const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
          const { data: prof } = await supabase.from('profiles').select('user_id, nickname, avatar_url, avatar_character_id, gender').eq('user_id', otherUserId).single()
          const otherUser = prof ?? { user_id: otherUserId, nickname: '不明', avatar_url: null, gender: null }
          const unread = room.user1_id === user.id ? room.unread_count_user1 : room.unread_count_user2
          return {
            kind: 'chat' as const,
            id: room.id,
            name: otherUser.nickname,
            chatType: 'dm' as const,
            lastMessage: room.last_message,
            sortAt: room.last_message_at,
            unread: unread ?? 0,
            otherUser,
            isFriend: friendSet.has(otherUserId),
          }
        }))
        allItems.push(...dmItems)
      }

      // コンペグループチャット（未読のみ）
      const [{ data: orgComps }, { data: entries }, { data: memberships }] = await Promise.all([
        supabase.from('competitions').select('id, title').eq('organizer_id', user.id),
        supabase.from('comp_entries').select('comp_id').eq('user_id', user.id),
        supabase.from('friend_group_members').select('group_id').eq('user_id', user.id),
      ])

      const compMap = new Map<string, string>()
      orgComps?.forEach(c => compMap.set(c.id, c.title))
      if (entries && entries.length > 0) {
        const newIds = entries.map((e: any) => e.comp_id).filter((id: string) => !compMap.has(id))
        if (newIds.length > 0) {
          const { data: ec } = await supabase.from('competitions').select('id, title').in('id', newIds)
          ec?.forEach(c => compMap.set(c.id, c.title))
        }
      }

      const compGroupItems = await Promise.all(Array.from(compMap.entries()).map(async ([compId, name]) => {
        const { data: lastMsg } = await supabase.from('comp_group_messages').select('content, image_url, created_at').eq('comp_id', compId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        const lastSeen = typeof window !== 'undefined' ? (localStorage.getItem(`comp_chat_last_seen_${compId}`) ?? '2000-01-01T00:00:00Z') : '2000-01-01T00:00:00Z'
        let unread = 0
        if (lastMsg && new Date(lastMsg.created_at) > new Date(lastSeen)) {
          const { count } = await supabase.from('comp_group_messages').select('*', { count: 'exact', head: true }).eq('comp_id', compId).gt('created_at', lastSeen).neq('user_id', user.id)
          unread = count ?? 0
        }
        if (unread === 0) return null
        return {
          kind: 'chat' as const,
          id: compId,
          name,
          chatType: 'comp' as const,
          lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null,
          sortAt: lastMsg?.created_at ?? null,
          unread,
        }
      }))
      allItems.push(...(compGroupItems.filter(x => x !== null) as ChatNoticeItem[]))

      // フレンドグループチャット（未読のみ）
      const groupIds = memberships?.map((m: any) => m.group_id) ?? []
      if (groupIds.length > 0) {
        const { data: friendGroups } = await supabase.from('friend_groups').select('id, name').in('id', groupIds)
        const friendGroupItems = await Promise.all((friendGroups ?? []).map(async (g: any) => {
          const [{ data: lastMsg }, { data: memberRows }] = await Promise.all([
            supabase.from('friend_group_messages').select('content, image_url, created_at').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('friend_group_members').select('user_id').eq('group_id', g.id).neq('user_id', user.id).limit(3),
          ])
          const lastSeen = typeof window !== 'undefined' ? (localStorage.getItem(`friend_group_last_seen_${g.id}`) ?? '2000-01-01T00:00:00Z') : '2000-01-01T00:00:00Z'
          let unread = 0
          if (lastMsg && new Date(lastMsg.created_at) > new Date(lastSeen)) {
            const { count } = await supabase.from('friend_group_messages').select('*', { count: 'exact', head: true }).eq('group_id', g.id).gt('created_at', lastSeen).neq('user_id', user.id)
            unread = count ?? 0
          }
          if (unread === 0) return null
          let memberProfiles: Array<{ user_id: string; nickname: string; avatar_url: string | null }> = []
          if (memberRows && memberRows.length > 0) {
            const { data: pData } = await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', (memberRows as any[]).map(m => m.user_id))
            memberProfiles = pData ?? []
          }
          return {
            kind: 'chat' as const,
            id: g.id,
            name: g.name,
            chatType: 'friend' as const,
            lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null,
            sortAt: lastMsg?.created_at ?? null,
            unread,
            memberProfiles,
          }
        }))
        allItems.push(...(friendGroupItems.filter(x => x !== null) as ChatNoticeItem[]))
      }

      // 直近7日のコンペ・ラウンド募集
      const { data: compData } = await supabase
        .from('competitions')
        .select('id, title, comp_date, type, created_at')
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false })
      if (compData) {
        const compItems: CompNoticeItem[] = (compData as any[]).map(c => ({
          kind: 'competition' as const,
          id: c.id,
          title: c.title,
          compDate: c.comp_date,
          type: c.type,
          sortAt: c.created_at,
        }))
        allItems.push(...compItems)
      }

      allItems.sort((a, b) => {
        if (!a.sortAt && !b.sortAt) return 0
        if (!a.sortAt) return 1
        if (!b.sortAt) return -1
        return new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
      })

      setItems(allItems)
      setLoading(false)
    }
    fetchData()
  }, [])

  const renderCard = (item: NoticeItem) => {
    if (item.kind === 'chat') {
      const href = item.chatType === 'dm' ? `/chat/${item.id}` : item.chatType === 'comp' ? `/comp/${item.id}/chat` : `/chat/group/${item.id}`
      const time = item.sortAt ? new Date(item.sortAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) : ''
      return (
        <div key={`chat-${item.chatType}-${item.id}`} onClick={() => router.push(href)} style={{ margin: '0 16px 8px', background: 'white', borderRadius: 12, border: `1px solid ${item.unread > 0 ? 'rgba(224,80,112,.25)' : 'var(--line)'}`, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {item.chatType === 'dm' && item.otherUser ? (
              <FriendAvatar avatarUrl={item.otherUser.avatar_url} nickname={item.otherUser.nickname} gender={item.otherUser.gender} characterId={item.otherUser.avatar_character_id} isFriend={item.isFriend ?? false} size={42} border="1px solid var(--line)" />
            ) : item.chatType === 'comp' ? (
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, var(--g1), var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" width={20} height={20}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--surf)', border: '1px solid var(--line)', position: 'relative' }}>
                {(item.memberProfiles ?? []).slice(0, 2).map((p, i) => (
                  <div key={p.user_id} style={{ position: 'absolute', width: 22, height: 22, borderRadius: '50%', background: 'var(--surf)', border: '1.5px solid white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--g1)', left: i === 0 ? 2 : undefined, right: i === 1 ? 2 : undefined, top: i === 0 ? 2 : undefined, bottom: i === 1 ? 2 : undefined }}>
                    {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : p.nickname?.[0]}
                  </div>
                ))}
                {(item.memberProfiles ?? []).length === 0 && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👥</div>}
              </div>
            )}
            {item.unread > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', border: '2px solid white' }}>
                {item.unread > 9 ? '9+' : item.unread}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: item.unread > 0 ? 700 : 600, color: 'var(--txt)', overflow: 'hidden', maxWidth: 160 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                {item.chatType === 'dm' && <GenderBadge gender={item.otherUser?.gender} size={12} />}
              </div>
              <div style={{ fontSize: 10, color: 'var(--mute)', flexShrink: 0 }}>{time}</div>
            </div>
            <div style={{ fontSize: 12, color: item.unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: item.unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.lastMessage ?? 'チャットを始めましょう'}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
        </div>
      )
    }

    const isRound = item.type === 'round'
    const iconBg = isRound ? '#dcfce7' : '#fef3c7'
    const iconFill = isRound ? '#16a34a' : '#f59e0b'
    const dateLabel = item.compDate ? new Date(item.compDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''
    const typeLabel = isRound ? 'ラウンド募集' : 'コンペ'
    return (
      <div key={`comp-${item.id}`} onClick={() => router.push(`/course/${item.id}`)} style={{ margin: '0 16px 8px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isRound ? (
            <svg viewBox="0 0 24 24" fill={iconFill} width={22} height={22}>
              <path d="M17 3.34L11 6.19V21h-1v-7.84l-6-2.86V5.66l6 2.85V3h1v.19L17 .65v2.69zM6.6 12.34l3.4 1.62V8.96L6.6 7.34v5zm7.8-5l-3.4-1.62v5l3.4 1.62v-5z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill={iconFill} width={22} height={22}>
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-2 3c0 1.65-1.35 3-3 3s-3-1.35-3-3V5h6v3zM5 8V7h2v3c0 .35.03.69.08 1.03C5.87 10.7 5 9.45 5 8zm14 0c0 1.45-.87 2.7-2.08 3.03.05-.34.08-.68.08-1.03V7h2v1z"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.title}</div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>{typeLabel} · {dateLabel}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g2)', padding: '4px', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>新着情報</div>
      </div>

      <div style={{ flex: 1, paddingTop: 10 }}>
        {loading && <SectionLoading />}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 6 }}>新着情報はありません</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>未読チャットや直近7日以内のコンペ・ラウンド募集がここに表示されます</div>
          </div>
        )}
        {!loading && items.map(renderCard)}
      </div>

    </div>
  )
}
