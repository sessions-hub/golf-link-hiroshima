'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const MENU_ITEMS = [
  { icon: '👤', label: 'プロフィール編集', path: '/profile/edit' },
  { icon: '📅', label: '予約履歴', path: '/course' },
  { icon: '🏆', label: '参加コンペ一覧', path: '/comp' },
  { icon: '💳', label: 'サブスクリプション管理', path: '/subscription' },
  { icon: '🔔', label: 'プッシュ通知を設定', path: '/settings' },
]

const LEGAL_ITEMS = [
  { icon: '📋', label: '利用規約', path: '/legal/terms' },
  { icon: '🔒', label: 'プライバシーポリシー', path: '/legal/privacy' },
  { icon: '🏪', label: '特定商取引法に基づく表記', path: '/legal/tokusho' },
]

interface Profile {
  nickname: string
  handicap: number
  best_score: number | null
  area_id: string | null
  plan: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) setProfile(data)
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
      <div style={{ background: 'var(--g1)', padding: '48px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Logo variant="screen" />
          <span style={{ background: profile?.plan === 'premium' ? 'var(--lime)' : profile?.plan === 'standard' ? 'rgba(168,224,99,.3)' : 'rgba(255,255,255,.15)', color: profile?.plan === 'premium' ? 'var(--g1)' : 'rgba(255,255,255,.8)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
            {profile?.plan === 'premium' ? 'プレミアム会員' : profile?.plan === 'standard' ? 'スタンダード会員' : '無料会員'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--lime)', border: '2px solid rgba(168,224,99,.3)', flexShrink: 0 }}>
            {profile?.nickname?.[0] ?? '?'}
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
            <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', fontSize: 14 }}>{item.icon}</div>
            <div style={{ fontSize: 13, color: 'var(--txt)' }}>{item.label}</div>
            <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
          </div>
        ))}

        {/* 区切り線 */}
        <div style={{ padding: '10px 20px 4px' }}>
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>法的情報</div>
        </div>

        {LEGAL_ITEMS.map((item) => (
          <div key={item.label} onClick={() => router.push(item.path)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', fontSize: 14 }}>{item.icon}</div>
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
