'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, type Plan } from '@/lib/plan'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface Profile {
  nickname: string
  handicap: number
  best_score: number | null
  user_id: string
  avatar_url: string | null
}

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

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  post_type: string
  created_at: string
  likes_count: number
  liked_by_me: boolean
  profiles: Profile
}

const getPlanBadge = (plan: string) => {
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'standard') return { label: 'STANDARD', bg: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' }
  return { label: 'FREE', bg: '#eef3ee', color: '#7a9a7a' }
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [activeTab, setActiveTab] = useState<'home' | 'timeline'>('home')
  const [showPostModal, setShowPostModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [myUserId, setMyUserId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, handicap, best_score, user_id, avatar_url')
        .eq('user_id', user.id)
        .single()
      if (prof) setProfile(prof)
      const plan = await getUserPlan()
      setUserPlan(plan)
      setMyUserId(user.id)

      // チャット一覧取得（未読あり・最新3件）
      const { data: chatData } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(3)

      if (chatData) {
        const roomsWithProfiles = await Promise.all(chatData.map(async (room) => {
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
        setChatRooms(roomsWithProfiles)
      }

      const { data: postData } = await supabase
        .from('posts')
        .select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id)`)
        .order('created_at', { ascending: false })
        .limit(30)
      const { data: postData2, error: postError2 } = await supabase
        .from('posts')
        .select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id)`)
        .order('created_at', { ascending: false })
        .limit(30)
      console.log('Posts fetched:', postData2?.length, 'Error:', postError2)
      if (postData2) setPosts(postData2 as any)

      setLoading(false)
    }
    fetchData()
  }, [])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
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
    }).select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id)`).single()
    if (postError) {
      console.error('Post error:', postError)
      setPosting(false)
      return
    }

    // 投稿後にDBから再取得
    const { data: refreshedPosts } = await supabase
      .from('posts')
      .select(`*, profiles!posts_user_id_fkey(nickname, avatar_url, user_id)`)
      .order('created_at', { ascending: false })
      .limit(30)
    if (refreshedPosts) setPosts(refreshedPosts as any)

    setCaption('')
    setPhoto(null)
    setPhotoPreview(null)
    setShowPostModal(false)
    setPosting(false)
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* グリーンヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {activeTab === 'timeline' && (
            <button onClick={() => setShowPostModal(true)} style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 7, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
          <div onClick={() => router.push('/profile')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--g1)', cursor: 'pointer', border: '1px solid var(--line)', overflow: 'hidden' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile?.nickname?.[0] ?? '?'
            }
          </div>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['home', 'timeline'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '11px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'home' ? '🏠 ホーム' : '📸 タイムライン'}
          </button>
        ))}
      </div>

      {/* ホームタブ */}
      {activeTab === 'home' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

          {/* 統計 */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px 10px' }}>
            {[
              { v: profile?.handicap?.toString() ?? '-', k: 'ハンデ' },
              { v: profile?.best_score?.toString() ?? '-', k: 'ベスト' },
              { v: '0', k: 'マッチ済み' },
            ].map((s) => (
              <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 10, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
              </div>
            ))}
          </div>

          {/* マッチング待ちカード */}
          <div onClick={() => router.push('/match')} style={{ margin: '0 16px 10px', background: 'var(--g1)', borderRadius: 14, padding: 16, position: 'relative', overflow: 'hidden', boxShadow: '0 6px 20px rgba(13,61,43,.2)', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,224,99,.18) 0%,transparent 70%)' }}/>
            <div style={{ fontSize: 10, color: 'rgba(168,224,99,.65)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 4 }}>あなたの近くのゴルファー</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 4 }}>マッチングを探す</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>広島市内 · 今週末空きあり</div>
            <button style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>マッチングを見る →</button>
          </div>

          {/* GPS カード */}
          <div onClick={() => router.push('/gps')} style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg,#0a1f0a,#1a3a1a)', borderRadius: 12, padding: 14, border: '1px solid rgba(168,224,99,.2)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(168,224,99,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,224,99,.25)', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2 }}>GPS距離計測</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>グリーンまでの距離をリアルタイム計測</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(168,224,99,.5)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          </div>

          {/* ライムライン */}
          <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 10px', borderRadius: 1 }}/>

          {/* 新着チャット */}
          {chatRooms.length > 0 && (
            <>
              <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'Inter' }}>新着チャット</span>
                <span onClick={() => router.push('/chat')} style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, cursor: 'pointer' }}>すべて見る</span>
              </div>
              {chatRooms.map((room) => {
                const unread = room.user1_id === myUserId ? room.unread_count_user1 : room.unread_count_user2
                const time = new Date(room.last_message_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
                return (
                  <div key={room.id} onClick={() => router.push(`/chat/${room.id}`)} style={{ margin: '0 16px 8px', background: 'white', borderRadius: 12, border: `1px solid ${unread > 0 ? 'rgba(224,80,112,.25)' : 'var(--line)'}`, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--g1)', overflow: 'hidden' }}>
                        {room.other_user.avatar_url
                          ? <img src={room.other_user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : room.other_user.nickname?.[0] ?? '?'
                        }
                      </div>
                      {unread > 0 && (
                        <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#e05070', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', border: '2px solid white' }}>
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 600, color: 'var(--txt)' }}>{room.other_user.nickname}</div>
                        <div style={{ fontSize: 10, color: 'var(--mute)' }}>{time}</div>
                      </div>
                      <div style={{ fontSize: 12, color: unread > 0 ? 'var(--txt)' : 'var(--mute)', fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.last_message ?? 'チャットを始めましょう'}
                      </div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                  </div>
                )
              })}
              <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 10px', borderRadius: 1 }}/>
            </>
          )}

          {/* おすすめタイムライン（サムネイルグリッド） */}
          <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>タイムライン</span>
            <span onClick={() => setActiveTab('timeline')} style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, cursor: 'pointer' }}>すべて見る</span>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
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
                  {post.likes_count > 0 && (
                    <div style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 9, color: 'white', background: 'rgba(0,0,0,.4)', borderRadius: 4, padding: '1px 4px' }}>❤️ {post.likes_count}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* タイムラインタブ */}
      {activeTab === 'timeline' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

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

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            {loading && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

            {!loading && filteredPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📸</div>
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>{searchQuery ? '検索結果がありません' : 'まだ投稿がありません'}</div>
                {!searchQuery && (
                  <button onClick={() => setShowPostModal(true)} style={{ marginTop: 12, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 7, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>最初の投稿をする</button>
                )}
              </div>
            )}

            {filteredPosts.map((post) => (
              <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div onClick={() => router.push(`/user/${post.user_id}`)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--g2)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                    {post.profiles?.avatar_url
                      ? <img src={post.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : post.profiles?.nickname?.[0] ?? '?'
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div onClick={() => router.push(`/user/${post.user_id}`)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', cursor: 'pointer' }}>{post.profiles?.nickname ?? 'ゴルファー'}</div>
                    <div style={{ fontSize: 10, color: 'var(--mute)' }}>{new Date(post.created_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                </div>
                {post.photo_url && (
                  <img src={post.photo_url} alt="投稿" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                )}
                {post.caption && (
                  <div style={{ padding: '10px 16px 6px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7 }}>{post.caption}</div>
                )}
                <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 14 }}>
                  <button onClick={() => toggleLike(post.id, post.liked_by_me)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: post.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                    {post.liked_by_me ? '❤️' : '♡'} {post.likes_count}
                  </button>
                </div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--mid)', cursor: 'pointer' }}>📷 写真を追加</button>
              <button onClick={handlePost} disabled={posting || (!caption.trim() && !photo)} style={{ flex: 1, background: posting || (!caption.trim() && !photo) ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer' }}>
                {posting ? '投稿中...' : '投稿する'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
