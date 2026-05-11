'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const GOLFERS = [
  { id: 1, name: '佐藤 健一', age: 42, hdcp: 18, freq: '週1〜2回', area: '南区', score: 94, color: '#E8F0F8', textColor: '#3a6aaa', initial: '佐', tags: ['週末希望', 'コンペ好き'] },
  { id: 2, name: '山田 由美', age: 35, hdcp: 24, freq: '月2〜3回', area: '西区', score: 87, color: '#F2EBF8', textColor: '#7a50aa', initial: '山', tags: ['平日OK', 'レッスン中'] },
  { id: 3, name: '鈴木 大輔', age: 51, hdcp: 10, freq: '週2回', area: '安佐南区', score: 79, color: '#EBF5EB', textColor: '#3a7a3a', initial: '鈴', tags: ['上級者', '早朝歓迎'] },
  { id: 4, name: '木村 誠司', age: 38, hdcp: 22, freq: '月1〜2回', area: '中区', score: 72, color: '#FFF5E8', textColor: '#c07020', initial: '木', tags: ['初心者歓迎'] },
]

const LESSONS = [
  { id: 1, name: '中村 浩二 プロ', desc: 'ドライバー · アプローチ改善専門', price: 8000, rating: 4.9, reviews: 128, initial: '中', color: '#0D3D2B', textColor: '#A8E063', badge: '空きあり', badgeColor: '#EBF4EF', badgeText: '#2E7D55' },
  { id: 2, name: '田中 ゴルフアカデミー', desc: '初心者〜中級者 · 少人数制', price: 5500, rating: 4.6, reviews: 89, initial: '田', color: '#EBF4EF', textColor: '#1A5C40', badge: '体験あり', badgeColor: '#EBF4EF', badgeText: '#8AADA0' },
  { id: 3, name: '小林 美香 プロ', desc: 'スコアアップ · メンタル強化', price: 9500, rating: 4.8, reviews: 56, initial: '小', color: '#F2EBF8', textColor: '#7a50aa', badge: '人気', badgeColor: '#A8E063', badgeText: '#0D3D2B' },
]

const FILTERS = ['全員', '初心者', '中級者', '週末希望', '90台']

export default function MatchPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'golfer' | 'lesson'>('golfer')
  const [activeFilter, setActiveFilter] = useState('全員')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'rgba(168,224,99,.8)', letterSpacing: '.08em' }}>広島市</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['golfer', 'lesson'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, fontFamily: 'Inter', color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent', transition: 'all 0.15s' }}>
            {tab === 'golfer' ? '⛳ ゴルファーを探す' : '📚 レッスン'}
          </button>
        ))}
      </div>

      {activeTab === 'golfer' && (
        <>
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: `1px solid ${activeFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: activeFilter === f ? 'var(--g2)' : 'var(--mid)', background: activeFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: activeFilter === f ? 600 : 400 }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            <div style={{ height: 8 }} />
            {GOLFERS.map((g) => (
              <div key={g.id} onClick={() => router.push('/chat')} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: g.textColor, flexShrink: 0 }}>{g.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600 }}>{g.name} <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400 }}>{g.age}歳</span></div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>Hdcp {g.hdcp} · {g.freq} · {g.area}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                      {g.tags.map((t) => (<span key={t} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{t}</span>))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: 700, color: 'var(--g2)', lineHeight: 1 }}>{g.score}<span style={{ fontSize: 12 }}>%</span></div>
                    <div style={{ fontSize: 8, color: 'var(--mute)' }}>マッチ度</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'lesson' && (
        <>
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['プロ個人', 'スクール', 'オンライン', '初心者向け'].map((f) => (
                <button key={f} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)', cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            <div style={{ height: 8 }} />
            {LESSONS.map((l) => (
              <div key={l.id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, display: 'flex', gap: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: l.textColor, flexShrink: 0 }}>{l.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{l.desc}</div>
                  <div style={{ fontSize: 11, color: '#A8E063', marginTop: 3 }}>{'★'.repeat(Math.floor(l.rating))} <span style={{ color: 'var(--mute)', fontSize: 10 }}>{l.rating}（{l.reviews}件）</span></div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 7, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>¥{l.price.toLocaleString()}/h</span>
                    <span style={{ background: l.badgeColor, color: l.badgeText, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{l.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
