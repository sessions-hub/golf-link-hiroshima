'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

export default function HomePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', paddingBottom: 90 }}>

      {/* グリーンヘッダー - 他ページと統一 */}
      <div style={{
        background: 'var(--g1)',
        padding: '52px 20px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Logo variant="screen" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div onClick={() => router.push('/profile')} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--lime)',
            cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
          }}>田</div>
        </div>
      </div>

      {/* ヒーローカード */}
      <div onClick={() => router.push('/match')} style={{ margin: '10px 16px 12px', background: 'var(--g1)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(13,61,43,.22)', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,224,99,.18) 0%,transparent 70%)' }}/>
        <div style={{ fontSize: 10, color: 'rgba(168,224,99,.65)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 4 }}>あなたの近くのゴルファー</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>15人がマッチング待ち</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>広島市内 · 今週末空きあり</div>
        <button style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>マッチングを見る →</button>
      </div>

      {/* GPS カード */}
      <div onClick={() => router.push('/gps')} style={{ margin: '0 16px 12px', background: 'linear-gradient(135deg,#0a1f0a,#1a3a1a)', borderRadius: 14, padding: 16, border: '1px solid rgba(168,224,99,.2)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(168,224,99,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,224,99,.25)', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>GPS距離計測</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>グリーンまでの距離をリアルタイム計測</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(168,224,99,.5)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
        </div>
      </div>

      {/* 統計 */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {[{ v: '18', k: 'ハンデ' }, { v: '14', k: 'ラウンド' }, { v: '6', k: 'マッチ済み' }].map((s) => (
          <div key={s.k} style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: 11, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* ライムライン */}
      <div style={{ height: 2, background: 'linear-gradient(90deg,var(--g3),var(--lime))', margin: '0 16px 12px', borderRadius: 1 }}/>

      {/* おすすめ */}
      <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>今週のおすすめ</span>
        <span style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push('/course')}>すべて見る</span>
      </div>

      <div onClick={() => router.push('/course')} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⛳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600 }}>広島カントリークラブ</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>土曜 7:30 · 2名空きあり</div>
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>¥9,200</div>
        </div>
      </div>

      <div onClick={() => router.push('/comp')} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600 }}>GL春季オープンコンペ</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>5/18 · 残り5枠</div>
          </div>
          <span style={{ background: 'var(--lime)', color: 'var(--g1)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>募集中</span>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
