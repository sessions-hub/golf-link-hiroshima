'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canUseGPS, type Plan } from '@/lib/plan'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const PARS = [4,3,5,4,4,3,5,4,4, 4,3,5,4,4,3,5,4,4]

export default function ScorePage() {
  const router = useRouter()
  const supabase = createClient()
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [scores, setScores] = useState<number[]>(Array(18).fill(0))
  const [courseName, setCourseName] = useState('')
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [view, setView] = useState<'input' | 'history'>('input')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const plan = await getUserPlan()
      setUserPlan(plan)
      const { data } = await supabase
        .from('scorecards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setHistory(data)
    }
    init()
  }, [])

  const updateScore = (hole: number, val: number) => {
    if (val < 1 || val > 15) return
    setScores(prev => { const n = [...prev]; n[hole] = val; return n })
  }

  const outTotal = scores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = scores.slice(9, 18).reduce((a, b) => a + b, 0)
  const total = outTotal + inTotal
  const outPar = PARS.slice(0, 9).reduce((a, b) => a + b, 0)
  const inPar = PARS.slice(9, 18).reduce((a, b) => a + b, 0)
  const totalPar = outPar + inPar

  const scoreColor = (score: number, par: number) => {
    if (score === 0) return 'var(--line)'
    const diff = score - par
    if (diff <= -2) return '#f59e0b'
    if (diff === -1) return '#16a34a'
    if (diff === 0) return 'var(--txt)'
    if (diff === 1) return '#3b82f6'
    return '#ef4444'
  }

  const handleSave = async () => {
    if (!courseName.trim()) { alert('コース名を入力してください'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('scorecards').insert({
      user_id: user.id,
      course_name: courseName,
      round_date: roundDate,
      played_at: roundDate,
      total_score: total,
      out_score: outTotal,
      in_score: inTotal,
      hole_scores: scores,
    })
    if (error) console.error('Save error:', error)
    if (!error) {
      alert('スコアを保存しました！')
      router.push('/home')
    } else {
      alert('保存に失敗しました')
    }
    setSaving(false)
  }

  if (!canUseGPS(userPlan)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px' }}>
          <Logo />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 10 }}>スコア記録はスタンダードプラン以上</div>
          <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>スコア記録機能を使うには<br/>スタンダードプランへのアップグレードが必要です</div>
          <button onClick={() => router.push('/subscription')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>プランをアップグレード</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div onClick={() => router.push('/home')} style={{ cursor: 'pointer', color: 'var(--g2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            スコア記録
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['input', 'history'] as const).map(t => (
            <button key={t} onClick={() => setView(t)} style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: view === t ? 700 : 500, color: view === t ? 'var(--g2)' : 'var(--mute)', background: 'none', border: 'none', borderBottom: view === t ? '2px solid var(--g2)' : '2px solid transparent', cursor: 'pointer' }}>
              {t === 'input' ? '📝 スコア入力' : '📊 履歴'}
            </button>
          ))}
        </div>
      </div>

      {view === 'input' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 6 }}>コース名</div>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="例：東広島カントリークラブ" style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 6 }}>ラウンド日</div>
            <input type="date" value={roundDate} onChange={e => setRoundDate(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {['OUT (1-9H)', 'IN (10-18H)'].map((label, half) => (
            <div key={half}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {Array.from({ length: 9 }, (_, i) => {
                  const hole = half * 9 + i
                  return (
                    <div key={hole} style={{ background: 'white', borderRadius: 10, border: `1px solid ${scores[hole] > 0 ? 'rgba(22,101,52,.2)' : 'var(--line)'}`, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--mute)', fontFamily: 'Inter', marginBottom: 2 }}>HOLE {hole + 1}</div>
                      <div style={{ fontSize: 8, color: 'var(--mute)', marginBottom: 6 }}>Par {PARS[hole]}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button onClick={() => updateScore(hole, scores[hole] - 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', fontSize: 14, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: scoreColor(scores[hole], PARS[hole]), minWidth: 28, textAlign: 'center' }}>{scores[hole] === 0 ? '-' : scores[hole]}</span>
                        <button onClick={() => updateScore(hole, scores[hole] === 0 ? PARS[hole] : scores[hole] + 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', fontSize: 14, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 14 }}>
            {[{ label: 'OUT', score: outTotal, par: outPar }, { label: 'IN', score: inTotal, par: inPar }, { label: 'TOTAL', score: total, par: totalPar }].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: r.label !== 'TOTAL' ? '1px solid var(--surf)' : 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'Inter', fontWeight: 600 }}>{r.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--mute)' }}>Par {r.par}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: r.label === 'TOTAL' ? 24 : 16, fontWeight: 700, color: r.label === 'TOTAL' ? 'var(--g1)' : 'var(--txt)' }}>{r.score || '—'}</span>
                  {r.score > 0 && <span style={{ fontSize: 10, color: r.score - r.par > 0 ? '#3b82f6' : '#16a34a', fontWeight: 600 }}>{r.score - r.par > 0 ? `+${r.score - r.par}` : r.score - r.par}</span>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: saving ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '保存中...' : 'スコアを保存する'}
          </button>
        </div>
      )}

      {view === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだスコアの記録がありません</div>
            </div>
          ) : history.map((h: any) => (
            <div key={h.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{h.course_name ?? 'コース未設定'}</div>
                  <div style={{ fontSize: 10, color: 'var(--mute)' }}>{h.round_date ? new Date(h.round_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(h.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 700, color: 'var(--g1)', lineHeight: 1 }}>{h.total_score}</div>
                  <div style={{ fontSize: 9, color: 'var(--mute)' }}>TOTAL</div>
                </div>
              </div>
              {(h.out_score || h.in_score) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: 'var(--g2)' }}>{h.out_score}</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)' }}>OUT</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: 'var(--g2)' }}>{h.in_score}</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)' }}>IN</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
