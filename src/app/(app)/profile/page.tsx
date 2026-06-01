'use client'
import React from 'react'
import { Icons } from '@/components/icons'
import { PageLoading, InlineLoading } from '@/components/LoadingDots'
import { ReactionPalette, ReactionBar } from '@/components/ReactionPalette'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, type Plan } from '@/lib/plan'
import { getLevelInfo } from '@/lib/level'
import { addPoints } from '@/lib/points'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import { FriendAvatar } from '@/components/FriendAvatar'

const SVG_ICONS: Record<string, React.ReactNode> = {
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  trophy: <><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><path d="M7 4h10l-1 7a5 5 0 01-10 0z"/><path d="M5 4H2v2a4 4 0 004 4M19 4h3v2a4 4 0 01-4 4"/></>,
  star: <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>,
  bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  store: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  block: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
}

const MENU_ITEMS = [
  { icon: 'trophy', label: '参加コンペ一覧', path: '/profile/comps' },
  { icon: 'block', label: 'ブロックリスト', path: '/profile/blocks' },
  { icon: 'star', label: 'サブスクリプション管理', path: '/subscription' },
  { icon: 'bell', label: 'プッシュ通知を設定', path: '/settings' },
]

const LEGAL_ITEMS = [
  { icon: 'book', label: '利用規約', path: '/legal/terms' },
  { icon: 'lock', label: 'プライバシーポリシー', path: '/legal/privacy' },
  { icon: 'store', label: '特定商取引法に基づく表記', path: '/legal/tokusho' },
]

const AREA_LABELS: Record<string, string> = {
  '広島/廿日市エリア': '広島/廿日市',
  '広島北部エリア': '広島北部',
  '東広島/呉エリア': '東広島/呉',
  '竹原/三原/尾道エリア': '竹原/三原/尾道',
  '福山エリア': '福山',
}

const AGE_DECADE = (birthDate: string) => {
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear()
  if (age < 20) return '10代'
  if (age < 30) return '20代'
  if (age < 40) return '30代'
  if (age < 50) return '40代'
  if (age < 60) return '50代'
  return '60代以上'
}

interface Profile {
  user_id: string
  nickname: string
  handicap: number
  best_score: number | null
  area_id: string | null
  areas: string[] | null
  plan: string
  created_at: string
  avatar_url: string | null
  gender: string | null
  birth_date: string | null
  blood_type: string | null
  bio: string | null
  round_freq: string | null
  preferred_days: string[] | null
}

const FREQ_LABEL: Record<string, string> = {
  weekly_2plus: '週2回以上',
  weekly_1: '週1回',
  monthly_2_3: '月2〜3回',
  monthly_1: '月1回',
  rarely: 'たまに',
}

const DAY_LABEL: Record<string, string> = {
  mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日',
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  created_at: string
  likes_count: number
  liked_by_me: boolean
}

const getHdcpLabel = (handicap: number) => {
  if (handicap >= 30) return '初心者'
  if (handicap >= 19) return '初級者'
  if (handicap >= 9) return '中級者'
  return '上級者'
}

const getPlanBadge = (plan: Plan) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: '#eef3ee', color: 'var(--mute)' }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'settings') return 'settings'
    }
    return 'profile'
  })
  const [myUserId, setMyUserId] = useState('')
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showAllNotif, setShowAllNotif] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [showPostModal, setShowPostModal] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)
  const [modalComments, setModalComments] = useState<any[]>([])
  const [modalCommentInput, setModalCommentInput] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({})
  const [commentReactionPaletteId, setCommentReactionPaletteId] = useState<string | null>(null)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [totalPts, setTotalPts] = useState(0)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const fileRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) setProfile(data)

      // 相互お気に入り（フレンド）
      const [{ data: myFavsData }, { data: favMeData }] = await Promise.all([
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
      ])
      if (myFavsData && favMeData) {
        const favMeSet = new Set(favMeData.map((f: any) => f.user_id))
        setFriendIds(new Set(myFavsData.filter((f: any) => favMeSet.has(f.target_id)).map((f: any) => f.target_id)))
      }

      const plan = await getUserPlan()
      setUserPlan(plan)

      // ポイント取得
      const { data: ptsData } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle()
      setTotalPts(ptsData?.total_points ?? 0)

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('cancel_at_period_end, current_period_end')
        .eq('user_id', user.id)
        .single()
      if (subData) {
        setCancelAtPeriodEnd(subData.cancel_at_period_end ?? false)
        setCurrentPeriodEnd(subData.current_period_end ?? null)
      }

      // 通知取得
      const { data: notifData, error: notifError } = await supabase
        .from('post_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (notifData && notifData.length > 0) {
        // actorのプロフィールを別途取得
        const actorIds = [...new Set(notifData.map((n: any) => n.actor_id))]
        const postIds = [...new Set(notifData.map((n: any) => n.post_id))]
        const { data: actorData } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', actorIds)
        const { data: postData } = await supabase
          .from('posts')
          .select('id, photo_url, caption')
          .in('id', postIds)
        const enriched = notifData.map((n: any) => ({
          ...n,
          actor: actorData?.find((a: any) => a.user_id === n.actor_id) ?? null,
          post: postData?.find((p: any) => p.id === n.post_id) ?? null,
        }))
        setNotifications(enriched)
        setUnreadNotifCount(enriched.filter((n: any) => !n.is_read).length)
      }

      // 投稿取得
      const { data: postData } = await supabase
        .from('posts')
        .select('*, post_likes(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (postData) {
        const postsWithLikes = (postData as any[]).map(p => ({
          ...p,
          likes_count: Number(p.post_likes?.[0]?.count ?? 0),
          liked_by_me: false,
        }))
        setPosts(postsWithLikes as any)
      }

      setLoading(false)
    }
    fetchProfile()
  }, [])

  const markAllNotifRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('post_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadNotifCount(0)
  }

  const handleNotifClick = async (notif: any) => {
    // 既読にする
    await supabase.from('post_notifications').update({ is_read: true }).eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    setUnreadNotifCount(prev => Math.max(0, prev - 1))
    // 自分の個人ページの該当投稿へ
    router.push(`/user/${notif.user_id}?postId=${notif.post_id}&from=notif`)
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      const likeKey = `ptsl_${user.id}_${postId}`
      if (!localStorage.getItem(likeKey)) {
        addPoints(supabase, user.id, 2)
        localStorage.setItem(likeKey, '1')
      }
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
    setSelectedPost(prev => prev?.id === postId
      ? { ...prev, liked_by_me: !liked, likes_count: liked ? prev.likes_count - 1 : prev.likes_count + 1 }
      : prev
    )
  }

  const fetchModalComments = async (postId: string) => {
    setCommentsLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(nickname, avatar_url, user_id)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) {
      setModalComments(data as any)
      const commentIds = data.map((c: any) => c.id)
      if (commentIds.length > 0) {
        const { data: rxnData } = await supabase
          .from('comment_reactions')
          .select('comment_id, user_id, emoji')
          .in('comment_id', commentIds)
        if (rxnData) {
          const rxns: Record<string, Record<string, string[]>> = {}
          rxnData.forEach((r: any) => {
            if (!rxns[r.comment_id]) rxns[r.comment_id] = {}
            if (!rxns[r.comment_id][r.emoji]) rxns[r.comment_id][r.emoji] = []
            rxns[r.comment_id][r.emoji].push(r.user_id)
          })
          setCommentReactions(prev => ({ ...prev, ...rxns }))
        }
      }
    }
    setCommentsLoading(false)
  }

  const toggleCommentReaction = async (commentId: string, emoji: string) => {
    if (!myUserId) return
    const existing = commentReactions[commentId]?.[emoji] ?? []
    const hasReacted = existing.includes(myUserId)
    if (hasReacted) {
      await supabase.from('comment_reactions')
        .delete().eq('comment_id', commentId).eq('user_id', myUserId).eq('emoji', emoji)
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], [emoji]: (prev[commentId]?.[emoji] ?? []).filter(id => id !== myUserId) },
      }))
    } else {
      await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: myUserId, emoji })
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], [emoji]: [...(prev[commentId]?.[emoji] ?? []), myUserId] },
      }))
    }
    setCommentReactionPaletteId(null)
  }

  const handleModalComment = async () => {
    if (!modalCommentInput.trim() || !selectedPost) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('post_comments').insert({
      post_id: selectedPost.id,
      user_id: user.id,
      content: modalCommentInput.trim(),
    })
    addPoints(supabase, user.id, 2)
    setModalCommentInput('')
    await fetchModalComments(selectedPost.id)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setSelectedPost(null)
  }

  const handleEditPost = async (postId: string) => {
    if (!editCaption.trim()) return
    await supabase.from('posts').update({ caption: editCaption }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: editCaption } : p))
    if (selectedPost?.id === postId) setSelectedPost(prev => prev ? { ...prev, caption: editCaption } : null)
    setEditPostId(null)
    setEditCaption('')
  }

  const handlePost = async () => {
    if (!caption.trim() && !photo) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let photoUrl: string | null = null
    if (photo) {
      const fileName = `${user.id}/${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, photo, { contentType: photo.type, upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    await supabase.from('posts').insert({
      user_id: user.id,
      caption: caption.trim() || null,
      photo_url: photoUrl,
      post_type: photo ? 'round_photo' : 'text',
    })

    // 投稿一覧を再取得
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (postData) setPosts(postData)

    setCaption('')
    setPhoto(null)
    setPhotoPreview(null)
    setShowPostModal(false)
    setPosting(false)
  }

  const registerPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('このブラウザはプッシュ通知に対応していません')
      return
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { alert('通知を許可してください'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userId: user.id }),
      })
      alert('プッシュ通知を有効にしました！')
    } catch (error) {
      alert('通知の設定に失敗しました')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <PageLoading />
  }

  const planBadge = getPlanBadge(userPlan)
  const myLevelInfo = getLevelInfo(totalPts)
  const zodiac = profile?.birth_date ? ZODIAC_NAMES_JP[getZodiacSign(profile.birth_date)] : null
  const areaLabel = profile?.areas && profile.areas.length > 0 ? AREA_LABELS[profile.areas[0]] ?? profile.areas[0] : null
  const ageDecade = profile?.birth_date ? AGE_DECADE(profile.birth_date) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <span style={{ background: planBadge.bg, color: planBadge.color, padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'Inter', letterSpacing: '.06em', border: userPlan === 'free' ? '1px solid var(--line)' : 'none' }}>
          {planBadge.label}
        </span>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {(['profile', 'settings'] as const).map(t => (
          <button key={t} onClick={() => { setActiveTab(t); router.replace(t === 'settings' ? '/profile?tab=settings' : '/profile') }} style={{ flex: 1, padding: '11px 0', fontSize: 12, fontWeight: activeTab === t ? 700 : 500, color: activeTab === t ? 'var(--g2)' : 'var(--mute)', background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid var(--g2)' : '2px solid transparent', cursor: 'pointer' }}>
            {t === 'profile' ? '👤 プロフィール' : '⚙️ 設定・メニュー'}
          </button>
        ))}
      </div>

      {/* プロフィールタブ */}
      {activeTab === 'profile' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          {/* プロフィールバナー */}
          <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div onClick={() => router.push('/profile/edit')} style={{ width: 64, height: 64, borderRadius: 14, background: 'var(--surf)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.nickname?.[0] ?? '?'
                }
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--g1)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)' }}>{profile?.nickname ?? 'ゴルファー'}</span>
                  {profile?.gender && (
                    <span style={{ width: 15, height: 15, borderRadius: 3, background: profile.gender === 'male' ? '#3b82f6' : profile.gender === 'female' ? '#ec4899' : '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {profile.gender === 'male' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><line x1="14.5" y1="9.5" x2="21" y2="3"/><polyline points="16,3 21,3 21,8"/></svg>}
                      {profile.gender === 'female' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="19" x2="15" y2="19"/></svg>}
                      {profile.gender === 'other' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'baseline', gap: 2, background: `${myLevelInfo.color}0a`, border: `1px solid ${myLevelInfo.color}4d`, borderRadius: 5, padding: '3px 8px' }}>
                    <span style={{ fontSize: 7, fontFamily: 'Inter', fontWeight: 700, color: myLevelInfo.color, letterSpacing: '.12em', opacity: .7 }}>GLH</span>
                    <span style={{ fontSize: 12, fontFamily: 'Inter', fontWeight: 700, color: myLevelInfo.color }}>Lv.{myLevelInfo.level}</span>
                  </span>
                </div>
                {(areaLabel || ageDecade) && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>
                    {[areaLabel, ageDecade].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {profile?.blood_type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{profile.blood_type}型</span>}
                  {zodiac && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{zodiac}</span>}
                  {profile?.handicap != null && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{getHdcpLabel(profile.handicap)}</span>}
                  {profile?.round_freq && FREQ_LABEL[profile.round_freq] && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{FREQ_LABEL[profile.round_freq]}</span>}
                  {profile?.preferred_days && profile.preferred_days.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{DAY_ORDER.filter(d => profile.preferred_days!.includes(d)).map(d => DAY_LABEL[d]).join('・')}</span>}
                </div>
              </div>
            </div>
            {profile?.bio && (
              <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.7, paddingTop: 10, borderTop: '1px solid var(--surf)' }}>{profile.bio}</div>
            )}
            <button onClick={() => router.push('/profile/edit')} style={{ marginTop: 12, width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mid)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              プロフィールを編集
            </button>
          </div>

          {/* お知らせ */}
          {notifications.length > 0 && (
            <div style={{ margin: '10px 16px 0', background: showAllNotif ? 'white' : '#fffbf5', borderRadius: 12, border: `1px solid ${unreadNotifCount > 0 ? 'rgba(224,80,112,.2)' : 'var(--line)'}`, overflow: 'hidden' }}>
              {!showAllNotif ? (
                <>
                  <div onClick={() => handleNotifClick(notifications[0])} style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                      {notifications[0].actor?.avatar_url ? <img src={notifications[0].actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : notifications[0].actor?.nickname?.[0] ?? '?'}
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: notifications[0].type === 'like' ? '#e05070' : '#3b82f6', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7 }}>
                        {notifications[0].type === 'like' ? '❤' : '💬'}
                      </div>
                    </div>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--txt)', lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 700 }}>{notifications[0].actor?.nickname ?? 'ゴルファー'}</strong>
                      {notifications[0].type === 'like' ? 'さんがいいねしました' : `さんがコメント：「${notifications[0].comment_text ?? ''}」`}
                    </div>
                    {notifications[0].post?.photo_url && (
                      <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={notifications[0].post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(224,80,112,.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: '#e05070', fontWeight: 600 }}>
                      {unreadNotifCount > 1 ? `🔔 他${notifications.length - 1}件のお知らせ` : '🔔 お知らせ'}
                    </span>
                    <span onClick={() => setShowAllNotif(true)} style={{ fontSize: 10, color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>全て見る →</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--surf)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>🔔 お知らせ</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {unreadNotifCount > 0 && <span onClick={markAllNotifRead} style={{ fontSize: 10, color: 'var(--mute)', cursor: 'pointer' }}>すべて既読</span>}
                      <span onClick={() => setShowAllNotif(false)} style={{ fontSize: 10, color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>閉じる</span>
                    </div>
                  </div>
                  {notifications.map((n: any) => (
                    <div key={n.id} onClick={() => handleNotifClick(n)} style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', background: n.is_read ? 'white' : '#fffbf5', borderBottom: '1px solid var(--surf)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                        {n.actor?.avatar_url ? <img src={n.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : n.actor?.nickname?.[0] ?? '?'}
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: n.type === 'like' ? '#e05070' : '#3b82f6', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7 }}>
                          {n.type === 'like' ? '❤' : '💬'}
                        </div>
                      </div>
                      <div style={{ flex: 1, fontSize: 12, color: n.is_read ? 'var(--mute)' : 'var(--txt)', lineHeight: 1.4 }}>
                        <strong style={{ fontWeight: 700, color: n.is_read ? 'var(--mid)' : 'var(--txt)' }}>{n.actor?.nickname ?? 'ゴルファー'}</strong>
                        {n.type === 'like' ? 'さんがいいねしました' : `さんがコメント：「${n.comment_text ?? ''}」`}
                      </div>
                      {n.post?.photo_url && (
                        <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={n.post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e05070', flexShrink: 0 }} />}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* 投稿グリッド */}
          <div style={{ padding: '8px 16px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>投稿</div>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだ投稿がありません</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {posts.map(post => (
                <div key={post.id} onClick={() => { setModalComments([]); setSelectedPost(post); fetchModalComments(post.id) }} style={{ aspectRatio: '1', background: post.photo_url ? 'transparent' : 'var(--surf)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--mute)', padding: 4, textAlign: 'center', lineHeight: 1.4 }}>
                  {post.photo_url
                    ? <img src={post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : post.caption?.slice(0, 20)
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 設定タブ */}
      {activeTab === 'settings' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

          {/* レベルバナー */}
          {(() => {
            const lvColor = myLevelInfo.color
            const lvBorder = `${lvColor}4d`
            const lvBg = `${lvColor}0a`
            return (
              <div
                onClick={() => router.push('/level')}
                style={{ margin: '10px 16px 0', background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,.04)', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ border: `2px solid ${lvBorder}`, borderRadius: 12, padding: '10px 14px', background: lvBg, minWidth: 80, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', lineHeight: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>Lv</span>
                    <span style={{ fontSize: 9, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>.</span>
                    <span style={{ fontSize: 40, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>{myLevelInfo.level}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: lvColor, fontFamily: 'Inter', marginTop: 6 }}>{myLevelInfo.name}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>GLHレベルガイド</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9,18 15,12 9,6"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.8 }}>
                    アプリ内アクティビティで<br/>
                    ポイントGETしてレベルアップ
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 解約予定日 */}
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <div style={{ margin: '0 0 8px', background: '#fff8f0', borderTop: '1px solid rgba(200,100,0,.15)', borderBottom: '1px solid rgba(200,100,0,.15)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a05000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style={{ fontSize: 12, color: '#a05000', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700 }}>解約予定：</span>
                {new Date(currentPeriodEnd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}まで利用可能
              </div>
            </div>
          )}

          {/* メニュー */}
          <div style={{ background: 'white', marginBottom: 8 }}>
            <div style={{ padding: '10px 20px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>メニュー</div>
            {MENU_ITEMS.map((item) => (
              <div key={item.label} onClick={() => item.path === '/settings' ? registerPush() : router.push(item.path)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
                <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{SVG_ICONS[item.icon]}</svg>
                </div>
                <div style={{ fontSize: 13, color: 'var(--txt)', flex: 1 }}>{item.label}</div>
                <div style={{ color: 'var(--mute)', fontSize: 18 }}>›</div>
              </div>
            ))}

            {/* 法的情報アコーディオン */}
            <div onClick={() => setLegalOpen(o => !o)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: legalOpen ? '1px solid var(--surf)' : 'none' }}>
              <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{SVG_ICONS.shield}</svg>
              </div>
              <div style={{ fontSize: 13, color: 'var(--txt)', flex: 1 }}>法的情報</div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round" style={{ transform: legalOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            {legalOpen && LEGAL_ITEMS.map((item, i) => (
              <div key={item.label} onClick={() => router.push(item.path)} style={{ padding: '11px 20px 11px 32px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < LEGAL_ITEMS.length - 1 ? '1px solid var(--surf)' : 'none', cursor: 'pointer', background: 'var(--off)' }}>
                <div style={{ width: 26, height: 26, background: 'white', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{SVG_ICONS[item.icon]}</svg>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt)', flex: 1 }}>{item.label}</div>
                <div style={{ color: 'var(--mute)', fontSize: 16 }}>›</div>
              </div>
            ))}
          </div>

          {/* ログアウト・退会 */}
          <div style={{ background: 'white' }}>
            <div onClick={handleLogout} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--surf)' }}>
              <div style={{ width: 30, height: 30, background: 'rgba(200,60,60,.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(200,60,60,.2)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c05050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, color: '#c05050', flex: 1 }}>ログアウト</div>
              <div style={{ color: '#e0a0a0', fontSize: 18 }}>›</div>
            </div>
            <div onClick={() => router.push('/profile/delete')} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, background: 'rgba(200,60,60,.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(200,60,60,.12)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c05050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6l-1,14H6L5,6"/>
                  <path d="M10,11v6"/>
                  <path d="M14,11v6"/>
                  <path d="M9,6V4h6v2"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, color: '#c05050', flex: 1 }}>退会する</div>
              <div style={{ color: '#e0a0a0', fontSize: 18 }}>›</div>
            </div>
          </div>

        </div>
      )}

      {/* 投稿フローティングボタン（プロフィールタブのみ） */}
      {activeTab === 'profile' && (
        <div onClick={() => setShowPostModal(true)} style={{ position: 'fixed', bottom: 90, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'var(--g1)', boxShadow: '0 4px 16px rgba(22,101,52,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      )}

      {/* 投稿モーダル */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>新規投稿</div>
              <button onClick={() => { setShowPostModal(false); setCaption(''); setPhoto(null); setPhotoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>
            {photoPreview && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            )}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="今日のラウンドはどうでしたか？"
              style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', fontSize: 14, resize: 'none', outline: 'none', marginBottom: 12, minHeight: 80 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--mid)', cursor: 'pointer' }}>📷 写真を追加</button>
              <button onClick={handlePost} disabled={posting || (!caption.trim() && !photo)} style={{ flex: 1, background: posting || (!caption.trim() && !photo) ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer' }}>
                {posting ? '投稿中...' : '投稿する'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setPhoto(file)
                const reader = new FileReader()
                reader.onload = () => setPhotoPreview(reader.result as string)
                reader.readAsDataURL(file)
              }
            }} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* 投稿詳細モーダル */}
      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', overflow: 'auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid var(--surf)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>投稿</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => { setEditPostId(selectedPost.id); setEditCaption(selectedPost.caption ?? '') }} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer', fontWeight: 600 }}>編集</button>
                <button onClick={() => handleDeletePost(selectedPost.id)} style={{ background: 'none', border: '1px solid rgba(200,60,60,.3)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#c05050', cursor: 'pointer', fontWeight: 600 }}>削除</button>
                <button onClick={() => { setSelectedPost(null); setEditPostId(null); setEditCaption(''); setModalComments([]); setModalCommentInput('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
              </div>
            </div>
            {selectedPost.photo_url && (
              <img src={selectedPost.photo_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
            )}
            {editPostId === selectedPost.id ? (
              <div style={{ padding: '12px 16px' }}>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} style={{ width: '100%', border: '1px solid var(--g3)', borderRadius: 8, padding: '10px', fontSize: 13, resize: 'none', outline: 'none', minHeight: 80, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditPostId(null); setEditCaption('') }} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 7, padding: '10px', fontSize: 13, color: 'var(--mute)', cursor: 'pointer' }}>キャンセル</button>
                  <button onClick={() => handleEditPost(selectedPost.id)} style={{ flex: 1, background: 'var(--g1)', border: 'none', borderRadius: 7, padding: '10px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>保存</button>
                </div>
              </div>
            ) : (
              selectedPost.caption && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7 }}>{selectedPost.caption}</div>
              )
            )}
            <div style={{ padding: '4px 16px 10px', fontSize: 10, color: 'var(--mute)' }}>
              {new Date(selectedPost.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', gap: 14, borderBottom: '1px solid var(--surf)' }}>
              <button onClick={() => toggleLike(selectedPost.id, selectedPost.liked_by_me)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: selectedPost.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                {selectedPost.liked_by_me ? Icons.heart(14, '#e05070', true) : Icons.heart(14, 'var(--mute)')} {selectedPost.likes_count}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--mute)' }}>
                💬 {modalComments.length}
              </span>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {commentsLoading && <InlineLoading />}
              {!commentsLoading && modalComments.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--mute)', padding: '4px 0' }}>まだコメントはありません</div>
              )}
              {modalComments.map((c: any) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <FriendAvatar
                      avatarUrl={c.profiles?.avatar_url ?? null}
                      nickname={c.profiles?.nickname ?? ''}
                      isFriend={!!c.profiles?.user_id && friendIds.has(c.profiles.user_id)}
                      size={28}
                      border="1px solid var(--line)"
                      flexShrink={0}
                      onClick={() => c.profiles?.user_id && router.push(`/user/${c.profiles.user_id}`)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '6px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2 }}>{c.profiles?.nickname ?? 'ゴルファー'}</div>
                        <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
                      </div>
                      <ReactionBar reactions={commentReactions[c.id] ?? {}} myId={myUserId} onToggle={(emoji) => toggleCommentReaction(c.id, emoji)} />
                    </div>
                    <button onClick={() => setCommentReactionPaletteId(prev => prev === c.id ? null : c.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', flexShrink: 0, lineHeight: 1 }}>+</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={modalCommentInput} onChange={e => setModalCommentInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleModalComment() }} placeholder="コメントを入力..." style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 20, padding: '7px 12px', fontSize: 12, outline: 'none', background: 'var(--surf)' }} />
                <button onClick={handleModalComment} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* コメントリアクションパレット */}
      {commentReactionPaletteId && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 350 }}>
          <ReactionPalette
            myEmoji={Object.entries(commentReactions[commentReactionPaletteId] ?? {}).find(([, ids]) => ids.includes(myUserId))?.[0] ?? null}
            onSelect={(emoji) => toggleCommentReaction(commentReactionPaletteId, emoji)}
            onClose={() => setCommentReactionPaletteId(null)}
          />
        </div>
      )}

      <BottomNav />
    </div>
  )
}
