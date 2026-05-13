'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getZodiacSign, ZODIAC_NAMES_JP } from '@/lib/zodiac'
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
}

interface Post {
  id: string
  caption: string | null
  photo_url: string | null
  created_at: string
  likes_count: number
}

const FREQ_LABELS: Record<string, string> = {
  weekly_2plus: '週2回以上', weekly_1: '週1回', monthly_2_3: '月2〜3回', monthly_1: '月1回', rarely: 'たまに',
}

const DAY_LABELS: Record<string, string> = {
  mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日',
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [myId, setMyId] = useState('')
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'info'>('posts')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // プロフィール取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (profileData) setProfile(profileData)

      // 投稿取得
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (postsData) {
        const withLikes = await Promise.all(postsData.map(async (post) => {
          const { count } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
          return { ...post, likes_count: count ?? 0 }
        }))
        setPosts(withLikes)
      }

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
      await supabase.from('favorites').delete().eq('user_id', myId).eq('target_id', userId)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({ user_id: myId, target_id: userId })
      setIsFav(true)
    }
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

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>読み込み中...</div></div>
  }

  if (!profile) {
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>ユーザーが見つかりません</div></div>
  }

  const zodiacSign = profile.birth_date ? getZodiacSign(profile.birth_date) : null
  const age = profile.birth_date ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear() : null
  const isMe = myId === userId

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', flex: 1 }}>プロフィール</div>
          {!isMe && (
            <button onClick={toggleFav} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: isFav ? '#ff6080' : 'rgba(255,255,255,.4)' }}>
              {isFav ? '❤️' : '♡'}
            </button>
          )}
        </div>

        {/* アバター・名前 */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--lime)', border: '2px solid rgba(168,224,99,.3)' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : profile.nickname?.[0] ?? '?'
              }
            </div>
            {profile.gender && (
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: profile.gender === 'male' ? '#4a90d9' : profile.gender === 'female' ? '#e06090' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', border: '2px solid rgba(13,61,43,1)' }}>
                {profile.gender === 'male' ? '♂' : profile.gender === 'female' ? '♀' : '⚧'}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
              {age && `${age}歳`}{age && zodiacSign && ' · '}{zodiacSign && ZODIAC_NAMES_JP[zodiacSign]}
            </div>
            {profile.bio && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.6 }}>{profile.bio}</div>}
          </div>
        </div>

        {/* 統計 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {[
            { v: profile.handicap, k: 'Hdcp' },
            { v: profile.best_score ?? '-', k: 'ベスト' },
            { v: posts.length, k: '投稿' },
          ].map((s) => (
            <div key={s.k} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: 'var(--lime)' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* アクションボタン */}
      {!isMe && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--line)' }}>
          <button onClick={handleChat} style={{ flex: 1, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            💬 チャットする
          </button>
          <button onClick={toggleFav} style={{ background: isFav ? 'rgba(200,60,100,.1)' : 'var(--surf)', color: isFav ? '#c05080' : 'var(--mid)', border: `1px solid ${isFav ? 'rgba(200,60,100,.3)' : 'var(--line)'}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {isFav ? '❤️ 解除' : '♡ お気に入り'}
          </button>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--line)' }}>
        {(['posts', 'info'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'posts' ? '📸 投稿' : '📋 プロフィール'}
          </button>
        ))}
      </div>

      {/* 投稿タブ */}
      {activeTab === 'posts' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
              <div style={{ fontSize: 14, color: 'var(--mute)' }}>まだ投稿がありません</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, padding: 2 }}>
            {posts.filter(p => p.photo_url).map((post) => (
              <div key={post.id} onClick={() => router.push(`/timeline/${post.id}`)} style={{ aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 4 }}>
                <img src={post.photo_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
          {posts.filter(p => !p.photo_url).map((post) => (
            <div key={post.id} style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '12px 16px' }}>
              <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.6, marginBottom: 6 }}>{post.caption}</div>
              <div style={{ fontSize: 10, color: 'var(--mute)' }}>❤️ {post.likes_count}</div>
            </div>
          ))}
        </div>
      )}

      {/* プロフィールタブ */}
      {activeTab === 'info' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 90px' }}>
          {[
            { label: '血液型', value: `${profile.blood_type}型` },
            { label: '星座', value: zodiacSign ? ZODIAC_NAMES_JP[zodiacSign] : '-' },
            { label: 'ハンデキャップ', value: profile.handicap },
            { label: 'ベストスコア', value: profile.best_score ?? '-' },
            { label: 'ラウンド頻度', value: FREQ_LABELS[profile.round_freq] ?? '-' },
            { label: '希望曜日', value: profile.preferred_days?.map(d => DAY_LABELS[d]).join('・') || '-' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
