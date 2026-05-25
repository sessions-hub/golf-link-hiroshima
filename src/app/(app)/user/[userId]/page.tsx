'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import { getLevelInfo } from '@/lib/level'
import { addPoints } from '@/lib/points'
import PointToast from '@/components/PointToast'
import { Icons } from '@/components/icons'
import { PageLoading, InlineLoading } from '@/components/LoadingDots'
import BottomNav from '@/components/layout/BottomNav'
import { ReactionPalette, ReactionBar } from '@/components/ReactionPalette'
import { FriendAvatar } from '@/components/FriendAvatar'

interface Profile {
  user_id: string
  nickname: string
  avatar_url: string | null
  birth_date: string
  blood_type: string
  handicap: number
  best_score: number | null
  round_freq: string
  bio: string | null
  plan: string
  gender: string | null
  preferred_days: string[]
  areas: string[] | null
}

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  post_type: string
  created_at: string
  likes_count: number
  liked_by_me: boolean
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

const getHdcpLabel = (handicap: number) => {
  if (handicap >= 30) return '初心者'
  if (handicap >= 19) return '初級者'
  if (handicap >= 9) return '中級者'
  return '上級者'
}

const AREA_LABELS: Record<string, string> = {
  '広島/廿日市エリア': '広島/廿日市',
  '広島北部エリア': '広島北部',
  '東広島/呉エリア': '東広島/呉',
  '竹原/三原/尾道エリア': '竹原/三原/尾道',
  '福山エリア': '福山',
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


export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const userId = params.userId as string
  const postId = searchParams.get('postId')
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null)
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [modalComments, setModalComments] = useState<any[]>([])
  const [modalCommentInput, setModalCommentInput] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [profilePts, setProfilePts] = useState(0)
  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({})
  const [commentReactionPaletteId, setCommentReactionPaletteId] = useState<string | null>(null)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockedByThem, setIsBlockedByThem] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (prof) {
        // subscriptionsからプランを取得
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', userId)
          .maybeSingle()
        setProfile({ ...prof, plan: subData?.plan ?? 'free' })

        // ポイント取得
        const { data: ptsData } = await supabase
          .from('user_points')
          .select('total_points')
          .eq('user_id', userId)
          .maybeSingle()
        setProfilePts(ptsData?.total_points ?? 0)
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('*, post_likes(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (postData) {
        // liked_by_me を確認
        const { data: myLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
        const likedPostIds = new Set(myLikes?.map((l: any) => l.post_id) ?? [])
        const postsWithLikes = (postData as any[]).map((p) => ({
          ...p,
          likes_count: Number(p.post_likes?.[0]?.count ?? 0),
          liked_by_me: likedPostIds.has(p.id),
        }))
        setPosts(postsWithLikes as any)
        if (postId) {
          const featured = postsWithLikes.find(p => p.id === postId)
          if (featured) {
            setFeaturedPost(featured as any)
            fetchModalComments(featured.id)
          }
        }
      }

      const [{ data: favData }, { data: myFavsAll }, { data: favMeAll }] = await Promise.all([
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', userId).single(),
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
      ])
      setIsFav(!!favData)
      if (myFavsAll && favMeAll) {
        const favMeSet = new Set(favMeAll.map((f: any) => f.user_id))
        setFriendIds(new Set(myFavsAll.filter((f: any) => favMeSet.has(f.target_id)).map((f: any) => f.target_id)))
      }

      // ブロック状態
      const [{ data: blockData }, { data: blockedByData }] = await Promise.all([
        supabase.from('blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', userId).maybeSingle(),
        supabase.from('blocks').select('id').eq('blocker_id', userId).eq('blocked_id', user.id).maybeSingle(),
      ])
      setIsBlocked(!!blockData)
      setIsBlockedByThem(!!blockedByData)

      if (user.id !== userId) {
        await supabase.from('footprints').insert({
          visitor_id: user.id,
          visited_id: userId,
        }).then(() => {})
      }

      setLoading(false)
    }
    init()
  }, [userId])

  const toggleFav = async () => {
    if (!myId) return
    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('user_id', myId).eq('target_id', userId)
    } else {
      await supabase.from('favorites').insert({ user_id: myId, target_id: userId })
      const favKey = `ptsf_${myId}_${userId}`
      if (!localStorage.getItem(favKey)) {
        addPoints(supabase, myId, 5)
        setToast(t => ({ pts: 5, k: (t?.k ?? 0) + 1 }))
        const { data: reverse } = await supabase.from('favorites')
          .select('id').eq('user_id', userId).eq('target_id', myId).maybeSingle()
        if (reverse) {
          addPoints(supabase, myId, 20)
          addPoints(supabase, userId, 20)
          setToast(t => ({ pts: 20, k: (t?.k ?? 0) + 1 }))
        }
        localStorage.setItem(favKey, '1')
      }
    }
    setIsFav(!isFav)
  }

  const handleChat = async () => {
    if (!myId) return
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${myId})`)
      .single()
    if (existing) { router.push(`/chat/${existing.id}`); return }
    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({ user1_id: myId, user2_id: userId })
      .select('id').single()
    if (newRoom) {
      addPoints(supabase, myId, 10)
      router.push(`/chat/${newRoom.id}`)
    }
  }

  const fetchModalComments = async (postId: string) => {
    setCommentsLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(nickname, avatar_url)')
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
    if (!myId) return
    const existing = commentReactions[commentId]?.[emoji] ?? []
    const hasReacted = existing.includes(myId)
    if (hasReacted) {
      await supabase.from('comment_reactions')
        .delete().eq('comment_id', commentId).eq('user_id', myId).eq('emoji', emoji)
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], [emoji]: (prev[commentId]?.[emoji] ?? []).filter(id => id !== myId) },
      }))
    } else {
      await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: myId, emoji })
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], [emoji]: [...(prev[commentId]?.[emoji] ?? []), myId] },
      }))
    }
    setCommentReactionPaletteId(null)
  }

  const handleBlock = async () => {
    if (!myId) return
    if (isBlocked) {
      await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', userId)
      setIsBlocked(false)
    } else {
      await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: userId })
      setIsBlocked(true)
    }
    setShowBlockModal(false)
  }

  const handleModalComment = async (postId?: string) => {
    const targetPostId = postId ?? selectedPost?.id
    if (!modalCommentInput.trim() || !myId || !targetPostId) return
    const [{ data: iBlock }, { data: theyBlock }] = await Promise.all([
      supabase.from('blocks').select('id').eq('blocker_id', myId).eq('blocked_id', userId).maybeSingle(),
      supabase.from('blocks').select('id').eq('blocker_id', userId).eq('blocked_id', myId).maybeSingle(),
    ])
    if (iBlock || theyBlock) return
    const commentText = modalCommentInput.trim()
    await supabase.from('post_comments').insert({
      post_id: targetPostId,
      user_id: myId,
      content: commentText,
    })
    addPoints(supabase, myId, 2)
    setModalCommentInput('')
    await fetchModalComments(targetPostId)
    // 通知・投稿者ポイント
    const targetPost = posts.find(p => p.id === targetPostId) ?? featuredPost
    if (targetPost && targetPost.user_id !== myId) {
      addPoints(supabase, targetPost.user_id, 5)
      await supabase.from('post_notifications').insert({
        user_id: targetPost.user_id, actor_id: myId, post_id: targetPostId,
        type: 'comment', comment_text: commentText.slice(0, 50)
      })
    }
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!myId) return
    const [{ data: iBlock }, { data: theyBlock }] = await Promise.all([
      supabase.from('blocks').select('id').eq('blocker_id', myId).eq('blocked_id', userId).maybeSingle(),
      supabase.from('blocks').select('id').eq('blocker_id', userId).eq('blocked_id', myId).maybeSingle(),
    ])
    if (iBlock || theyBlock) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: myId })
      const likeKey = `ptsl_${myId}_${postId}`
      if (!localStorage.getItem(likeKey)) {
        addPoints(supabase, myId, 2)
        const targetPost = posts.find(p => p.id === postId) ?? (featuredPost?.id === postId ? featuredPost : null)
        if (targetPost && targetPost.user_id !== myId) addPoints(supabase, targetPost.user_id, 3)
        localStorage.setItem(likeKey, '1')
      }
      // 投稿者に通知
      const targetPost = posts.find(p => p.id === postId) ?? (featuredPost?.id === postId ? featuredPost : null)
      if (targetPost && targetPost.user_id !== myId) {
        await supabase.from('post_notifications').insert({
          user_id: targetPost.user_id, actor_id: myId, post_id: postId, type: 'like'
        })
      }
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
  }

  if (loading) return <PageLoading />

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--mute)', fontSize: 14 }}>ユーザーが見つかりません</div>
    </div>
  )

  const isMe = myId === userId
  const zodiac = profile.birth_date ? ZODIAC_NAMES_JP[getZodiacSign(profile.birth_date)] : null
  const profileLevelInfo = getLevelInfo(profilePts)
  const areaLabel = profile.areas && profile.areas.length > 0 ? AREA_LABELS[profile.areas[0]] ?? profile.areas[0] : null
  const ageDecade = profile.birth_date ? AGE_DECADE(profile.birth_date) : null
  const otherPosts = featuredPost ? posts.filter(p => p.id !== featuredPost.id) : posts

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {toast && <PointToast key={toast.k} amount={toast.pts} onDone={() => setToast(null)} />}

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '16px', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--g2)', fontSize: 13, fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          プロフィール
        </div>
        {isMe && (
          <button onClick={() => router.push('/profile/edit')} style={{ marginLeft: 'auto', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 7, padding: '6px 12px', fontSize: 11, color: 'var(--mid)', cursor: 'pointer', fontWeight: 600 }}>編集</button>
        )}
      </div>

      {/* プロフィールバナー（白系） */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          {/* アバター */}
          <FriendAvatar
            avatarUrl={profile.avatar_url}
            nickname={profile.nickname}
            isFriend={friendIds.has(userId)}
            size={64}
            borderRadius={14}
            border="1.5px solid var(--line)"
            flexShrink={0}
          />
          {/* 情報 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 名前・性別バッジ・プランバッジ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)' }}>{profile.nickname}</span>
              {profile.gender && (
                <span style={{ width: 15, height: 15, borderRadius: 3, background: profile.gender === 'male' ? '#3b82f6' : profile.gender === 'female' ? '#ec4899' : '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {profile.gender === 'male' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><line x1="14.5" y1="9.5" x2="21" y2="3"/><polyline points="16,3 21,3 21,8"/></svg>}
                  {profile.gender === 'female' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="19" x2="15" y2="19"/></svg>}
                  {profile.gender === 'other' && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>}
                </span>
              )}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'baseline', gap: 2, background: `${profileLevelInfo.color}0a`, border: `1px solid ${profileLevelInfo.color}4d`, borderRadius: 5, padding: '3px 8px' }}>
                <span style={{ fontSize: 7, fontFamily: 'Inter', fontWeight: 700, color: profileLevelInfo.color, letterSpacing: '.12em', opacity: .7 }}>GLH</span>
                <span style={{ fontSize: 12, fontFamily: 'Inter', fontWeight: 700, color: profileLevelInfo.color }}>Lv.{profileLevelInfo.level}</span>
              </span>
            </div>
            {/* エリア・年代 */}
            {(areaLabel || ageDecade) && (
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>
                {[areaLabel, ageDecade].filter(Boolean).join(' · ')}
              </div>
            )}
            {/* タグ */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {profile.blood_type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{profile.blood_type}型</span>}
              {zodiac && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{zodiac}</span>}
              {profile.handicap != null && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{getHdcpLabel(profile.handicap)}</span>}
              {profile.round_freq && FREQ_LABEL[profile.round_freq] && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{FREQ_LABEL[profile.round_freq]}</span>}
              {profile.preferred_days && profile.preferred_days.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{DAY_ORDER.filter(d => profile.preferred_days.includes(d)).map(d => DAY_LABEL[d]).join('・')}</span>}
            </div>
          </div>
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.7, paddingTop: 10, borderTop: '1px solid var(--surf)', marginTop: 4 }}>{profile.bio}</div>
        )}

        {/* アクションボタン */}
        {!isMe && (
          <div style={{ marginTop: 12 }}>
            {isBlocked && (
              <div style={{ marginBottom: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#c05050', background: 'rgba(200,60,60,.1)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 5, padding: '3px 10px' }}>ブロック中</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={isBlocked ? undefined : handleChat}
                disabled={isBlocked}
                style={{ flex: 1, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: isBlocked ? 'not-allowed' : 'pointer', opacity: isBlocked ? .4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                チャットする
              </button>
              <button
                onClick={isBlocked ? undefined : toggleFav}
                disabled={isBlocked}
                style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid var(--line)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isBlocked ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: isBlocked ? .4 : 1 }}>
                {isFav ? Icons.heart(17, '#e05070', true) : Icons.heart(17, 'var(--mute)')}
              </button>
              <button
                onClick={() => setShowBlockModal(true)}
                style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${isBlocked ? 'rgba(200,60,60,.25)' : 'var(--line)'}`, background: isBlocked ? 'rgba(200,60,60,.08)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90, ...(isBlocked ? { filter: 'blur(3px)', opacity: .3, pointerEvents: 'none' } : {}) }}>

        {/* メイン投稿（HOMEからクリック時） */}
        {featuredPost && (
          <div style={{ background: 'white', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
            <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <FriendAvatar
                avatarUrl={profile.avatar_url}
                nickname={profile.nickname}
                isFriend={friendIds.has(userId)}
                size={36}
                border="1px solid var(--line)"
                flexShrink={0}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{profile.nickname}</div>
                <div style={{ fontSize: 10, color: 'var(--mute)' }}>{new Date(featuredPost.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' })}</div>
              </div>
            </div>
            {featuredPost.photo_url && (
              <img src={featuredPost.photo_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            )}
            {featuredPost.caption && (
              <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.6 }}>{featuredPost.caption}</div>
            )}
            <div style={{ padding: '4px 16px', display: 'flex', gap: 14, borderBottom: '1px solid var(--surf)' }}>
              <button onClick={() => { toggleLike(featuredPost.id, featuredPost.liked_by_me); setFeaturedPost(prev => prev ? { ...prev, liked_by_me: !prev.liked_by_me, likes_count: prev.liked_by_me ? prev.likes_count - 1 : prev.likes_count + 1 } : null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: featuredPost.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                {featuredPost.liked_by_me ? Icons.heart(14, '#e05070', true) : Icons.heart(14, 'var(--mute)')} {featuredPost.likes_count}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--mute)' }}>
                💬 {modalComments.length}
              </span>
            </div>
            <div style={{ padding: '8px 16px 12px' }}>
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
                      isFriend={!!c.user_id && friendIds.has(c.user_id)}
                      size={28}
                      border="1px solid var(--line)"
                      flexShrink={0}
                      onClick={() => c.user_id && router.push(`/user/${c.user_id}`)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '6px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2 }}>{c.profiles?.nickname ?? 'ゴルファー'}</div>
                        <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
                      </div>
                      <ReactionBar reactions={commentReactions[c.id] ?? {}} myId={myId} onToggle={(emoji) => toggleCommentReaction(c.id, emoji)} />
                    </div>
                    <button onClick={() => setCommentReactionPaletteId(prev => prev === c.id ? null : c.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', flexShrink: 0, lineHeight: 1 }}>+</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  value={modalCommentInput}
                  onChange={e => setModalCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleModalComment() }}
                  placeholder="コメントを入力..."
                  style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 20, padding: '7px 12px', fontSize: 12, outline: 'none', background: 'var(--surf)' }}
                />
                <button onClick={() => handleModalComment(featuredPost.id)} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
              </div>
            </div>
          </div>
        )}

        {/* サムネイルグリッド */}
        {otherPosts.length > 0 && (
          <>
            {featuredPost && (
              <div style={{ padding: '8px 16px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>他の投稿</div>
            )}
            {!featuredPost && (
              <div style={{ padding: '8px 16px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>投稿</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {otherPosts.map(post => (
                <div key={post.id} onClick={() => { setModalComments([]); setSelectedPost(post); fetchModalComments(post.id) }} style={{ aspectRatio: '1', background: post.photo_url ? 'transparent' : 'var(--surf)', overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--mute)' }}>
                  {post.photo_url
                    ? <img src={post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ padding: 8, fontSize: 11, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.4 }}>{post.caption?.slice(0, 20)}</div>
                  }
                </div>
              ))}
            </div>
          </>
        )}

        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>まだ投稿がありません</div>
          </div>
        )}
      </div>

      {/* 投稿詳細モーダル */}
      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', overflow: 'auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 12px', borderBottom: '1px solid var(--surf)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>投稿</div>
              <button onClick={() => { setSelectedPost(null); setModalComments([]); setModalCommentInput('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>
            {selectedPost.photo_url && (
              <img src={selectedPost.photo_url} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
            )}
            {selectedPost.caption && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7 }}>{selectedPost.caption}</div>
            )}
            <div style={{ padding: '4px 16px 10px', fontSize: 10, color: 'var(--mute)' }}>
              {new Date(selectedPost.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', gap: 14, borderBottom: '1px solid var(--surf)' }}>
              <button onClick={() => {
                toggleLike(selectedPost.id, selectedPost.liked_by_me)
                setSelectedPost(prev => prev ? { ...prev, liked_by_me: !prev.liked_by_me, likes_count: prev.liked_by_me ? prev.likes_count - 1 : prev.likes_count + 1 } : null)
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: selectedPost.liked_by_me ? '#e05070' : 'var(--mute)' }}>
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
                      isFriend={!!c.user_id && friendIds.has(c.user_id)}
                      size={28}
                      border="1px solid var(--line)"
                      flexShrink={0}
                      onClick={() => c.user_id && router.push(`/user/${c.user_id}`)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '6px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2 }}>{c.profiles?.nickname ?? 'ゴルファー'}</div>
                        <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
                      </div>
                      <ReactionBar reactions={commentReactions[c.id] ?? {}} myId={myId} onToggle={(emoji) => toggleCommentReaction(c.id, emoji)} />
                    </div>
                    <button onClick={() => setCommentReactionPaletteId(prev => prev === c.id ? null : c.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', flexShrink: 0, lineHeight: 1 }}>+</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={modalCommentInput}
                  onChange={e => setModalCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleModalComment() }}
                  placeholder="コメントを入力..."
                  style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 20, padding: '7px 12px', fontSize: 12, outline: 'none', background: 'var(--surf)' }}
                />
                <button onClick={() => handleModalComment()} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* コメントリアクションパレット */}
      {commentReactionPaletteId && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 350 }}>
          <ReactionPalette
            myEmoji={Object.entries(commentReactions[commentReactionPaletteId] ?? {}).find(([, ids]) => ids.includes(myId))?.[0] ?? null}
            onSelect={(emoji) => toggleCommentReaction(commentReactionPaletteId, emoji)}
            onClose={() => setCommentReactionPaletteId(null)}
          />
        </div>
      )}

      {/* ブロック確認モーダル */}
      {showBlockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <div style={{ background: 'white', borderRadius: 18, padding: '24px 20px', width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 14, textAlign: 'center' }}>
              {isBlocked ? `${profile.nickname}さんのブロックを解除` : `${profile.nickname}さんをブロック`}
            </div>
            {!isBlocked ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.9, marginBottom: 10 }}>
                  ブロックすると以下の操作ができなくなります：<br/>
                  ・チャット・いいね・コメント<br/>
                  ・マッチング一覧に表示されなくなります
                </div>
                <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.8, background: 'var(--surf)', borderRadius: 9, padding: '10px 12px', marginBottom: 18 }}>
                  ・相手には通知されません<br/>
                  ・いつでも解除できます
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.9, marginBottom: 18 }}>
                ブロックを解除すると、このユーザーと再度チャットやいいねができるようになります。
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowBlockModal(false)} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', fontSize: 13, color: 'var(--mid)', cursor: 'pointer', fontWeight: 600 }}>キャンセル</button>
              <button onClick={handleBlock} style={{ flex: 1, background: isBlocked ? 'var(--g2)' : '#c05050', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                {isBlocked ? 'ブロック解除' : 'ブロックする'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
