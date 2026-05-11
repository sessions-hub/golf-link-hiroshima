'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const COMPS = [
  { id: 1, date: '2025年5月18日（日）', name: 'GLH. 春季オープンコンペ 2025', course: '広島カントリークラブ', format: 'ストロークプレー', players: 27, max: 32, hdcp: '全Hdcp', fee: 6500, status: 'open', hot: true },
  { id: 2, date: '2025年6月1日（日）', name: 'GLH. 月例杯 6月大会', course: '広島若草CC', format: 'ダブルペリア', players: 0, max: 24, hdcp: '全Hdcp', fee: 5000, status: 'soon', hot: false },
  { id: 3, date: '2025年4月6日（日）', name: 'GLH. 春季開幕戦', course: '広島CC', format: 'ストロークプレー', players: 28, max: 28, hdcp: '全Hdcp', fee: 5000, status: 'done', hot: false },
]

export default function CompPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <button style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>＋ 主催する</button>
      </div>
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
      <BottomNav />
    </div>
  )
}
