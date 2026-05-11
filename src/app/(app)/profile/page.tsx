'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const MENU_ITEMS = [
  { icon: '👤', label: 'プロフィール編集', path: '/profile/edit' },
  { icon: '📅', label: '予約履歴', path: '/course' },
  { icon: '🏆', label: '参加コンペ一覧', path: '/comp' },
  { icon: '💳', label: 'サブスクリプション管理', path: '/subscription' },
  { icon: '⚙️', label: '設定・通知', path: '/settings' },
]

export default function ProfilePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '48px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Logo variant="screen" />
          <span style={{ background: 'var(--lime)', color: 'var(--g1)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>プレミアム会員</span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--lime)', border: '2px solid rgba(168,224,99,.3)', flexShrink: 0 }}>田</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>田中 太郎</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>広島市 · 会員歴 8ヶ月</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        {[{ v: '18', k: 'Hdcp' }, { v: '92', k: 'ベスト' }, { v: '24', k: 'ラウンド' }].map((s) => (
          <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 11, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 12px', borderRadius: 1 }} />
      <div style={{ flex: 1, paddingBottom: 90 }}>
        {MENU_ITEMS.map((item) => (
          <div key={item.label} onClick={() => router.push(item.path)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: 'var(--surf)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', fontSize: 14 }}>{item.icon}</div>
            <div style={{ fontSize: 13, color: 'var(--txt)' }}>{item.label}</div>
            <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
          </div>
        ))}
        <div onClick={() => router.push('/login')} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, background: 'rgba(200,60,60,.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(200,60,60,.2)', fontSize: 14 }}>🚪</div>
          <div style={{ fontSize: 13, color: '#c05050' }}>ログアウト</div>
          <div style={{ marginLeft: 'auto', color: 'var(--pale)', fontSize: 18 }}>›</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
