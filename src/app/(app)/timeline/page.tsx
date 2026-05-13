'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface Post {
  id: string
  user_id: string
  caption: string | null
  photo_url: string | null
  post_type: string
  created_at: string
  profiles: {
    nickname: string
    avatar_url: string | null
    handicap: number
  }
  likes_count: number
  liked_by_me: boolean
  comments_count: number
}

export default function TimelinePage() {
  const router = useRouter()
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [showPostForm, setShowPostForm] = useState(false)
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const AVATAR_COLORS = [
    { bg: '#E8F0F8', text: '#3a6aaa' }, { bg: '#F2EBF8', text: '#7a50aa' },
    { bg: '#EBF5EB', text: '#3a7a3a' }, { bg: '#FFF5E8', text: '#c07020' },
    { bg: '#F8EBF0', text: '#aa3a6a' },
  ]

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      await fetchPosts(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const fetchPosts = async (userId: string) => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(nickname, avatar_url, handicap)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!data) return

    // いいね数・自分がいいねしたか取得
    const postsWithLikes = await Promise.all(data.map(async (post) => {
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      const { data: myLike } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', userId)
        .single()

      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      return {
        ...post,
        likes_count: likesCount ?? 0,
        liked_by_me: !!myLike,
        comments_count: commentsCount ?? 0,
      }
    }))

    setPosts(postsWithLikes)
  }

  const handleLike = async (postId: string, liked: boolean) => {
    if (!myId) return
    if (liked) {
      await supabase.from('post_likes').delete()
        .eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: myId })
    }
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked_by_me: !liked,
      likes_count: liked ? p.likes_count - 1 : p.likes_count + 1
    } : p))
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePost = async () => {
    if (!caption.trim() && !photo) return
    setPosting(true)

    let photoUrl: string | null = null

    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `rounds/${myId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('user-photos')
        .upload(path, photo, { upsert: true })

      if (!error) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(path)
        photoUrl = data.publicUrl
      }
    }

    await supabase.from('posts').insert({
      user_id: myId,
      caption: caption.trim() || null,
      photo_url: photoUrl,
      post_type: photo ? 'round_photo' : 'text',
    })

    setCaption('')
    setPhoto(null)
    setPhotoPreview(null)
    setShowPostForm(false)
    setPosting(false)
    await fetchPosts(myId)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'たった今'
    if (mins < 60) return `${mins}分前`
    if (hours < 24) return `${hours}時間前`
    return `${days}日前`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <button onClick={() => setShowPostForm(true)} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>＋ 投稿</button>
      </div>

      {/* 投稿フォーム */}
      {showPostForm && (
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>新しい投稿</div>
            <button onClick={() => { setShowPostForm(false); setCaption(''); setPhoto(null); setPhotoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--mute)' }}>✕</button>
          </div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="ラウンドの感想・スコアなど..."
            rows={3}
            style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', marginBottom: 10 }}
          />
          {photoPreview && (
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <img src={photoPreview} alt="preview" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 7, padding: '9px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer' }}>📷 写真を追加</button>
            <button onClick={handlePost} disabled={posting || (!caption.trim() && !photo)} style={{ flex: 1, background: posting ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 7, padding: '9px', fontSize: 12, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer' }}>
              {posting ? '投稿中...' : '投稿する'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>
      )}

      {/* タイムライン */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>まだ投稿がありません</div>
            <div style={{ fontSize: 12, color: 'var(--mute)' }}>ラウンドの写真やスコアを投稿しましょう！</div>
          </div>
        )}

        {posts.map((post, i) => {
          const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
          const profile = post.profiles as any
          return (
            <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '14px 16px' }}>
              {/* ユーザー情報 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  onClick={() => router.push(`/user/${post.user_id}`)}
                  style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: avatarColor.text, cursor: 'pointer', flexShrink: 0 }}>
                  {profile?.nickname?.[0] ?? '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    onClick={() => router.push(`/user/${post.user_id}`)}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', cursor: 'pointer' }}>
                    {profile?.nickname ?? 'ゴルファー'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>
                    Hdcp {profile?.handicap ?? '-'} · {timeAgo(post.created_at)}
                  </div>
                </div>
                {post.user_id !== myId && (
                  <button
                    onClick={() => router.push(`/user/${post.user_id}`)}
                    style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: 'var(--g2)', cursor: 'pointer', fontWeight: 600 }}>
                    プロフィール
                  </button>
                )}
              </div>

              {/* 写真 */}
              {post.photo_url && (
                <img src={post.photo_url} alt="post" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 320, objectFit: 'cover' }} />
              )}

              {/* キャプション */}
              {post.caption && (
                <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.6, marginBottom: 10 }}>{post.caption}</div>
              )}

              {/* アクション */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                  onClick={() => handleLike(post.id, post.liked_by_me)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: post.liked_by_me ? '#e05070' : 'var(--mute)', fontWeight: post.liked_by_me ? 600 : 400, padding: 0 }}>
                  {post.liked_by_me ? '❤️' : '♡'} {post.likes_count}
                </button>
                <button
                  onClick={() => router.push(`/timeline/${post.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--mute)', padding: 0 }}>
                  💬 {post.comments_count}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
