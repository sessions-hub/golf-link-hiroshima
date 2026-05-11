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

const FILTERS = ['今週末', '平日格安', '2名〜', '早朝']

export default function CoursePage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('今週末')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: 'white' }}>ゴルフ場予約</span>
      </div>
      <div style={{ background: 'white', padding: '10px 16px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span style={{ fontSize: 13, color: 'var(--mute)' }}>エリア・コース名で検索</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: `1px solid ${activeFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: activeFilter === f ? 'var(--g2)' : 'var(--mid)', background: activeFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: activeFilter === f ? 600 : 400 }}>{f}</button>
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
      <BottomNav />
    </div>
  )
}
