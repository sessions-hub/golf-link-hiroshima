'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface Profile {
  nickname: string
  handicap: number
  best_score: number | null
  user_id: string
  avatar_url: string | null
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

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
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

      // タイムライン投稿取得
      const { data: postData } = await supabase
        .from('posts')
        .select(`*, profiles(nickname, avatar_url, user_id)`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (postData) setPosts(postData as any)

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
      const fileName = `${user.id}/${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, photo, { contentType: photo.type, upsert: true })

      if (!uploadError) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { data: newPost } = await supabase.from('posts').insert({
      user_id: user.id,
      caption: caption.trim() || null,
      photo_url: photoUrl,
      post_type: photo ? 'round_photo' : 'text',
    }).select(`*, profiles(nickname, avatar_url, user_id)`).single()

    if (newPost) {
      setPosts(prev => [newPost as any, ...prev])
    }

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', paddingBottom: 90 }}>

      {/* グリーンヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo variant="screen" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowPostModal(true)} style={{ background: 'var(--lime)', border: 'none', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g1)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div onClick={() => router.push(`/user/${profile?.user_id}`)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--lime)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile?.nickname?.[0] ?? '?'
            }
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 12px' }}>
        {[
          { v: profile?.handicap?.toString() ?? '-', k: 'ハンデ' },
          { v: profile?.best_score?.toString() ?? '-', k: 'ベスト' },
          { v: '0', k: 'マッチ済み' },
        ].map((s) => (
          <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 11, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* ライムライン */}
      <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 12px', borderRadius: 1 }}/>

      {/* タイムライン */}
      <div style={{ padding: '0 0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 8px' }}>
        <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>タイムライン</span>
        <button onClick={() => setShowPostModal(true)} style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>＋ 投稿する</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📸</div>
          <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだ投稿がありません。最初の投稿をしてみましょう！</div>
        </div>
      )}

      {posts.map((post) => (
        <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              onClick={() => router.push(`/user/${post.user_id}`)}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--g2)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
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

      {/* 投稿モーダル */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>投稿する</div>
              <button onClick={() => { setShowPostModal(false); setCaption(''); setPhoto(null); setPhotoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--mute)' }}>×</button>
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
              <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--mid)', cursor: 'pointer' }}>
                📷 写真を追加
              </button>
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
