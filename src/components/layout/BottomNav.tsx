'use client'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'ホーム',
    path: '/home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    key: 'match',
    label: 'マッチング',
    path: '/match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
        <path d="M21 21v-2a4 4 0 00-3-3.87"/>
      </svg>
    ),
  },
  {
    key: 'gps',
    label: 'GPS計測',
    path: '/gps',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
  },
  {
    key: 'course',
    label: '予約',
    path: '/course',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'comp',
    label: 'コンペ',
    path: '/comp',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <polyline points="18,8 18,2 6,2 6,8"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8" rx="2"/>
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
              opacity: isActive ? 1 : 0.32,
              transition: 'opacity 0.18s',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={isActive ? 'var(--g2)' : 'var(--mid)'}
              strokeWidth={isActive ? '2.5' : '2'}
              strokeLinecap="round"
              style={{ width: 22, height: 22 }}
            >
              {item.icon.props.children}
            </svg>
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
