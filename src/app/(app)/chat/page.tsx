'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, type Plan } from '@/lib/plan'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { FriendAvatar } from '@/components/FriendAvatar'
import GenderBadge from '@/components/GenderBadge'

const getPlanBadge = (plan: Plan) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  last_message: string | null
  last_message_at: string
  unread_count_user1: number
  unread_count_user2: number
  other_user: { user_id: string; nickname: string; avatar_url: string | null; gender: string | null }
}

interface Profile { user_id: string; nickname: string; avatar_url: string | null; gender?: string | null }

type GroupItem =
  | { type: 'comp'; id: string; name: string; lastMessage: string | null; lastMessageAt: string | null; unread: number }
  | { type: 'friend'; id: string; name: string; lastMessage: string | null; lastMessageAt: string | null; unread: number; memberProfiles: Profile[] }

const MiniAvatar = ({ p, size, style }: { p: Profile; size: number; style?: React.CSSProperties }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surf)', border: '1.5px solid white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.36), fontWeight: 700, color: 'var(--g1)', ...style }}>
    {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : p.nickname?.[0] ?? '?'}
  </div>
)

const CompGroupIcon = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--g1), var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" width={22} height={22}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  </div>
)

const FriendGroupIcon = ({ profiles }: { profiles: Profile[] }) => {
  const ps = profiles.slice(0, 3)
  if (ps.length === 0) return (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👥</div>
  )
  return (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surf)', border: '1px solid var(--line)', position: 'relative', flexShrink: 0 }}>
      {ps.length === 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MiniAvatar p={ps[0]} size={36} />
        </div>
      )}
      {ps.length === 2 && (
        <>
          <MiniAvatar p={ps[0]} size={26} style={{ position: 'absolute', left: 4, top: 4 }} />
          <MiniAvatar p={ps[1]} size={26} style={{ position: 'absolute', right: 4, bottom: 4 }} />
        </>
      )}
      {ps.length >= 3 && (
        <>
          <MiniAvatar p={ps[0]} size={22} style={{ position: 'absolute', left: 3, top: 3 }} />
          <MiniAvatar p={ps[1]} size={22} style={{ position: 'absolute', right: 3, top: 3 }} />
          <MiniAvatar p={ps[2]} size={22} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 3 }} />
        </>
      )}
    </div>
  )
}

export default function ChatListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm')
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  // グループタブ
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupsLoaded, setGroupsLoaded] = useState(false)

  // グループ作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalGroupName, setModalGroupName] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set())
  const [modalFriends, setModalFriends] = useState<Profile[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'group') setActiveTab('group')
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const [plan, { data }, { data: myFavs }, { data: favMe }] = await Promise.all([
        getUserPlan(),
        supabase.from('chat_rooms').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).order('last_message_at', { ascending: false }),
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
      ])
      if (myFavs && favMe) {
        const favMeSet = new Set(favMe.map(f => f.user_id))
        setFriendIds(new Set(myFavs.filter(f => favMeSet.has(f.target_id)).map(f => f.target_id)))
      }
      setUserPlan(plan)

      if (data) {
        const roomsWithProfiles = await Promise.all(data.map(async (room) => {
          const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
          const { data: profile } = await supabase.from('profiles').select('user_id, nickname, avatar_url, gender').eq('user_id', otherUserId).single()
          return { ...room, other_user: profile ?? { user_id: otherUserId, nickname: '不明', avatar_url: null, gender: null } }
        }))
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

  const loadGroups = async (userId: string) => {
    if (groupsLoaded) return
    setGroupLoading(true)

    // コンペグループ取得
    const [{ data: orgComps }, { data: entries }] = await Promise.all([
      supabase.from('competitions').select('id, title').eq('organizer_id', userId),
      supabase.from('comp_entries').select('comp_id').eq('user_id', userId),
    ])
    const compMap = new Map<string, string>()
    orgComps?.forEach(c => compMap.set(c.id, c.title))
    if (entries && entries.length > 0) {
      const enteredIds = entries.map(e => e.comp_id).filter(id => !compMap.has(id))
      if (enteredIds.length > 0) {
        const { data: enteredComps } = await supabase.from('competitions').select('id, title').in('id', enteredIds)
        enteredComps?.forEach(c => compMap.set(c.id, c.title))
      }
    }

    // フレンドグループ取得
    const { data: memberships } = await supabase
      .from('friend_group_members')
      .select('group_id')
      .eq('user_id', userId)
    const groupIds = memberships?.map(m => m.group_id) ?? []
    let friendGroupMap = new Map<string, string>()
    if (groupIds.length > 0) {
      const { data: friendGroups } = await supabase.from('friend_groups').select('id, name').in('id', groupIds)
      friendGroups?.forEach(g => friendGroupMap.set(g.id, g.name))
    }

    // 最終メッセージ + 未読を並列取得
    const compPromises = Array.from(compMap.entries()).map(async ([compId, name]) => {
      const { data: lastMsg } = await supabase
        .from('comp_group_messages')
        .select('content, image_url, created_at')
        .eq('comp_id', compId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastSeen = localStorage.getItem(`comp_chat_last_seen_${compId}`) ?? '2000-01-01T00:00:00Z'
      let unread = 0
      if (lastMsg && new Date(lastMsg.created_at) > new Date(lastSeen)) {
        const { count } = await supabase
          .from('comp_group_messages')
          .select('*', { count: 'exact', head: true })
          .eq('comp_id', compId)
          .gt('created_at', lastSeen)
          .neq('user_id', userId)
        unread = count ?? 0
      }
      return {
        type: 'comp' as const, id: compId, name,
        lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null,
        lastMessageAt: lastMsg?.created_at ?? null,
        unread,
      }
    })

    const friendPromises = Array.from(friendGroupMap.entries()).map(async ([groupId, name]) => {
      const [{ data: lastMsg }, { data: memberRows }] = await Promise.all([
        supabase.from('friend_group_messages').select('content, image_url, created_at').eq('group_id', groupId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('friend_group_members').select('user_id').eq('group_id', groupId).neq('user_id', userId).limit(3),
      ])
      const lastSeen = localStorage.getItem(`friend_group_last_seen_${groupId}`) ?? '2000-01-01T00:00:00Z'
      let unread = 0
      if (lastMsg && new Date(lastMsg.created_at) > new Date(lastSeen)) {
        const { count } = await supabase
          .from('friend_group_messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .gt('created_at', lastSeen)
          .neq('user_id', userId)
        unread = count ?? 0
      }
      let memberProfiles: Profile[] = []
      if (memberRows && memberRows.length > 0) {
        const { data: pData } = await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', memberRows.map(m => m.user_id))
        memberProfiles = pData ?? []
      }
      return {
        type: 'friend' as const, id: groupId, name,
        lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null,
        lastMessageAt: lastMsg?.created_at ?? null,
        unread, memberProfiles,
      }
    })

    const [compItems, friendItems] = await Promise.all([Promise.all(compPromises), Promise.all(friendPromises)])
    const all = [...compItems, ...friendItems].sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0
      if (!a.lastMessageAt) return 1
      if (!b.lastMessageAt) return -1
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })
    setGroups(all)
    setGroupsLoaded(true)
    setGroupLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'group' && myId && !groupsLoaded) loadGroups(myId)
  }, [activeTab, myId])

  const loadModalFriends = async () => {
    if (modalFriends.length > 0) return
    const [{ data: myFavs }, { data: favMe }] = await Promise.all([
      supabase.from('favorites').select('target_id').eq('user_id', myId),
      supabase.from('favorites').select('user_id').eq('target_id', myId),
    ])
    if (!myFavs || !favMe) return
    const favMeSet = new Set(favMe.map(f => f.user_id))
    const mutualIds = myFavs.filter(f => favMeSet.has(f.target_id)).map(f => f.target_id)
    if (mutualIds.length === 0) return
    const { data: pData } = await supabase.from('profiles').select('user_id, nickname, avatar_url, gender').in('user_id', mutualIds)
    setModalFriends(pData ?? [])
  }

  const openCreateModal = () => {
    setShowCreateModal(true)
    setModalGroupName('')
    setSelectedFriendIds(new Set())
    loadModalFriends()
  }

  const createGroup = async () => {
    if (!modalGroupName.trim() || selectedFriendIds.size === 0 || creating || !myId) return
    setCreating(true)
    const { data: newGroup, error: groupError } = await supabase
      .from('friend_groups')
      .insert({ name: modalGroupName.trim(), created_by: myId })
      .select().single()
    if (groupError || !newGroup) {
      console.error('friend_groups insert error:', groupError)
      alert('グループの作成に失敗しました。しばらくしてから再試行してください。')
      setCreating(false)
      return
    }

    // 自分を先に登録してから友達を追加（RLSポリシーの評価順序対策）
    const { error: selfError } = await supabase.from('friend_group_members').insert(
      { group_id: newGroup.id, user_id: myId }
    )
    if (selfError) {
      console.error('friend_group_members self insert error:', selfError)
      alert('メンバーの追加に失敗しました。しばらくしてから再試行してください。')
      setCreating(false)
      return
    }
    if (selectedFriendIds.size > 0) {
      const { error: friendError } = await supabase.from('friend_group_members').insert(
        Array.from(selectedFriendIds).map(uid => ({ group_id: newGroup.id, user_id: uid }))
      )
      if (friendError) {
        console.error('friend_group_members friends insert error:', friendError)
        alert('フレンドの追加に失敗しました。しばらくしてから再試行してください。')
        setCreating(false)
        return
      }
    }
    setCreating(false)
    setShowCreateModal(false)
    setGroupsLoaded(false)
    router.push(`/chat/group/${newGroup.id}`)
  }

  const getUnreadCount = (room: ChatRoom) => {
    if (!myId) return 0
    return room.user1_id === myId ? room.unread_count_user1 : room.unread_count_user2
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const todayStr = now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const datStr = date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (todayStr === datStr) return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
    if (diffDays === 1) return '昨日'
    if (diffDays < 7) return `${diffDays}日前`
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' })
  }

  const dmUnread = rooms.reduce((sum, room) => sum + getUnreadCount(room), 0)
  const groupUnread = groups.reduce((sum, g) => sum + g.unread, 0)
  const totalUnread = dmUnread + groupUnread

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalUnread > 0 && (
            <div style={{ background: '#e05070', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{totalUnread}件の未読</div>
          )}
          {(() => { const b = getPlanBadge(userPlan); return <span style={{ background: b.bg, color: b.color, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>{b.label}</span> })()}
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--line)' }}>
        {(['dm', 'group'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'dm' ? '個人' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                グループ
                {groupUnread > 0 && <span style={{ background: '#e05070', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{groupUnread}</span>}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      <div style={{ paddingBottom: 90 }}>

        {/* 個人タブ */}
        {activeTab === 'dm' && (
          <>
            {loading && <SectionLoading />}
            {!loading && rooms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ marginBottom: 16, color: 'var(--mute)' }}>{Icons.chat(48, 'var(--mute)')}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)', marginBottom: 8 }}>チャットがまだありません</div>
                <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 24 }}>フレンドと<br/>チャットを始めましょう</div>
                <button onClick={() => router.push('/match')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>マッチングを探す</button>
              </div>
            )}
            {rooms.map((room) => {
              const unread = getUnreadCount(room)
              return (
                <div key={room.id} onClick={() => router.push(`/chat/${room.id}`)} style={{ background: unread > 0 ? '#fffbf5' : 'white', borderBottom: '1px solid var(--line)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', position: 'relative', borderLeft: unread > 0 ? '3px solid #e05070' : '3px solid transparent' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); router.push(`/user/${room.other_user.user_id}`) }}>
                    <FriendAvatar avatarUrl={room.other_user.avatar_url} nickname={room.other_user.nickname} isFriend={friendIds.has(room.other_user.user_id)} size={52} border="1px solid var(--line)" />
                    {unread > 0 && (
                      <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', border: '2px solid white', padding: '0 4px' }}>{unread > 99 ? '99+' : unread}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: 'var(--txt)' }}>{room.other_user.nickname}<GenderBadge gender={room.other_user.gender} size={13} /></div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', flexShrink: 0 }}>{formatTime(room.last_message_at)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.last_message ?? 'チャットを始めましょう'}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                </div>
              )
            })}
          </>
        )}

        {/* グループタブ */}
        {activeTab === 'group' && (
          <>
            {/* "+ グループ" ボタン */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', background: 'white', borderBottom: '1px solid var(--line)' }}>
              <button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" width={14} height={14}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                グループ
              </button>
            </div>

            {groupLoading && <SectionLoading />}

            {!groupLoading && groups.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)', marginBottom: 8 }}>グループがまだありません</div>
                <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 24 }}>フレンドとグループを<br/>作成しましょう</div>
                <button onClick={openCreateModal} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ グループを作成</button>
              </div>
            )}

            {groups.map((g) => (
              <div key={`${g.type}-${g.id}`}
                onClick={() => g.type === 'comp' ? router.push(`/comp/${g.id}/chat`) : router.push(`/chat/group/${g.id}`)}
                style={{ background: g.unread > 0 ? '#fffbf5' : 'white', borderBottom: '1px solid var(--line)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', borderLeft: g.unread > 0 ? '3px solid #e05070' : '3px solid transparent' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {g.type === 'comp' ? <CompGroupIcon /> : <FriendGroupIcon profiles={g.memberProfiles} />}
                  {g.unread > 0 && (
                    <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', border: '2px solid white', padding: '0 3px' }}>{g.unread > 99 ? '99+' : g.unread}</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: g.unread > 0 ? 700 : 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{g.name}</div>
                      {g.type === 'comp' && <span style={{ fontSize: 9, background: 'var(--g1)', color: 'white', padding: '1px 5px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>コンペ</span>}
                    </div>
                    {g.lastMessageAt && <div style={{ fontSize: 11, color: 'var(--mute)', flexShrink: 0 }}>{formatTime(g.lastMessageAt)}</div>}
                  </div>
                  <div style={{ fontSize: 13, color: g.unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: g.unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.lastMessage ?? 'チャットを始めましょう'}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />

      {/* グループ作成モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* モーダルヘッダー */}
            <div style={{ padding: '18px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>グループを作成</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)', lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* グループ名 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 6, fontWeight: 600 }}>グループ名</div>
                <input
                  value={modalGroupName}
                  onChange={e => setModalGroupName(e.target.value)}
                  placeholder="グループ名を入力"
                  maxLength={30}
                  style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* 選択済みメンバーチップ */}
              {selectedFriendIds.size > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 6, fontWeight: 600 }}>選択中のメンバー</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {Array.from(selectedFriendIds).map(uid => {
                      const p = modalFriends.find(f => f.user_id === uid)
                      if (!p) return null
                      return (
                        <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--g1)', borderRadius: 20, padding: '4px 10px 4px 6px', flexShrink: 0 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                            {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : p.nickname[0]}
                          </div>
                          <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>{p.nickname}</span>
                          <button onClick={() => setSelectedFriendIds(prev => { const n = new Set(prev); n.delete(uid); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* フレンド一覧 */}
              <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 8, fontWeight: 600 }}>フレンドを選択</div>
              {modalFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)', fontSize: 13 }}>フレンドがいません</div>
              ) : (
                modalFriends.map(f => {
                  const isSelected = selectedFriendIds.has(f.user_id)
                  return (
                    <div key={f.user_id} onClick={() => {
                      setSelectedFriendIds(prev => {
                        const n = new Set(prev)
                        if (n.has(f.user_id)) n.delete(f.user_id); else n.add(f.user_id)
                        return n
                      })
                    }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--g1)', flexShrink: 0 }}>
                        {f.avatar_url ? <img src={f.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : f.nickname[0]}
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--txt)', fontWeight: 500 }}>{f.nickname}<GenderBadge gender={f.gender} size={13} /></div>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--g1)' : 'var(--line)'}`, background: isSelected ? 'var(--g1)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* 作成ボタン */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
              <button
                onClick={createGroup}
                disabled={creating || !modalGroupName.trim() || selectedFriendIds.size === 0}
                style={{ width: '100%', background: creating || !modalGroupName.trim() || selectedFriendIds.size === 0 ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: creating || !modalGroupName.trim() || selectedFriendIds.size === 0 ? 'not-allowed' : 'pointer' }}
              >
                {creating ? '作成中...' : `グループを作成する（${selectedFriendIds.size + 1}名）`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
