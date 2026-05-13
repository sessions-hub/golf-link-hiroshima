'use client'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'ホーム',
    path: '/home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--g2)' : 'var(--mute)'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    key: 'match',
    label: 'マッチング',
    path: '/match',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--g2)' : 'var(--mute)'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
        <path d="M21 21v-2a4 4 0 00-3-3.87"/>
      </svg>
    ),
  },
  {
    key: 'timeline',
    label: 'タイムライン',
    path: '/timeline',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--g2)' : 'var(--mute)'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21,15 16,10 5,21"/>
      </svg>
    ),
  },
  {
    key: 'gps',
    label: 'GPS',
    path: '/gps',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--g2)' : 'var(--mute)'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'マイページ',
    path: '/profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--g2)' : 'var(--mute)'} strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(255,255,255,0.97)',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      padding: '8px 0 26px',
      zIndex: 50,
      boxShadow: '0 -2px 16px rgba(13,61,43,.07)',
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.path)
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: isActive ? 1 : 0.4,
              transition: 'opacity 0.18s',
            }}
          >
            {item.icon(isActive)}
            <span style={{
              fontSize: 9,
              color: isActive ? 'var(--g2)' : 'var(--mute)',
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'Inter, sans-serif',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
