'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const COURSES = [
  { id: 1, name: '広島カントリークラブ', area: '広島市安佐北区', holes: 18, par: 72, dist: 3.2 },
  { id: 2, name: '広島若草カントリークラブ', area: '安佐北区', holes: 18, par: 72, dist: 5.8 },
  { id: 3, name: '廿日市カントリークラブ', area: '廿日市市', holes: 18, par: 72, dist: 12.4 },
]

export default function GpsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)
  const [hole, setHole] = useState(1)
  const [dist, setDist] = useState({ front: 168, center: 182, back: 196 })

  useEffect(() => {
    if (selected === null) return
    const timer = setInterval(() => {
      const jitter = Math.round((Math.random() - 0.5) * 6)
      setDist({ front: 168 + jitter, center: 182 + jitter, back: 196 + jitter })
    }, 2000)
    return () => clearInterval(timer)
  }, [selected])

  const getClub = (y: number) => {
    if (y >= 200) return '3W'
    if (y >= 185) return '5W'
    if (y >= 170) return '4番I'
    if (y >= 158) return '5番I'
    if (y >= 145) return '6番I'
    if (y >= 133) return '7番I'
    if (y >= 120) return '8番I'
    if (y >= 108) return '9番I'
    return 'PW'
  }

  if (selected === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Logo variant="screen" />
          <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>GPS距離計測</span>
        </div>
        <div style={{ background: 'rgba(13,61,43,.9)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>GPS接続中 — 現在地を取得しました</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(168,224,99,.6)', fontFamily: 'Inter' }}>精度 ±3m</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 90px' }}>
          <div style={{ padding: '0 16px 8px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: 'Inter' }}>近くのゴルフ場</div>
          {COURSES.map((c) => (
            <div key={c.id} onClick={() => setSelected(c.id)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⛳</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{c.area} · {c.holes}H · Par{c.par}</div>
                  <div style={{ fontSize: 10, color: 'var(--g3)', marginTop: 3 }}>📍 現在地から {c.dist}km</div>
                </div>
                {c.dist < 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(168,224,99,.12)', border: '1px solid rgba(168,224,99,.3)', borderRadius: 10, padding: '3px 8px', flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 9, color: 'var(--lime)', fontFamily: 'Inter' }}>近い</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  const course = COURSES.find(c => c.id === selected)!

  return (
    <div style={{ minHeight: '100vh', background: '#070f07', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 390 600" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
          <rect width="390" height="600" fill="#080f08"/>
          <path d="M130 600 Q124 500 140 400 Q155 300 145 220 Q135 148 158 106 Q170 80 185 70 Q200 62 205 61 Q210 62 225 72 Q250 90 238 148 Q226 208 240 290 Q254 370 244 460 Q238 520 240 600Z" fill="#1c3e10" opacity="0.82"/>
          <ellipse cx="200" cy="78" rx="46" ry="30" fill="#1d5612"/>
          <ellipse cx="200" cy="78" rx="38" ry="24" fill="#246c18"/>
          <circle cx="200" cy="78" r="4" fill="rgba(255,255,255,.8)"/>
          <line x1="200" y1="82" x2="200" y2="98" stroke="#608040" strokeWidth="1.5"/>
          <polygon points="200,62 214,74 200,86" fill="#A8E063" opacity="0.95"/>
          <line x1="200" y1="490" x2="200" y2="84" stroke="rgba(168,224,99,0.2)" strokeWidth="1" strokeDasharray="5,4"/>
          <circle cx="200" cy="490" r="18" fill="rgba(168,224,99,0.08)" stroke="rgba(168,224,99,0.28)" strokeWidth="1.2"/>
          <circle cx="200" cy="490" r="7" fill="#A8E063"/>
          <circle cx="200" cy="490" r="3" fill="rgba(0,0,0,.85)"/>
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '52px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg,rgba(0,0,0,.72) 0%,transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ background: 'rgba(168,224,99,.25)', border: '1px solid rgba(168,224,99,.5)', borderRadius: 20, padding: '2px 9px', fontSize: 9, color: '#C5F08A', fontFamily: 'Inter', fontWeight: 600 }}>HOLE {hole}</div>
                <div style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>Par 5 · 520y</div>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.42)', marginTop: 1 }}>{course.name}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#A8E063', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,.65)' }}>GPS ±3m</span>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, background: 'white', borderRadius: '18px 18px 0 0', padding: '16px 14px 16px', boxShadow: '0 -8px 32px rgba(0,0,0,.25)', borderTop: '2px solid rgba(168,224,99,.2)' }}>
          <div style={{ width: 32, height: 2.5, background: 'linear-gradient(90deg,var(--g3),var(--lime))', borderRadius: 2, margin: '0 auto 13px' }} />
          <div style={{ display: 'flex', gap: 5, marginBottom: 13, overflowX: 'auto' }}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((h) => (
              <button key={h} onClick={() => setHole(h)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: hole === h ? 'var(--g1)' : 'var(--surf)', color: hole === h ? 'var(--lime)' : 'var(--mute)', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, boxShadow: hole === h ? '0 2px 8px rgba(13,61,43,.25)' : 'none' }}>{h}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 11 }}>
            <div>
              <div style={{ fontSize: 8, color: 'var(--mute)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 2 }}>グリーン センター</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 700, color: 'var(--g1)', lineHeight: 1, letterSpacing: '-.03em' }}>{dist.center}</span>
                <span style={{ fontFamily: 'Inter', fontSize: 17, color: 'var(--g3)', opacity: .7, fontWeight: 500 }}>y</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--pale)', marginTop: 1 }}>GPS精度 ±3m</div>
            </div>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderLeft: '2.5px solid var(--g3)', borderRadius: 7, padding: '9px 13px', textAlign: 'center' }}>
              <div style={{ fontSize: 7, color: 'var(--mute)', letterSpacing: '.1em', fontFamily: 'Inter' }}>推奨クラブ</div>
              <div style={{ fontFamily: 'Inter', fontSize: 19, fontWeight: 700, color: 'var(--g1)', marginTop: 2 }}>{getClub(dist.center)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { label: 'FRONT', val: dist.front, color: '#3a7a3a', bg: 'var(--off)', border: 'var(--line)' },
              { label: 'CENTER', val: dist.center, color: 'var(--g1)', bg: 'rgba(13,61,43,.06)', border: 'rgba(13,61,43,.18)' },
              { label: 'BACK', val: dist.back, color: '#c05050', bg: 'var(--off)', border: 'var(--line)' },
            ].map((d) => (
              <div key={d.label} style={{ flex: 1, background: d.bg, borderRadius: 6, padding: 7, textAlign: 'center', border: `1px solid ${d.border}` }}>
                <div style={{ fontSize: 7, color: 'var(--mute)', letterSpacing: '.1em', fontFamily: 'Inter' }}>{d.label}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: d.color }}>{d.val}</div>
                <div style={{ fontSize: 7, color: 'var(--pale)' }}>y</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
