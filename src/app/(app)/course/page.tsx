'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const COURSES = [
  { id: 1, name: '広島カントリークラブ', area: '広島市安佐北区', holes: 18, par: 72, price: 9200, status: 'open', times: ['7:30', '9:00', '10:30'], day: '土曜' },
  { id: 2, name: '広島若草カントリークラブ', area: '安佐北区', holes: 18, par: 72, price: 7800, status: 'few', times: ['6:45', '8:15'], day: '日曜' },
  { id: 3, name: '廿日市カントリークラブ', area: '廿日市市', holes: 18, par: 72, price: 8500, status: 'open', times: ['7:00', '8:30', '10:00'], day: '土曜' },
]

const COMPS = [
  { id: 1, date: '2025年5月18日（日）', name: 'GLH. 春季オープンコンペ 2025', course: '広島カントリークラブ', format: 'ストロークプレー', players: 27, max: 32, hdcp: '全Hdcp', fee: 6500, status: 'open', hot: true },
  { id: 2, date: '2025年6月1日（日）', name: 'GLH. 月例杯 6月大会', course: '広島若草CC', format: 'ダブルペリア', players: 0, max: 24, hdcp: '全Hdcp', fee: 5000, status: 'soon', hot: false },
  { id: 3, date: '2025年4月6日（日）', name: 'GLH. 春季開幕戦', course: '広島CC', format: 'ストロークプレー', players: 28, max: 28, hdcp: '全Hdcp', fee: 5000, status: 'done', hot: false },
]

const COURSE_FILTERS = ['今週末', '平日格安', '2名〜', '早朝']

export default function CoursePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'course' | 'comp'>('course')
  const [courseFilter, setCourseFilter] = useState('今週末')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* グリーンヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        {activeTab === 'comp' && (
          <button style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>＋ 主催する</button>
        )}
        {activeTab === 'course' && (
          <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: 'white' }}>ゴルフ場予約</span>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['course', 'comp'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'course' ? '⛳ ゴルフ場予約' : '🏆 コンペ'}
          </button>
        ))}
      </div>

      {/* ゴルフ場予約タブ */}
      {activeTab === 'course' && (
        <>
          <div style={{ background: 'white', padding: '10px 16px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span style={{ fontSize: 13, color: 'var(--mute)' }}>エリア・コース名で検索</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {COURSE_FILTERS.map((f) => (
                <button key={f} onClick={() => setCourseFilter(f)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: `1px solid ${courseFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: courseFilter === f ? 'var(--g2)' : 'var(--mid)', background: courseFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: courseFilter === f ? 600 : 400 }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
            {COURSES.map((c) => (
              <div key={c.id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div style={{ height: 84, background: 'var(--g1)', position: 'relative', overflow: 'hidden' }}>
                  <svg width="100%" height="84" viewBox="0 0 358 84">
                    <rect width="358" height="84" fill="#0D3D2B"/>
                    <ellipse cx="100" cy="65" rx="90" ry="28" fill="#1A5C40"/>
                    <ellipse cx="270" cy="58" rx="70" ry="22" fill="#1A5C40"/>
                    <circle cx="179" cy="32" r="4" fill="rgba(255,255,255,.6)"/>
                    <line x1="179" y1="36" x2="179" y2="55" stroke="#8d6e63" strokeWidth="2"/>
                    <polygon points="179,20 190,32 179,44" fill="#A8E063" opacity="0.9"/>
                    <line x1="0" y1="0" x2="0" y2="84" stroke="#A8E063" strokeWidth="5"/>
                    <text x="16" y="18" fontFamily="Inter" fontSize="10" fill="rgba(168,224,99,.85)" fontWeight="600" letterSpacing="1">{c.day} {c.times[0]}</text>
                  </svg>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{c.area} · {c.holes}H · Par{c.par}</div>
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>¥{c.price.toLocaleString()}〜</div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 9, alignItems: 'center' }}>
                    <span style={{ background: c.status === 'few' ? 'var(--lime)' : 'var(--surf)', color: c.status === 'few' ? 'var(--g1)' : 'var(--g3)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: c.status !== 'few' ? '1px solid var(--line)' : 'none' }}>
                      {c.status === 'few' ? '残2枠' : '空きあり'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--mute)' }}>{c.day} {c.times.join(' / ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* コンペタブ */}
      {activeTab === 'comp' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
          {COMPS.map((c) => (
            <div key={c.id} style={{ margin: '0 16px 10px', borderRadius: 12, padding: 15, cursor: 'pointer', border: c.hot ? '1px solid rgba(168,224,99,.35)' : '1px solid var(--line)', background: c.hot ? 'rgba(168,224,99,.04)' : 'white', boxShadow: '0 2px 8px rgba(13,61,43,.05)', opacity: c.status === 'done' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'Inter' }}>{c.date}</div>
                <span style={{ background: c.status === 'open' ? 'var(--lime)' : 'var(--surf)', color: c.status === 'open' ? 'var(--g1)' : 'var(--mute)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: c.status !== 'open' ? '1px solid var(--line)' : 'none' }}>
                  {c.status === 'open' ? '募集中' : c.status === 'soon' ? '受付前' : '終了'}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginTop: 2 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{c.course} · {c.format}</div>
              {c.status !== 'done' && (
                <>
                  <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,var(--line),transparent)', margin: '10px 0' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: c.players, k: '参加者' }, { v: c.hdcp, k: '対象' }, { v: `¥${c.fee.toLocaleString()}`, k: '参加費' }].map((s) => (
                      <div key={s.k} style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: 8, textAlign: 'center', border: '1px solid var(--line)' }}>
                        <div style={{ fontFamily: 'Inter', fontSize: s.k === '参加者' ? 20 : 14, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: 'var(--mute)' }}>{s.k}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, textAlign: 'right', fontSize: 10, color: 'var(--mute)' }}>残{c.max - c.players}枠 / {c.max}名定員</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
