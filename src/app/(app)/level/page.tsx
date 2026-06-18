'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, LEVELS } from '@/lib/level'
import { AVATAR_CHARACTERS } from '@/lib/avatars'
import { PageLoading } from '@/components/LoadingDots'

const POINT_ACTIONS = [
  {
    label: '毎日ログイン',
    pt: 5,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    label: '投稿する',
    pt: 10,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  },
  {
    label: 'いいねする',
    pt: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    label: 'いいねを受け取る（自分の投稿に）',
    pt: 3,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e05070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    label: 'コメントする',
    pt: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    label: 'コメントを受け取る（自分の投稿に）',
    pt: 5,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    label: 'お気に入り登録（初回）',
    pt: 5,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
      </svg>
    ),
  },
  {
    label: 'フレンド成立（相互お気に入り）',
    pt: 20,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
        <path d="M21 21v-2a4 4 0 00-3-3.87"/>
      </svg>
    ),
  },
  {
    label: 'メッセージを始める',
    pt: 10,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22,2 15,22 11,13 2,9 22,2"/>
      </svg>
    ),
  },
  {
    label: 'GPSでコースを選択',
    pt: 50,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12"/>
      </svg>
    ),
  },
  {
    label: 'スコアを記録する',
    pt: 50,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
  {
    label: 'コンペに参加する（詳細ページから）',
    pt: 100,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
      </svg>
    ),
  },
  {
    label: 'コンペを主催する',
    pt: 300,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    label: 'ラウンド募集を作成する',
    pt: 100,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'プレミアムプランに加入',
    pt: 50,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'エグゼクティブプランに加入',
    pt: 100,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
        <path d="M5 20h14"/>
      </svg>
    ),
  },
]

export default function LevelPage() {
  const router = useRouter()
  const [totalPts, setTotalPts] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [pointsOpen, setPointsOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle()

      setTotalPts(data?.total_points ?? 0)
      setPageLoading(false)
    }
    init()
  }, [])

  if (pageLoading) return <PageLoading />

  const lv = getLevelInfo(totalPts)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', borderBottom: '1px solid var(--line)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--txt)', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>GLHレベルガイド</span>
      </div>

      {/* Description Card */}
      <div style={{ margin: '16px', background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="21"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <path d="M7 4h10l-1 7a5 5 0 01-10 0z"/>
            <path d="M5 4H2v2a4 4 0 004 4M19 4h3v2a4 4 0 01-4 4"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>GLH レベル</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--mid)', lineHeight: 1.8 }}>
          コミュニティの活性化を目的にアプリ内でのアクティビティをレベル別に表示しています。
        </p>
        <div style={{ background: 'var(--surf)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>
          レベルに応じて開放されるアバターや限定コンテンツ、プレゼント抽選など様々な企画をご用意。
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--surf)' }}>
          <div style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '.08em', marginBottom: 12 }}>GLHキャラクター</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {[
              { src: '/avatars/bear-black.png', name: 'Divo', read: 'ディボ' },
              { src: '/avatars/bear-cream.png', name: 'Rory', read: 'ローリー' },
            ].map((c) => (
              <div key={c.name} style={{ flex: 1, textAlign: 'center' }}>
                <img src={c.src} alt={c.name} style={{ height: 96, objectFit: 'contain', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,.12))' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--mute)' }}>
                  {[...c.read].map((ch, i) => ch === 'ー'
                    ? <span key={i} style={{ display: 'inline-block', transform: 'scaleX(0.72)' }}>ー</span>
                    : <span key={i}>{ch}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Levels List */}
      <div style={{ margin: '0 16px 16px', background: 'white', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 8px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>全レベル</div>
        {LEVELS.map((lvl, i) => {
          const isCurrent = lv.level === lvl.level
          const nextLvl = LEVELS[i + 1] as typeof LEVELS[number] | undefined
          const rangeStr = nextLvl
            ? `${lvl.minPt.toLocaleString()} 〜 ${(nextLvl.minPt - 1).toLocaleString()} pt`
            : `${lvl.minPt.toLocaleString()} pt 〜`
          const seen = new Set<string>()
          const levelAvatars = AVATAR_CHARACTERS.filter(
            c => c.minLevel === lvl.level && !seen.has(c.src) && (seen.add(c.src), true)
          )
          return (
            <div
              key={lvl.level}
              style={{
                padding: '12px 16px',
                borderBottom: i < LEVELS.length - 1 ? '1px solid var(--surf)' : 'none',
                background: isCurrent ? `${lvl.color}08` : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ border: `1.5px solid ${lvl.color}4d`, borderRadius: 9, padding: '5px 9px', background: `${lvl.color}0a`, textAlign: 'center', minWidth: 54, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: lvl.color, fontFamily: 'Inter' }}>Lv.{lvl.level}</div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: lvl.color, fontFamily: 'Inter', letterSpacing: '.06em', marginTop: 2 }}>{lvl.name}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--txt)', fontFamily: 'Inter' }}>{rangeStr}</div>
                </div>
                {isCurrent && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: lvl.color, background: `${lvl.color}15`, borderRadius: 4, padding: '3px 8px', border: `1px solid ${lvl.color}4d`, flexShrink: 0 }}>
                    現在
                  </div>
                )}
              </div>
              {levelAvatars.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {levelAvatars.map(c => (
                    <img
                      key={c.id}
                      src={c.src}
                      alt={c.name}
                      style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.12))' }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Point Earning Methods */}
      <details
        onToggle={(e) => setPointsOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{ margin: '0 16px 16px', background: 'white', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}
      >
        <summary style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', listStyle: 'none', borderBottom: '1px solid var(--surf)' }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>ポイント獲得方法</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round" style={{ transform: pointsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </summary>
        {POINT_ACTIONS.map((action, i) => (
          <div
            key={action.label}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < POINT_ACTIONS.length - 1 ? '1px solid var(--surf)' : 'none' }}
          >
            <div style={{ width: 32, height: 32, background: 'var(--surf)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', flexShrink: 0 }}>
              {action.icon}
            </div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--txt)' }}>{action.label}</div>
            <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)', flexShrink: 0 }}>+{action.pt}pt</div>
          </div>
        ))}
      </details>

    </div>
  )
}
