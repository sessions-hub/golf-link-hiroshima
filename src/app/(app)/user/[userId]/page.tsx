'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import ShareButtons from '@/components/ShareButtons'

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

const FREQ_LABELS: Record<string, string> = {
  weekly_2plus: '週2回以上', weekly_1: '週1回', monthly_2_3: '月2〜3回', monthly_1: '月1回', rarely: 'たまに',
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'info'>('posts')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // プロフィール取得
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (prof) setProfile(prof)

      // 投稿取得
      const { data: postData } = await supabase
        .from('posts')
        .select('*, post_likes(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (postData) setPosts(postData)

      // お気に入り確認
      const { data: favData } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', userId)
        .single()
      setIsFav(!!favData)

      // 足跡を記録
      if (user.id !== userId) {
        await supabase.from('footprints').insert({
          user_id: user.id,
          target_id: userId,
        })
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
      await supabase.from('favorites').insert({
        user_id: myId, target_id: userId,
      })
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
      .select('id')
      .single()

    if (newRoom) router.push(`/chat/${newRoom.id}`)
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!myId) return
    if (liked) {
      await supabase.from('post_likes').delete()
        .eq('post_id', postId).eq('user_id', myId)
    } else {
      await supabase.from('post_likes').insert({
        post_id: postId, user_id: myId,
      })
    }
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked_by_me: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ))
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>読み込み中...</div></div>
  }

  if (!profile) {
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>ユーザーが見つかりません</div></div>
  }

  const isMe = myId === userId
  const zodiac = profile.birth_date ? ZODIAC_NAMES_JP[getZodiacSign(profile.birth_date)] : null
  const age = profile.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'white' }}>{profile.nickname}</div>
        {!isMe && (
          <button onClick={toggleFav} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: isFav ? '#e05070' : 'rgba(255,255,255,.5)', padding: '2px 4px' }}>
            {isFav ? '❤️' : '♡'}
          </button>
        )}
        {isMe && (
          <button onClick={() => router.push('/profile/edit')} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 7, padding: '6px 12px', fontSize: 11, color: 'white', cursor: 'pointer' }}>編集</button>
        )}
      </div>

      {/* プロフィールヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '0 16px 20px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {/* アバター */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: profile.avatar_url ? 'transparent' : 'rgba(255,255,255,.15)', border: '3px solid rgba(168,224,99,.4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'var(--lime)', flexShrink: 0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile.nickname?.[0]
              }
            </div>
            {profile.gender && (
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: profile.gender === 'male' ? '#4a90d9' : profile.gender === 'female' ? '#e06090' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', border: '2px solid var(--g1)' }}>
                {profile.gender === 'male' ? '♂' : profile.gender === 'female' ? '♀' : '⚧'}
              </div>
            )}
          </div>

          {/* 基本情報 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
              {age && `${age}歳`}{zodiac && ` · ${zodiac}`}{profile.blood_type && ` · ${profile.blood_type}型`}
            </div>
            {profile.plan !== 'free' && (
              <span style={{ background: 'var(--lime)', color: 'var(--g1)', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                {profile.plan === 'premium' ? 'プレミアム' : 'スタンダード'}
              </span>
            )}
          </div>
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 12, lineHeight: 1.7 }}>{profile.bio}</div>
        )}

        {/* アクションボタン */}
        {!isMe && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleChat} style={{ flex: 1, background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              💬 チャットする
            </button>
            <button onClick={toggleFav} style={{ width: 44, background: isFav ? 'rgba(200,60,100,.3)' : 'rgba(255,255,255,.12)', border: `1px solid ${isFav ? 'rgba(200,60,100,.5)' : 'rgba(255,255,255,.2)'}`, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
              {isFav ? '❤️' : '♡'}
            </button>
          </div>
        )}
      </div>

      {/* 統計 */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'var(--off)' }}>
        {[
          { v: profile.handicap?.toString() ?? '-', k: 'Hdcp' },
          { v: profile.best_score?.toString() ?? '-', k: 'ベスト' },
          { v: FREQ_LABELS[profile.round_freq] ?? '-', k: '頻度' },
        ].map((s) => (
          <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Inter', fontSize: s.k === '頻度' ? 12 : 22, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['posts', 'info'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '11px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'posts' ? '📸 投稿' : '📋 プロフィール'}
          </button>
        ))}
      </div>

      {/* 投稿一覧 */}
      {activeTab === 'posts' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
              <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>まだ投稿がありません</div>
              {isMe && <div style={{ fontSize: 12, color: 'var(--mute)' }}>ホーム画面から投稿してみましょう！</div>}
            </div>
          )}
          {posts.map((post) => (
            <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>
                  {profile.nickname?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{profile.nickname}</div>
                  <div style={{ fontSize: 10, color: 'var(--mute)' }}>{new Date(post.created_at).toLocaleDateString('ja-JP')}</div>
                </div>
              </div>
              {post.photo_url && (
                <img src={post.photo_url} alt="投稿画像" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 300, objectFit: 'cover' }} />
              )}
              {post.caption && <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.7, marginBottom: 10 }}>{post.caption}</div>}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <button onClick={() => toggleLike(post.id, post.liked_by_me)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: post.liked_by_me ? '#e05070' : 'var(--mute)' }}>
                  {post.liked_by_me ? '❤️' : '♡'} {post.likes_count}
                </button>
                <ShareButtons
                  url={`https://golflink-hiroshima.com/user/${userId}`}
                  text={post.caption ?? 'GLH.でゴルフ仲間を見つけよう！'}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* プロフィール詳細 */}
      {activeTab === 'info' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 90px' }}>
          {[
            { label: '年齢', value: age ? `${age}歳` : '-' },
            { label: '星座', value: zodiac ?? '-' },
            { label: '血液型', value: profile.blood_type ? `${profile.blood_type}型` : '-' },
            { label: 'ハンデキャップ', value: profile.handicap?.toString() ?? '-' },
            { label: 'ベストスコア', value: profile.best_score?.toString() ?? '-' },
            { label: 'ラウンド頻度', value: FREQ_LABELS[profile.round_freq] ?? '-' },
            { label: '希望曜日', value: profile.preferred_days?.map((d: string) => ({ mon:'月', tue:'火', wed:'水', thu:'木', fri:'金', sat:'土', sun:'日' }[d] ?? d)).join('・') || '-' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
