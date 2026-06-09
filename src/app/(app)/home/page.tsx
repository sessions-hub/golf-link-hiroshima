'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { ReactionPalette, ReactionBar } from '@/components/ReactionPalette'
import { FriendAvatar } from '@/components/FriendAvatar'
import AttachmentPicker from '@/components/AttachmentPicker'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, type Plan } from '@/lib/plan'
import { getLevelInfo } from '@/lib/level'
import { addPoints } from '@/lib/points'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import GenderBadge from '@/components/GenderBadge'
import { OFFICIAL_USER_ID, OFFICIAL_AVATAR } from '@/lib/official'

const INSTALL_DISMISSED_KEY = 'pwa_install_dismissed'

interface Profile {
  nickname: string
  handicap: number
  best_score: number | null
  user_id: string
  avatar_url: string | null
  gender: string | null
}


interface HomeChatItem {
  type: 'dm' | 'comp' | 'friend'
  id: string
  name: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
  otherUser?: { user_id: string; nickname: string; avatar_url: string | null; gender: string | null }
  isFriend?: boolean
  memberProfiles?: Array<{ user_id: string; nickname: string; avatar_url: string | null }>
}

interface CompEventItem {
  id: string
  title: string
  comp_date: string
  type: string
  created_at: string
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: { nickname: string | null; avatar_url: string | null; gender: string | null }
}

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  post_type: string
  created_at: string
  likes_count: number
  comment_count: number
  liked_by_me: boolean
  profiles: Profile
}

const getPlanBadge = (plan: string) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' }
  return { label: 'FREE', bg: '#eef3ee', color: '#7a9a7a' }
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'home' | 'timeline'>('home')
  const [showPostModal, setShowPostModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [myId, setMyId] = useState('')
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({})
  const [commentReactionPaletteId, setCommentReactionPaletteId] = useState<string | null>(null)
  const [postMenu, setPostMenu] = useState<string | null>(null)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [allChats, setAllChats] = useState<HomeChatItem[]>([])
  const [allComps, setAllComps] = useState<CompEventItem[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [showInstallBubble, setShowInstallBubble] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isSafariMac, setIsSafariMac] = useState(false)
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false)
  const [showHowToAdd, setShowHowToAdd] = useState(false)
  const deferredPromptRef = useRef<any>(null)
  const [totalPts, setTotalPts] = useState(0)
  const [todayPts, setTodayPts] = useState(0)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
    if (isStandalone) return
    if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)
    const safariMac = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      && !('ontouchend' in document)
    setIsSafariMac(safariMac)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setHasDeferredPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    const timer = setTimeout(() => {
      setShowInstallBubble(true)
    }, 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallDismiss = () => {
    setShowInstallBubble(false)
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
  }

  const handleInstallClick = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt()
      const { outcome } = await deferredPromptRef.current.userChoice
      deferredPromptRef.current = null
      setHasDeferredPrompt(false)
      if (outcome === 'accepted') {
        setShowInstallBubble(false)
        localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, handicap, best_score, user_id, avatar_url, gender')
        .eq('user_id', user.id)
        .single()
      if (prof) setProfile(prof)
      setMyId(user.id)
      const plan = await getUserPlan()
      setUserPlan(plan)

      // スコア履歴取得
      const { data: scoreData } = await supabase
        .from('scorecards')
        .select('total_score')
        .eq('user_id', user.id)
        .order('round_date', { ascending: false })
        .limit(10)
      if (scoreData && scoreData.length > 0) {
        setLastScore(scoreData[0].total_score)
        setRoundCount(scoreData.length)
      }
      // 相互お気に入り（フレンド）
      const [{ data: myFavs }, { data: favMe }] = await Promise.all([
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
      ])
      if (myFavs && favMe) {
        const favMeSet = new Set(favMe.map((f: any) => f.user_id))
        setFriendIds(new Set(myFavs.filter((f: any) => favMeSet.has(f.target_id)).map((f: any) => f.target_id)))
      }

      // ポイント取得 + ログインボーナス
      const today = new Date().toISOString().split('T')[0]
      const { data: ptsData } = await supabase
        .from('user_points')
        .select('total_points, today_points, today_date')
        .eq('user_id', user.id)
        .maybeSingle()
      const isFirstVisitToday = !ptsData || ptsData.today_date !== today
      if (isFirstVisitToday) {
        await addPoints(supabase, user.id, 5)
        setTotalPts((ptsData?.total_points ?? 0) + 5)
        setTodayPts(5)
      } else {
        setTotalPts(ptsData.total_points)
        setTodayPts(ptsData.today_points)
      }

      // チャット一覧取得（個人・コンペグループ・フレンドグループ混在・最新3件）
      const [{ data: chatData }, { data: orgComps }, { data: entries }, { data: memberships }] = await Promise.all([
        supabase.from('chat_rooms').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).order('last_message_at', { ascending: false }).limit(5),
        supabase.from('competitions').select('id, title').eq('organizer_id', user.id),
        supabase.from('comp_entries').select('comp_id').eq('user_id', user.id),
        supabase.from('friend_group_members').select('group_id').eq('user_id', user.id),
      ])

      const unified: HomeChatItem[] = []

      // 個人チャット
      if (chatData) {
        const dmItems = await Promise.all(chatData.map(async (room) => {
          const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
          const { data: prof } = await supabase.from('profiles').select('user_id, nickname, avatar_url, gender').eq('user_id', otherUserId).single()
          const otherUser = prof ?? { user_id: otherUserId, nickname: '不明', avatar_url: null, gender: null }
          const unread = room.user1_id === user.id ? room.unread_count_user1 : room.unread_count_user2
          return { type: 'dm' as const, id: room.id, name: otherUser.nickname, lastMessage: room.last_message, lastMessageAt: room.last_message_at, unread, otherUser, isFriend: myFavs && favMe ? (() => { const favMeSet = new Set(favMe.map((f: any) => f.user_id)); return myFavs.filter((f: any) => favMeSet.has(f.target_id)).some((f: any) => f.target_id === otherUserId) })() : false }
        }))
        unified.push(...dmItems)
      }

      // コンペグループ
      const compMap = new Map<string, string>()
      orgComps?.forEach(c => compMap.set(c.id, c.title))
      if (entries && entries.length > 0) {
        const newIds = entries.map(e => e.comp_id).filter(id => !compMap.has(id))
        if (newIds.length > 0) {
          const { data: ec } = await supabase.from('competitions').select('id, title').in('id', newIds)
          ec?.forEach(c => compMap.set(c.id, c.title))
        }
      }
      const compItems = await Promise.all(Array.from(compMap.entries()).map(async ([compId, name]) => {
        const { data: lastMsg } = await supabase.from('comp_group_messages').select('content, image_url, created_at').eq('comp_id', compId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        const lastSeen = typeof window !== 'undefined' ? (localStorage.getItem(`comp_chat_last_seen_${compId}`) ?? '2000-01-01T00:00:00Z') : '2000-01-01T00:00:00Z'
        let unread = 0
        if (lastMsg && new Date(lastMsg.created_at) > new Date(lastSeen)) {
          const { count } = await supabase.from('comp_group_messages').select('*', { count: 'exact', head: true }).eq('comp_id', compId).gt('created_at', lastSeen).neq('user_id', user.id)
          unread = count ?? 0
        }
        return { type: 'comp' as const, id: compId, name, lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null, lastMessageAt: lastMsg?.created_at ?? null, unread }
      }))
      unified.push(...compItems)

      // フレンドグループ
      const groupIds = memberships?.map(m => m.group_id) ?? []
      if (groupIds.length > 0) {
        const { data: friendGroups } = await supabase.from('friend_groups').select('id, name').in('id', groupIds)
        const friendItems = await Promise.all((friendGroups ?? []).map(async (g) => {
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
          let memberProfiles: Array<{ user_id: string; nickname: string; avatar_url: string | null }> = []
          if (memberRows && memberRows.length > 0) {
            const { data: pData } = await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', memberRows.map(m => m.user_id))
            memberProfiles = pData ?? []
          }
          return { type: 'friend' as const, id: g.id, name: g.name, lastMessage: lastMsg ? (lastMsg.image_url ? '📷 画像' : lastMsg.content) : null, lastMessageAt: lastMsg?.created_at ?? null, unread, memberProfiles }
        }))
        unified.push(...friendItems)
      }

      unified.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })
      setAllChats(unified)

      const { data: compData } = await supabase
        .from('competitions')
        .select('id, title, comp_date, type, created_at')
        .order('created_at', { ascending: false })
        .limit(4)
      setAllComps((compData as any) ?? [])

      const { data: postData2 } = await supabase
        .from('posts')
        .select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id, gender), post_likes(count), post_comments(count)`)
        .order('created_at', { ascending: false })
        .limit(30)

      if (postData2) {
        // 自分のいいね一覧を取得
        const { data: myLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
        const likedPostIds = new Set(myLikes?.map((l: any) => l.post_id) ?? [])
        const postsWithLikes = (postData2 as any[]).map(p => ({
          ...p,
          likes_count: Number(p.post_likes?.[0]?.count ?? 0),
          comment_count: Number(p.post_comments?.[0]?.count ?? 0),
          liked_by_me: likedPostIds.has(p.id),
        }))
        setPosts(postsWithLikes as any)
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select(`*, profiles!post_comments_user_id_fkey(nickname, avatar_url, gender)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) {
      setComments(prev => ({ ...prev, [postId]: data as any }))
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

  const handleToggleComments = async (postId: string) => {
    if (!showComments[postId]) await fetchComments(postId)
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim()
    if (!content) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
    })
    if (!error) {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      await fetchComments(postId)
      addPoints(supabase, user.id, 2)
      setTotalPts(p => p + 2)
      setTodayPts(p => p + 2)
      // 投稿者に通知・ポイント
      const post = posts.find(p => p.id === postId)
      if (post && post.user_id !== user.id) {
        addPoints(supabase, post.user_id, 5)
        await supabase.from('post_notifications').insert({
          user_id: post.user_id, actor_id: user.id, post_id: postId,
          type: 'comment', comment_text: content.slice(0, 50)
        })
      }
    }
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    await supabase.from('post_comments').delete().eq('id', commentId)
    await fetchComments(postId)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setPostMenu(null)
  }

  const handleEditPost = async (postId: string) => {
    if (!editCaption.trim()) return
    await supabase.from('posts').update({ caption: editCaption }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: editCaption } : p))
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
      const fileName = `${user.id}/${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, photo, { contentType: photo.type, upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { data: newPost, error: postError } = await supabase.from('posts').insert({
      user_id: user.id,
      caption: caption.trim() || null,
      photo_url: photoUrl,
      post_type: photo ? 'round_photo' : 'text',
    }).select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id, gender), post_likes(count), post_comments(count)`).single()
    if (postError) {
      console.error('Post error:', postError)
      setPosting(false)
      return
    }

    addPoints(supabase, user.id, 10)
    setTotalPts(p => p + 10)
    setTodayPts(p => p + 10)

    const newPostId = newPost.id

    // B. 公式いいね（Edge Function経由）
    console.log('OFFICIAL_USER_ID:', OFFICIAL_USER_ID)
    console.log('newPostId:', newPostId)
    if (OFFICIAL_USER_ID) {
      console.log('official-like 送信中...')
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/official-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ postId: newPostId }),
      })
    }

    // 投稿後にDBから再取得
    const { data: refreshedPosts } = await supabase
      .from('posts')
      .select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id, gender), post_likes(count), post_comments(count)`)
      .order('created_at', { ascending: false })
      .limit(30)
    if (refreshedPosts) setPosts(refreshedPosts.map((p: any) => ({ ...p, likes_count: Number(p.post_likes?.[0]?.count ?? 0), comment_count: Number(p.post_comments?.[0]?.count ?? 0), liked_by_me: false })) as any)

    setCaption('')
    setPhoto(null)
    setPhotoPreview(null)
    setShowPostModal(false)
    setPosting(false)

    // A. フレンド・近いエリアへプッシュ通知（fire-and-forget）
    const myNickname = profile?.nickname ?? 'ゴルファー'
    const notifyFollowers = async () => {
      const { data: myFavs } = await supabase
        .from('favorites')
        .select('target_id')
        .eq('user_id', user.id)

      const { data: favsMe } = await supabase
        .from('favorites')
        .select('user_id')
        .in('user_id', (myFavs ?? []).map((f: any) => f.target_id))
        .eq('target_id', user.id)

      const friendIds = (favsMe ?? []).map((f: any) => f.user_id)

      let targetIds = [...friendIds]
      if (targetIds.length < 20) {
        const { data: nearby } = await supabase
          .from('profiles')
          .select('user_id')
          .neq('user_id', user.id)
          .not('user_id', 'in', `(${targetIds.join(',')})`)
          .limit(20 - targetIds.length)
        targetIds = [...targetIds, ...(nearby ?? []).map((p: any) => p.user_id)]
      }

      targetIds.slice(0, 20).forEach(userId => {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: `${myNickname}さんが投稿しました`,
            body: caption.length > 40 ? caption.slice(0, 40) + '...' : caption,
            url: '/home',
          }),
        })
      })
    }
    notifyFollowers()
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      const likeKey = `ptsl_${user.id}_${postId}`
      if (!localStorage.getItem(likeKey)) {
        addPoints(supabase, user.id, 2)
        setTotalPts(p => p + 2)
        setTodayPts(p => p + 2)
        const post = posts.find(p => p.id === postId)
        if (post && post.user_id !== user.id) addPoints(supabase, post.user_id, 3)
        localStorage.setItem(likeKey, '1')
      }
      // 投稿者に通知
      const post = posts.find(p => p.id === postId)
      if (post && post.user_id !== user.id) {
        await supabase.from('post_notifications').insert({
          user_id: post.user_id, actor_id: user.id, post_id: postId, type: 'like'
        })
      }
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
  }

  const filteredPosts = posts.filter(p =>
    !searchQuery ||
    p.caption?.includes(searchQuery) ||
    p.profiles?.nickname?.includes(searchQuery)
  )

  const levelInfo = getLevelInfo(totalPts)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
      {/* グリーンヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo variant="screen" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

          <div onClick={() => router.push('/profile')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--g1)', cursor: 'pointer', border: '1px solid var(--line)', overflow: 'hidden' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile?.nickname?.[0] ?? '?'
            }
          </div>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white' }}>
        {(['home', 'timeline'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '11px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {tab === 'home' ? Icons.home(14, 'currentColor') : Icons.timeline(14, 'currentColor')}
              {tab === 'home' ? 'ホーム' : 'タイムライン'}
            </span>
          </button>
        ))}
      </div>
      </div>

      {/* ホームタブ */}
      {activeTab === 'home' && (
        <div style={{ paddingBottom: 90 }}>

          {/* レベルカード */}
          {(() => {
            const lv = levelInfo
            const lvColor = lv.color
            const lvBorder = `${lvColor}4d`
            const lvBg = `${lvColor}0a`
            return (
              <div onClick={() => router.push('/level')} style={{ margin: '8px 16px 10px', background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,.04)', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
                {/* 左：Lvブロック */}
                <div style={{ border: `1.5px solid ${lvBorder}`, borderRadius: 10, padding: '8px 12px', background: lvBg, minWidth: 68, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', lineHeight: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>Lv</span>
                    <span style={{ fontSize: 8, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>.</span>
                    <span style={{ fontSize: 30, fontWeight: 900, color: lvColor, fontFamily: 'Inter' }}>{lv.level}</span>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: lvColor, fontFamily: 'Inter', marginTop: 5 }}>{lv.name}</div>
                </div>

                {/* 右：ポイント＋プログレス */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 500, color: 'var(--txt)', lineHeight: 1 }}>
                      {totalPts.toLocaleString()}<span style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 3 }}>pt</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g2)', fontFamily: 'Inter', lineHeight: 1 }}>本日 +{todayPts}pt</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surf)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${lv.progress * 100}%`, background: 'linear-gradient(90deg,var(--g3),var(--lime))', borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--mute)', fontFamily: 'Inter' }}>{lv.name}</span>
                    {lv.next
                      ? <span style={{ fontSize: 9, color: 'var(--mute)', fontFamily: 'Inter' }}>{lv.next.name}まで {lv.ptToNext.toLocaleString()}pt</span>
                      : <span style={{ fontSize: 9, color: 'var(--mute)', fontFamily: 'Inter', fontWeight: 700 }}>MAX LEVEL</span>
                    }
                  </div>
                </div>
              </div>
            )
          })()}

          {/* マッチング待ちカード */}
          <div onClick={() => router.push('/match')} style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg, #12392E 0%, #1E4D3F 100%)', borderRadius: 14, padding: '22px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,.12)', cursor: 'pointer' }}>
            <svg style={{position:'absolute',right:0,top:0,bottom:0,height:'100%',width:'130px',opacity:.06,pointerEvents:'none'}} viewBox="0 0 150 130" preserveAspectRatio="xMaxYMid slice">
              <path d="M 120 0 Q 100 22 112 48 Q 124 74 108 98 Q 94 118 106 140" fill="none" stroke="white" strokeWidth="1.3"/>
              <path d="M 145 5 Q 124 30 136 58 Q 148 86 130 112 Q 114 134 126 158" fill="none" stroke="white" strokeWidth="1"/>
              <path d="M 96 0 Q 78 24 90 52 Q 102 78 87 104 Q 74 126 85 150" fill="none" stroke="white" strokeWidth="0.8"/>
            </svg>
            <div style={{position:'absolute',top:0,right:0,width:'55%',height:'100%',background:'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,.06), transparent 60%)',pointerEvents:'none'}}/>
            <div style={{fontFamily:'Inter',fontSize:10,fontWeight:500,letterSpacing:'.22em',color:'rgba(214,194,154,.8)',textTransform:'uppercase',marginBottom:10}}>DISCOVER</div>
            <div style={{fontSize:20,fontWeight:600,color:'#F5F3EE',marginBottom:6,lineHeight:1.2}}>フレンドを探す</div>
            <div style={{fontSize:11,color:'rgba(245,243,238,.58)',marginBottom:18,lineHeight:1.6,fontWeight:300}}>独自アルゴリズムで相性の良いゴルファーと繋がる</div>
            <button style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#D4AA6A,#C49A50)',border:'none',borderRadius:100,padding:'10px 20px',fontFamily:'Inter',fontSize:11,fontWeight:600,letterSpacing:'.12em',color:'#17372D',cursor:'pointer',boxShadow:'0 4px 14px rgba(196,154,80,.35)'}}>
              VIEW MATCHES
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#17372D" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </button>
          </div>

          {/* スコア + GPS 横並び */}
          <div style={{ margin: '0 16px 10px', display: 'flex', gap: 8 }}>
            {/* スコアカード */}
            <div onClick={() => router.push('/score')} style={{ flex: 1, background: 'linear-gradient(160deg, #1B312A 0%, #223D34 100%)', borderRadius: 12, padding: 14, border: '1px solid rgba(214,194,154,.12)', cursor: 'pointer' }}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D6C29A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <polyline points="7,17 9.5,14 12,15.5 15,12 17,13" strokeWidth="1.2"/>
                </svg>
                <div>
                  <div style={{fontFamily:'Inter',fontSize:8,fontWeight:500,letterSpacing:'.16em',color:'#BFD9CC',textTransform:'uppercase',marginBottom:3}}>SCORE LOG</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#F5F3EE'}}>スコア記録</div>
                </div>
              </div>
              <div style={{fontSize:10,color:'rgba(245,243,238,.42)',fontWeight:300}}>
                {lastScore ? `直近 ${lastScore} · ${roundCount}回` : 'ラウンドをスマートに残す'}
              </div>
            </div>
            {/* GPSカード */}
            <div onClick={() => router.push('/gps')} style={{ flex: 1, background: 'linear-gradient(160deg, #1C322B 0%, #244036 100%)', borderRadius: 12, padding: 14, border: '1px solid rgba(214,194,154,.12)', cursor: 'pointer' }}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D6C29A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <div style={{fontFamily:'Inter',fontSize:8,fontWeight:500,letterSpacing:'.16em',color:'#BFD9CC',textTransform:'uppercase',marginBottom:3}}>GPS TRACKING</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#F5F3EE'}}>GPS計測</div>
                </div>
              </div>
              <div style={{fontSize:10,color:'rgba(245,243,238,.42)',fontWeight:300}}>距離をリアルタイムで確認</div>
            </div>
          </div>

          {/* ライムライン */}
          <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 10px', borderRadius: 1 }}/>

          {/* 新着情報 */}
          {(() => {
            const newsItems = [
              ...allChats.map(c => ({ kind: 'chat' as const, sortAt: c.lastMessageAt, chatData: c })),
              ...allComps.map(c => ({ kind: 'event' as const, sortAt: c.created_at, eventData: c })),
            ].sort((a, b) => {
              if (!a.sortAt && !b.sortAt) return 0
              if (!a.sortAt) return 1
              if (!b.sortAt) return -1
              return new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
            }).slice(0, 3)
            if (newsItems.length === 0) return null
            return (
              <>
                <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'Inter' }}>新着情報</span>
                  <span onClick={() => router.push('/notifications')} style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, cursor: 'pointer' }}>すべて見る</span>
                </div>
                {newsItems.map((item) => {
                  if (item.kind === 'chat') {
                    const c = item.chatData
                    const { unread } = c
                    const time = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) : ''
                    const href = c.type === 'dm' ? `/chat/${c.id}` : c.type === 'comp' ? `/comp/${c.id}/chat` : `/chat/group/${c.id}`
                    return (
                      <div key={`chat-${c.type}-${c.id}`} onClick={() => router.push(href)} style={{ margin: '0 16px 8px', background: 'white', borderRadius: 12, border: `1px solid ${unread > 0 ? 'rgba(224,80,112,.25)' : 'var(--line)'}`, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          {c.type === 'dm' && c.otherUser ? (
                            <FriendAvatar avatarUrl={c.otherUser.avatar_url} nickname={c.otherUser.nickname} isFriend={c.isFriend ?? false} size={42} border="1px solid var(--line)" />
                          ) : c.type === 'comp' ? (
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, var(--g1), var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" width={20} height={20}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            </div>
                          ) : (
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--surf)', border: '1px solid var(--line)', position: 'relative' }}>
                              {(c.memberProfiles ?? []).slice(0, 2).map((p, i) => (
                                <div key={p.user_id} style={{ position: 'absolute', width: 22, height: 22, borderRadius: '50%', background: 'var(--surf)', border: '1.5px solid white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--g1)', left: i === 0 ? 2 : undefined, right: i === 1 ? 2 : undefined, top: i === 0 ? 2 : undefined, bottom: i === 1 ? 2 : undefined }}>
                                  {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : p.nickname?.[0]}
                                </div>
                              ))}
                              {(c.memberProfiles ?? []).length === 0 && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👥</div>}
                            </div>
                          )}
                          {unread > 0 && (
                            <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', border: '2px solid white' }}>
                              {unread > 9 ? '9+' : unread}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: unread > 0 ? 700 : 600, color: 'var(--txt)', overflow: 'hidden', maxWidth: 160 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                              {c.type === 'dm' && <GenderBadge gender={c.otherUser?.gender} size={12} />}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--mute)', flexShrink: 0 }}>{time}</div>
                          </div>
                          <div style={{ fontSize: 12, color: unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.lastMessage ?? 'チャットを始めましょう'}
                          </div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                      </div>
                    )
                  }
                  const ev = item.eventData
                  const isRound = ev.type === 'round'
                  const iconBg = isRound ? '#dcfce7' : '#fef3c7'
                  const iconFill = isRound ? '#16a34a' : '#f59e0b'
                  const dateLabel = ev.comp_date ? new Date(ev.comp_date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''
                  const typeLabel = isRound ? 'ラウンド募集' : 'コンペ'
                  return (
                    <div key={`event-${ev.id}`} onClick={() => router.push(`/course/${ev.id}`)} style={{ margin: '0 16px 8px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--mute)' }}>{typeLabel} · {dateLabel}</div>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                  )
                })}
                <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 10px', borderRadius: 1 }}/>
              </>
            )
          })()}

          {/* おすすめタイムライン（サムネイルグリッド） */}
          <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>タイムライン</span>
            <span onClick={() => setActiveTab('timeline')} style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, cursor: 'pointer' }}>すべて見る</span>
          </div>

          {loading && <SectionLoading padding="16px 0" />}

          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: 8, color: "var(--mute)" }}>{Icons.camera(32, "var(--mute)")}</div>
              <div style={{ fontSize: 12, color: 'var(--mute)' }}>まだ投稿がありません</div>
              <button onClick={() => { setActiveTab('timeline'); setShowPostModal(true) }} style={{ marginTop: 10, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>最初の投稿をする</button>
            </div>
          )}

          {/* サムネイルグリッド */}
          {!loading && posts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: '0 16px' }}>
              {posts.slice(0, 9).map((post) => (
                <div key={post.id} onClick={() => router.push(`/user/${post.user_id}`)} style={{ aspectRatio: '1', background: post.photo_url ? 'transparent' : 'var(--surf)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '1px solid var(--line)' }}>
                  {post.photo_url
                    ? <img src={post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--lime)', marginBottom: 4, flexShrink: 0 }}>
                          {post.profiles?.nickname?.[0] ?? '?'}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--txt)', textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {post.caption ?? ''}
                        </div>
                      </div>
                    )
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* タイムラインタブ */}
      {activeTab === 'timeline' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* フローティング投稿ボタン */}
          <div onClick={() => setShowPostModal(true)} style={{ position: 'fixed', bottom: 90, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'var(--g1)', boxShadow: '0 4px 16px rgba(22,101,52,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>

          {/* 検索バー */}
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="投稿・ユーザーを検索"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)', background: 'transparent' }}
              />
            </div>
          </div>

          <div style={{ paddingBottom: 90 }} onScroll={() => setCommentReactionPaletteId(null)}>
            {loading && <SectionLoading padding="20px 0" />}

            {!loading && filteredPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: 10, color: "var(--mute)" }}>{Icons.camera(28, "var(--mute)")}</div>
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>{searchQuery ? '検索結果がありません' : 'まだ投稿がありません'}</div>
                {!searchQuery && (
                  <button onClick={() => setShowPostModal(true)} style={{ marginTop: 12, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 7, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>最初の投稿をする</button>
                )}
              </div>
            )}

            {filteredPosts.map((post) => (
              <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <FriendAvatar
                    avatarUrl={post.profiles?.avatar_url ?? (OFFICIAL_USER_ID && post.user_id === OFFICIAL_USER_ID ? OFFICIAL_AVATAR : null)}
                    nickname={post.profiles?.nickname ?? ''}
                    isFriend={friendIds.has(post.user_id)}
                    size={40}
                    flexShrink={0}
                    onClick={() => router.push(`/user/${post.user_id}`)}
                  />
                  <div style={{ flex: 1 }}>
                    <div onClick={() => router.push(`/user/${post.user_id}`)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{post.profiles?.nickname ?? 'ゴルファー'}<GenderBadge gender={post.profiles?.gender} size={12} />{OFFICIAL_USER_ID && post.user_id === OFFICIAL_USER_ID && <span style={{background:'var(--g1)',color:'var(--lime)',borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:700,marginLeft:4,flexShrink:0}}>公式</span>}</div>
                    <div style={{ fontSize: 10, color: 'var(--mute)' }}>{new Date(post.created_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                  {post.user_id === myId && (
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => { setCommentReactionPaletteId(null); setPostMenu(postMenu === post.id ? null : post.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}>···</button>
                      {postMenu === post.id && (
                        <div style={{ position: 'absolute', right: 0, top: 28, background: 'white', borderRadius: 10, border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 400, minWidth: 120, overflow: 'hidden' }}>
                          <div onClick={() => { setEditPostId(post.id); setEditCaption(post.caption ?? ''); setPostMenu(null) }} style={{ padding: '12px 16px', fontSize: 13, color: 'var(--txt)', cursor: 'pointer', borderBottom: '1px solid var(--surf)' }}>編集</div>
                          <div onClick={() => handleDeletePost(post.id)} style={{ padding: '12px 16px', fontSize: 13, color: '#c05050', cursor: 'pointer' }}>削除</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* 編集モーダル */}
                {editPostId === post.id && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} style={{ width: '100%', border: '1px solid var(--g3)', borderRadius: 8, padding: '10px', fontSize: 13, resize: 'none', outline: 'none', minHeight: 60, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditPostId(null); setEditCaption('') }} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 7, padding: '8px', fontSize: 12, color: 'var(--mute)', cursor: 'pointer' }}>キャンセル</button>
                      <button onClick={() => handleEditPost(post.id)} style={{ flex: 1, background: 'var(--g1)', border: 'none', borderRadius: 7, padding: '8px', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>保存</button>
                    </div>
                  </div>
                )}
                {post.photo_url && (
                  <img src={post.photo_url} alt="投稿" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                )}
                {post.caption && (
                  <div style={{ padding: '10px 16px 6px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7 }}>{post.caption}</div>
                )}
                <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 14 }}>
                  <button onClick={() => toggleLike(post.id, post.liked_by_me)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: post.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                    {post.liked_by_me ? Icons.heart(14, '#e05070', true) : Icons.heart(14, 'var(--mute)')} {post.likes_count}
                  </button>
                  <button onClick={() => handleToggleComments(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: showComments[post.id] ? 'var(--g2)' : 'var(--mute)' }}>
                    {Icons.chat(14, showComments[post.id] ? 'var(--g2)' : 'var(--mute)')} {comments[post.id]?.length ?? post.comment_count}
                  </button>
                </div>
                {/* コメント欄 */}
                {showComments[post.id] && (
                  <div style={{ borderTop: '1px solid var(--surf)', padding: '8px 16px' }}>
                    {(comments[post.id] ?? []).map(c => (
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
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>{c.profiles?.nickname ?? 'ゴルファー'}<GenderBadge gender={c.profiles?.gender} size={11} /></div>
                              <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
                            </div>
                            <ReactionBar reactions={commentReactions[c.id] ?? {}} myId={myId} onToggle={(emoji) => toggleCommentReaction(c.id, emoji)} />
                          </div>
                          <div style={{ display: 'flex', flexShrink: 0, alignItems: 'flex-start', gap: 2 }}>
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setCommentReactionPaletteId(prev => prev === c.id ? null : c.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', flexShrink: 0, lineHeight: 1 }}>+</button>
                            {c.user_id === myId && (
                              <button onClick={() => handleDeleteComment(c.id, post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 11, padding: '4px', flexShrink: 0 }}>✕</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        value={commentInputs[post.id] ?? ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id) }}
                        placeholder="コメントを入力..."
                        style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 20, padding: '7px 12px', fontSize: 12, outline: 'none', background: 'var(--surf)' }}
                      />
                      <button onClick={() => handleAddComment(post.id)} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投稿モーダル */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>投稿する</div>
              <button onClick={() => { setShowPostModal(false); setCaption(''); setPhoto(null); setPhotoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>
            {photoPreview && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            )}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="ラウンドの感想や成果を共有しよう！"
              rows={3}
              style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', marginBottom: 12, fontFamily: 'var(--sans)' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <AttachmentPicker
                onImageSelect={(file) => { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)) }}
                onFileSelect={() => {}}
              />
              <button onClick={handlePost} disabled={posting || (!caption.trim() && !photo)} style={{ flex: 1, background: posting || (!caption.trim() && !photo) ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer' }}>
                {posting ? '投稿中...' : '投稿する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWAインストールバブル */}
      {showInstallBubble && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 200,
          background: 'white', borderRadius: 16, padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(13,61,43,.22)',
          border: '1px solid rgba(168,224,99,.3)',
          animation: 'slideUp .3s ease',
        }}>
          <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <button
            onClick={handleInstallDismiss}
            style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--mute)', lineHeight: 1, padding: 4 }}
            aria-label="閉じる"
          >×</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <img src="/icon-192.png" alt="GLH." style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>ホーム画面に追加</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>いつでもすぐ開けます</div>
            </div>
          </div>
          {hasDeferredPrompt ? (
            <button
              onClick={handleInstallClick}
              style={{ width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              インストールする
            </button>
          ) : (
            <button
              onClick={() => setShowHowToAdd(true)}
              style={{ width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              追加方法を見る
            </button>
          )}
        </div>
      )}

      {/* 追加方法モーダル */}
      {showHowToAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>ホーム画面への追加方法</div>
              <button onClick={() => setShowHowToAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>
            {isSafariMac ? (
              <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.9, background: 'var(--surf)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ marginBottom: 8, fontWeight: 700, color: 'var(--g1)' }}>Mac Safari の場合</div>
                <div>① Safariのメニューバー「ファイル」→「<span style={{ fontWeight: 700 }}>Dockに追加</span>」</div>
                <div>② または共有ボタン（□↑）→「<span style={{ fontWeight: 700 }}>Dockに追加</span>」</div>
                <div>③「<span style={{ fontWeight: 700 }}>追加</span>」をクリックして完了</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.9, background: 'var(--surf)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ marginBottom: 8, fontWeight: 700, color: 'var(--g1)' }}>iPhone / iPad の場合</div>
                <div>① Safari の <span style={{ fontWeight: 700 }}>共有ボタン</span>（□↑）をタップ</div>
                <div>②「<span style={{ fontWeight: 700 }}>ホーム画面に追加</span>」を選択</div>
                <div>③「<span style={{ fontWeight: 700 }}>追加</span>」をタップして完了</div>
              </div>
            )}
            <button
              onClick={() => setShowHowToAdd(false)}
              style={{ marginTop: 20, width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* コメントリアクションパレット */}
      {commentReactionPaletteId && (
        <div style={{ position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 150 }}>
          <ReactionPalette
            myEmoji={Object.entries(commentReactions[commentReactionPaletteId] ?? {}).find(([, ids]) => ids.includes(myId))?.[0] ?? null}
            onSelect={(emoji) => toggleCommentReaction(commentReactionPaletteId, emoji)}
            onClose={() => setCommentReactionPaletteId(null)}
          />
        </div>
      )}

      <BottomNav />
    </div>
  )
}
