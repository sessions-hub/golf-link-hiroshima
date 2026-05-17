'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import { Icons } from '@/components/icons'
import BottomNav from '@/components/layout/BottomNav'

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

const AREA_LABELS: Record<string, string> = {
  '広島/廿日市エリア': '広島/廿日市',
  '広島北部エリア': '広島北部',
  '東広島/呉エリア': '東広島/呉',
  '竹原/三原/尾道エリア': '竹原/三原/尾道',
  '福山エリア': '福山',
}

const getPlanBadge = (plan: string) => {
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'standard') return { label: 'STANDARD', bg: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' }
  return { label: 'FREE', bg: '#eef3ee', color: '#7a9a7a' }
}

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
  const [showModalComments, setShowModalComments] = useState(false)

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
      if (prof) setProfile(prof)

      const { data: postData } = await supabase
        .from('posts')
        .select('*, post_likes(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (postData) {
        const postsWithLikes = (postData as any[]).map((p) => ({
          ...p,
          likes_count: Number(p.post_likes?.[0]?.count ?? 0),
          liked_by_me: false,
        }))
        setPosts(postsWithLikes as any)
        if (postId) {
          const featured = postsWithLikes.find(p => p.id === postId)
          if (featured) setFeaturedPost(featured as any)
        }
      }

      const { data: favData } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', userId)
        .single()
      setIsFav(!!favData)

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
    if (newRoom) router.push(`/chat/${newRoom.id}`)
  }

  const fetchModalComments = async (postId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(nickname, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setModalComments(data as any)
    setShowModalComments(true)
  }

  const handleModalComment = async () => {
    if (!modalCommentInput.trim() || !myId || !selectedPost) return
    await supabase.from('post_comments').insert({
      post_id: selectedPost.id,
      user_id: myId,
      content: modalCommentInput.trim(),
    })
    setModalCommentInput('')
    await fetchModalComments(selectedPost.id)
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!myId) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: myId })
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--mute)', fontSize: 14 }}>読み込み中...</div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--mute)', fontSize: 14 }}>ユーザーが見つかりません</div>
    </div>
  )

  const isMe = myId === userId
  const zodiac = profile.birth_date ? ZODIAC_NAMES_JP[getZodiacSign(profile.birth_date)] : null
  const planBadge = getPlanBadge(profile.plan)
  const areaLabel = profile.areas && profile.areas.length > 0 ? AREA_LABELS[profile.areas[0]] ?? profile.areas[0] : null
  const ageDecade = profile.birth_date ? AGE_DECADE(profile.birth_date) : null
  const otherPosts = featuredPost ? posts.filter(p => p.id !== featuredPost.id) : posts

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

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
          <div style={{ width: 64, height: 64, borderRadius: 14, background: 'var(--surf)', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile.nickname?.[0]
            }
          </div>
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
              <span style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Inter', letterSpacing: '.06em', background: planBadge.bg, color: planBadge.color, border: profile.plan === 'free' ? '1px solid var(--line)' : 'none' }}>{planBadge.label}</span>
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
              {profile.handicap != null && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>Hdcp {profile.handicap}</span>}
            </div>
          </div>
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.7, paddingTop: 10, borderTop: '1px solid var(--surf)', marginTop: 4 }}>{profile.bio}</div>
        )}

        {/* アクションボタン */}
        {!isMe && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleChat} style={{ flex: 1, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              チャットする
            </button>
            <button onClick={toggleFav} style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid var(--line)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {isFav ? Icons.heart(17, '#e05070', true) : Icons.heart(17, 'var(--mute)')}
            </button>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

        {/* メイン投稿（HOMEからクリック時） */}
        {featuredPost && (
          <div style={{ background: 'white', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
            <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.nickname?.[0]
                }
              </div>
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
              <button onClick={() => toggleLike(featuredPost.id, featuredPost.liked_by_me)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: featuredPost.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                {featuredPost.liked_by_me ? Icons.heart(14, '#e05070', true) : Icons.heart(14, 'var(--mute)')} {featuredPost.likes_count}
              </button>
              <button onClick={() => {
                if (!showModalComments) {
                  fetchModalComments(featuredPost.id)
                } else {
                  setShowModalComments(false)
                }
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: showModalComments ? 'var(--g2)' : 'var(--mute)' }}>
                💬 コメント
              </button>
            </div>
            {showModalComments && (
              <div style={{ padding: '8px 16px 12px' }}>
                {modalComments.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden' }}>
                      {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.profiles?.nickname?.[0] ?? '?'}
                    </div>
                    <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2 }}>{c.profiles?.nickname ?? 'ゴルファー'}</div>
                      <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
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
                  <button onClick={handleModalComment} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
                </div>
              </div>
            )}
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
                <div key={post.id} onClick={() => setSelectedPost(post)} style={{ aspectRatio: '1', background: post.photo_url ? 'transparent' : 'var(--surf)', overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--mute)' }}>
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
              <button onClick={() => { setSelectedPost(null); setModalComments([]); setModalCommentInput(''); setShowModalComments(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
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
                {selectedPost.liked_by_me ? '❤️' : '♡'} {selectedPost.likes_count}
              </button>
              <button onClick={() => {
                setShowModalComments(v => !v)
                if (!showModalComments) fetchModalComments(selectedPost.id)
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--mute)' }}>
                💬 コメント
              </button>
            </div>
            {showModalComments && (
              <div style={{ padding: '8px 16px' }}>
                {modalComments.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden' }}>
                      {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.profiles?.nickname?.[0] ?? '?'}
                    </div>
                    <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g1)', marginBottom: 2 }}>{c.profiles?.nickname ?? 'ゴルファー'}</div>
                      <div style={{ fontSize: 12, color: 'var(--txt)', lineHeight: 1.5 }}>{c.content}</div>
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
                  <button onClick={handleModalComment} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>送信</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
