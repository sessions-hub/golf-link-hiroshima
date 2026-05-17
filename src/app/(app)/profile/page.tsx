'use client'
import React from 'react'
import { Icons } from '@/components/icons'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, isPremium, type Plan } from '@/lib/plan'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'

const SVG_ICONS: Record<string, React.ReactNode> = {
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  trophy: <><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><path d="M7 4h10l-1 7a5 5 0 01-10 0z"/><path d="M5 4H2v2a4 4 0 004 4M19 4h3v2a4 4 0 01-4 4"/></>,
  star: <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>,
  bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  store: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
}

const MENU_ITEMS = [
  { icon: 'calendar', label: '予約履歴', path: '/course' },
  { icon: 'trophy', label: '参加コンペ一覧', path: '/comp' },
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
}

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  created_at: string
}

const getPlanBadge = (plan: Plan) => {
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'standard') return { label: 'STANDARD', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: '#eef3ee', color: 'var(--mute)' }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [whoLiked, setWhoLiked] = useState<any[]>([])
  const [whoVisited, setWhoVisited] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')
  const [myUserId, setMyUserId] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showAllNotif, setShowAllNotif] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyUserId(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) setProfile(data)

      const plan = await getUserPlan()
      setUserPlan(plan)

      // 通知取得
      const { data: notifData } = await supabase
        .from('post_notifications')
        .select(`*, actor:profiles!post_notifications_actor_id_fkey(nickname, avatar_url), post:posts!post_notifications_post_id_fkey(photo_url, caption)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (notifData) {
        setNotifications(notifData)
        setUnreadNotifCount(notifData.filter((n: any) => !n.is_read).length)
      }

      // 投稿取得
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (postData) setPosts(postData)

      // プレミアム限定
      if (plan === 'premium') {
        const { data: visits } = await supabase
          .from('footprints')
          .select('visitor_id, created_at, profiles!footprints_visitor_id_fkey(user_id, nickname, avatar_url)')
          .eq('visited_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (visits) setWhoVisited(visits)

        const { data: likes } = await supabase
          .from('favorites')
          .select('user_id, created_at, profiles!favorites_user_id_fkey(user_id, nickname, avatar_url)')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (likes) setWhoLiked(likes)
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
    router.push(`/user/${notif.user_id}?postId=${notif.post_id}`)
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
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>読み込み中...</div></div>
  }

  const planBadge = getPlanBadge(userPlan)
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
          <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '11px 0', fontSize: 12, fontWeight: activeTab === t ? 700 : 500, color: activeTab === t ? 'var(--g2)' : 'var(--mute)', background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid var(--g2)' : '2px solid transparent', cursor: 'pointer' }}>
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
                  <span style={{ marginLeft: 'auto', background: planBadge.bg, color: planBadge.color, padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Inter', letterSpacing: '.06em', border: userPlan === 'free' ? '1px solid var(--line)' : 'none' }}>{planBadge.label}</span>
                </div>
                {(areaLabel || ageDecade) && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>
                    {[areaLabel, ageDecade].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {profile?.blood_type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{profile.blood_type}型</span>}
                  {zodiac && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{zodiac}</span>}
                  {profile?.handicap != null && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>Hdcp {profile.handicap}</span>}
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
              <div style={{ fontSize: 28, marginBottom: 10 }}>📸</div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだ投稿がありません</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {posts.map(post => (
                <div key={post.id} onClick={() => setSelectedPost(post)} style={{ aspectRatio: '1', background: post.photo_url ? 'transparent' : 'var(--surf)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--mute)', padding: 4, textAlign: 'center', lineHeight: 1.4 }}>
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

          {/* プレミアム限定 */}
          {isPremium(userPlan) ? (
            <div style={{ background: 'white', marginBottom: 8 }}>
              <div style={{ padding: '10px 20px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>👑 PREMIUM限定</div>
              <div style={{ display: 'flex', gap: 12, padding: '8px 16px 4px', overflowX: 'auto' }}>
                {whoVisited.map((v: any) => {
                  const p = v.profiles
                  return (
                    <div key={v.visitor_id} onClick={() => router.push(`/user/${v.visitor_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p?.nickname?.[0] ?? '?'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.nickname ?? '不明'}</div>
                    </div>
                  )
                })}
                {whoLiked.map((l: any) => {
                  const p = l.profiles
                  return (
                    <div key={l.user_id} onClick={() => router.push(`/user/${l.user_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(200,60,100,.08)', border: '1px solid rgba(200,60,100,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p?.nickname?.[0] ?? '?'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.nickname ?? '不明'}</div>
                    </div>
                  )
                })}
                {whoVisited.length === 0 && whoLiked.length === 0 && (
                  <div style={{ padding: '8px 0 12px', fontSize: 12, color: 'var(--mute)' }}>まだデータがありません</div>
                )}
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: 10, color: 'var(--mute)' }}>👣 足跡{whoVisited.length}人 · ❤️ お気に入り{whoLiked.length}人</div>
            </div>
          ) : (
            <div style={{ margin: '10px 16px', background: 'linear-gradient(135deg, var(--g1), var(--g2))', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>👑 プレミアムプランで解放</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 12, lineHeight: 1.6 }}>足跡を見た人・お気に入りしてくれた人<br/>マッチング上位表示など</div>
              <button onClick={() => router.push('/subscription')} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>プレミアムにアップグレード</button>
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
          </div>

          {/* 法的情報 */}
          <div style={{ background: 'white', marginBottom: 8 }}>
            <div style={{ padding: '10px 20px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>法的情報</div>
            {LEGAL_ITEMS.map((item) => (
              <div key={item.label} onClick={() => router.push(item.path)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
                <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{SVG_ICONS[item.icon]}</svg>
                </div>
                <div style={{ fontSize: 13, color: 'var(--txt)', flex: 1 }}>{item.label}</div>
                <div style={{ color: 'var(--mute)', fontSize: 18 }}>›</div>
              </div>
            ))}
          </div>

          {/* ログアウト */}
          <div style={{ background: 'white' }}>
            <div onClick={handleLogout} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
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
                <button onClick={() => { setSelectedPost(null); setEditPostId(null); setEditCaption('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
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
            <div style={{ padding: '4px 16px', fontSize: 10, color: 'var(--mute)' }}>
              {new Date(selectedPost.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
