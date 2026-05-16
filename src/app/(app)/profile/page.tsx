'use client'
import React from 'react'
import { Icons } from '@/components/icons'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canSeeWhoLiked, canSeeWhoVisited, isPremium, type Plan } from '@/lib/plan'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

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
  { icon: 'user', label: 'プロフィール編集', path: '/profile/edit' },
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

interface Profile {
  nickname: string
  handicap: number
  best_score: number | null
  area_id: string | null
  plan: string
  created_at: string
  avatar_url: string | null
}


const getPlanBadge = (plan: Plan) => {
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'standard') return { label: 'STANDARD', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [whoLiked, setWhoLiked] = useState<any[]>([])
  const [whoVisited, setWhoVisited] = useState<any[]>([])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) setProfile(data)
      const plan = await getUserPlan()
      setUserPlan(plan)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const registerPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('このブラウザはプッシュ通知に対応していません')
      return
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('通知を許可してください')
        return
      }
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
      console.error('Push registration error:', error)
      alert('通知の設定に失敗しました')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getMemberDuration = (createdAt: string) => {
    const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months < 1) return '今月入会'
    return `会員歴 ${months}ヶ月`
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mute)', fontSize: 14 }}>読み込み中...</div></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '48px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Logo variant="screen" />
          <span style={{
            background: userPlan === 'premium'
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : userPlan === 'standard'
              ? 'linear-gradient(135deg, var(--g2), var(--g3))'
              : '#eef3ee',
            color: userPlan === 'premium' ? 'white'
              : userPlan === 'standard' ? 'white'
              : 'var(--mute)',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Inter',
            letterSpacing: '.06em',
            border: userPlan === 'free' ? '1px solid var(--line)' : 'none',
          }}>
            {userPlan === 'premium' ? 'PREMIUM' : userPlan === 'standard' ? 'STANDARD' : 'FREE'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div onClick={() => router.push('/profile/edit')} style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--g1)', border: '2px solid var(--line)', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profile?.nickname?.[0] ?? '?'
            }
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{profile?.nickname ?? 'ゴルファー'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{email} · {profile?.created_at ? getMemberDuration(profile.created_at) : ''}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        {[{ v: profile?.handicap?.toString() ?? '-', k: 'Hdcp' }, { v: profile?.best_score?.toString() ?? '-', k: 'ベスト' }, { v: '0', k: 'ラウンド' }].map((s) => (
          <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 11, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 12px', borderRadius: 1 }} />

      <div style={{ flex: 1, paddingBottom: 90 }}>
        {MENU_ITEMS.map((item) => (
          <div key={item.label} onClick={() => item.path === '/settings' ? registerPush() : router.push(item.path)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {SVG_ICONS[item.icon]}
                </svg>
              </div>
            <div style={{ fontSize: 13, color: 'var(--txt)' }}>{item.label}</div>
            <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
          </div>
        ))}

        {/* 区切り線 */}
        <div style={{ padding: '10px 20px 4px' }}>
          {/* プレミアム限定セクション */}
          {isPremium(userPlan) ? (
            <>
              <div style={{ padding: '16px 20px 8px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>プレミアム限定</div>

              {/* 足跡を見た人 */}
              <div style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--surf)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>👣</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>足跡を見た人</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 'auto' }}>{whoVisited.length}人</span>
                </div>
                {whoVisited.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--mute)', textAlign: 'center' }}>まだ足跡がありません</div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, padding: '12px 16px', overflowX: 'auto' }}>
                    {whoVisited.map((v: any) => {
                      const p = v.profiles
                      return (
                        <div key={v.visitor_id} onClick={() => router.push(`/user/${v.visitor_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                            {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p?.nickname?.[0] ?? '?'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--txt)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.nickname ?? '不明'}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* お気に入りしてくれた人 */}
              <div style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--surf)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>❤️</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>お気に入りしてくれた人</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)', marginLeft: 'auto' }}>{whoLiked.length}人</span>
                </div>
                {whoLiked.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--mute)', textAlign: 'center' }}>まだお気に入りがありません</div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, padding: '12px 16px', overflowX: 'auto' }}>
                    {whoLiked.map((l: any) => {
                      const p = l.profiles
                      return (
                        <div key={l.user_id} onClick={() => router.push(`/user/${l.user_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                            {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p?.nickname?.[0] ?? '?'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--txt)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.nickname ?? '不明'}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg, var(--g1), var(--g2))', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>👑 プレミアムプランで解放</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 12, lineHeight: 1.6 }}>足跡を見た人・お気に入りしてくれた人<br/>マッチング上位表示など</div>
              <button onClick={() => router.push('/subscription')} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>プレミアムにアップグレード</button>
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>法的情報</div>
        </div>

        {LEGAL_ITEMS.map((item) => (
          <div key={item.label} onClick={() => router.push(item.path)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {SVG_ICONS[item.icon]}
                </svg>
              </div>
            <div style={{ fontSize: 13, color: 'var(--txt)' }}>{item.label}</div>
            <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
          </div>
        ))}

        <div onClick={handleLogout} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, background: 'rgba(200,60,60,.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(200,60,60,.2)', fontSize: 14 }}>🚪</div>
          <div style={{ fontSize: 13, color: '#c05050' }}>ログアウト</div>
          <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
