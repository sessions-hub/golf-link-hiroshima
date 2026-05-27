'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canUseGPS, type Plan } from '@/lib/plan'
import { addPoints } from '@/lib/points'
import PointToast from '@/components/PointToast'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { type CourseEntry, searchVenues, getVenueCourses } from '@/lib/courses'

const DEFAULT_PARS = [4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4]

export default function ScorePage() {
  const router = useRouter()
  const supabase = createClient()
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [scores, setScores] = useState<number[]>(Array(18).fill(0))
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [view, setView] = useState<'input' | 'history'>('input')
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)

  // コース検索
  const [courseSearch, setCourseSearch] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null)
  const [subCourseOptions, setSubCourseOptions] = useState<CourseEntry[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const pars = selectedCourse ? selectedCourse.pars : DEFAULT_PARS
  const holeCount = selectedCourse?.holes ?? 18

  const calcStats = (data: any[]) => {
    if (data.length === 0) return
    const s = data.map((d: any) => d.total_score).filter(Boolean)
    setBestScore(s.length > 0 ? Math.min(...s) : null)
    setLastScore(data[0]?.total_score ?? null)
    setRoundCount(data.length)
  }

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
      if (data) { setHistory(data); calcStats(data) }
    }
    init()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearchChange = (val: string) => {
    setCourseSearch(val)
    setSelectedVenueName(null)
    setSelectedCourse(null)
    setSubCourseOptions([])
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    setSuggestions(searchVenues(val))
    setShowSuggestions(true)
  }

  const handleSelectVenue = (venueName: string) => {
    setSelectedVenueName(venueName)
    setCourseSearch(venueName)
    setShowSuggestions(false)
    const courses = getVenueCourses(venueName)
    if (courses.length === 1) {
      setSelectedCourse(courses[0])
      setSubCourseOptions([])
      setScores(Array(18).fill(0))
    } else {
      setSelectedCourse(null)
      setSubCourseOptions(courses)
    }
  }

  const handleSelectSubCourse = (course: CourseEntry) => {
    setSelectedCourse(course)
    setScores(Array(18).fill(0))
  }

  const handleClearCourse = () => {
    setCourseSearch('')
    setSelectedVenueName(null)
    setSelectedCourse(null)
    setSubCourseOptions([])
    setSuggestions([])
    setScores(Array(18).fill(0))
  }

  const updateScore = (hole: number, val: number) => {
    if (!canUseGPS(userPlan)) { setShowUpgradeModal(true); return }
    if (val < 1 || val > 15) return
    setScores(prev => { const n = [...prev]; n[hole] = val; return n })
  }

  const outTotal = scores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = holeCount === 18 ? scores.slice(9, 18).reduce((a, b) => a + b, 0) : 0
  const total = outTotal + inTotal
  const outPar = pars.slice(0, 9).reduce((a, b) => a + b, 0)
  const inPar = holeCount === 18 ? pars.slice(9, 18).reduce((a, b) => a + b, 0) : 0
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
    if (!canUseGPS(userPlan)) { setShowUpgradeModal(true); return }
    if (!selectedCourse) { alert('コースを選択してください'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('scorecards').insert({
      user_id: user.id,
      course_name: selectedCourse.name,
      round_date: roundDate,
      played_at: roundDate,
      total_score: total,
      out_score: outTotal,
      in_score: holeCount === 18 ? inTotal : null,
      hole_scores: scores.slice(0, holeCount),
    })
    if (!error) {
      addPoints(supabase, user.id, 50)
      setToast(t => ({ pts: 50, k: (t?.k ?? 0) + 1 }))
      const { data: newHistory } = await supabase
        .from('scorecards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (newHistory) { setHistory(newHistory); calcStats(newHistory) }
      setScores(Array(18).fill(0))
      handleClearCourse()
      setView('history')
      alert('スコアを保存しました！')
    } else {
      alert('保存に失敗しました')
    }
    setSaving(false)
  }

  const StatsBanner = () => (
    <div style={{ background: 'linear-gradient(135deg,#0d3d2b,#1a4a2a)', borderRadius: 14, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,224,99,.15) 0%,transparent 70%)' }}/>
      <div style={{ fontSize: 10, color: 'rgba(168,224,99,.7)', letterSpacing: '.12em', fontFamily: 'Inter', marginBottom: 12 }}>MY GOLF STATS</div>
      <div style={{ display: 'flex' }}>
        {[
          { v: bestScore ?? '-', label: 'BEST', sub: '自己ベスト' },
          { v: lastScore ?? '-', label: 'LAST', sub: '直近スコア' },
          { v: roundCount, label: 'ROUNDS', sub: '累計ラウンド' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em' }}>{s.label}</div>
            <div style={{ fontSize: 8, color: 'rgba(168,224,99,.6)', marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {toast && <PointToast key={toast.k} amount={toast.pts} onDone={() => setToast(null)} />}
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
              {t === 'input' ? '📝 スコア入力' : '📊 履歴・統計'}
            </button>
          ))}
        </div>
      </div>

      {view === 'input' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
          <StatsBanner />

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 6 }}>コース名</div>

            {selectedCourse ? (
              <div>
                <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{selectedCourse.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{selectedCourse.holes}ホール / Par {selectedCourse.par}</div>
                  </div>
                  <button onClick={handleClearCourse} style={{ fontSize: 11, color: 'var(--g2)', background: 'none', border: '1px solid var(--g2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>コースを変更する</button>
                </div>
              </div>
            ) : selectedVenueName && subCourseOptions.length > 0 ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{selectedVenueName}</div>
                  <button onClick={handleClearCourse} style={{ fontSize: 11, color: 'var(--g2)', background: 'none', border: '1px solid var(--g2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>変更する</button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 4 }}>コースを選択</div>
                <select
                  defaultValue=""
                  onChange={e => {
                    const c = subCourseOptions.find(o => o.id === e.target.value)
                    if (c) handleSelectSubCourse(c)
                  }}
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="" disabled>コースを選んでください</option>
                  {subCourseOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.subCourse}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div ref={searchRef} style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  value={courseSearch}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => courseSearch && setShowSuggestions(true)}
                  placeholder="コース名で検索..."
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--line)', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.1)', marginTop: 2, overflow: 'hidden' }}>
                    {suggestions.map(name => (
                      <div key={name} onMouseDown={() => handleSelectVenue(name)} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--txt)', cursor: 'pointer', borderBottom: '1px solid var(--surf)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >{name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 6 }}>ラウンド日</div>
            <input type="date" value={roundDate} onChange={e => setRoundDate(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {(['OUT (1-9H)', ...(holeCount === 18 ? ['IN (10-18H)'] : [])] as string[]).map((label, half) => (
            <div key={half}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {Array.from({ length: 9 }, (_, i) => {
                  const hole = half * 9 + i
                  const holePar = pars[hole] ?? 4
                  return (
                    <div key={hole} style={{ background: 'white', borderRadius: 10, border: `1px solid ${scores[hole] > 0 ? 'rgba(22,101,52,.2)' : 'var(--line)'}`, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', fontFamily: 'Inter', marginBottom: 2 }}>HOLE {hole + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g2)', fontFamily: 'Inter', marginBottom: 6 }}>Par {holePar}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button onClick={() => updateScore(hole, scores[hole] - 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', fontSize: 14, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: scoreColor(scores[hole], holePar), minWidth: 28, textAlign: 'center' }}>{scores[hole] === 0 ? '-' : scores[hole]}</span>
                        <button onClick={() => updateScore(hole, scores[hole] === 0 ? holePar : scores[hole] + 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', fontSize: 14, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 14 }}>
            {[
              { label: 'OUT', score: outTotal, par: outPar },
              ...(holeCount === 18 ? [{ label: 'IN', score: inTotal, par: inPar }] : []),
              { label: 'TOTAL', score: total, par: totalPar },
            ].map(r => (
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
          <StatsBanner />

          {history.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>直近5ラウンドの推移</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
                {(() => {
                  const recent = history.slice(0, 5).reverse()
                  const scores2 = recent.map((h: any) => h.total_score).filter(Boolean)
                  if (scores2.length === 0) return null
                  const maxS = Math.max(...scores2)
                  const minS = Math.min(...scores2)
                  const range = maxS - minS || 1
                  return recent.map((h: any) => {
                    const s = h.total_score
                    const heightPct = 30 + ((s - minS) / range) * 70
                    const isBest = s === minS
                    return (
                      <div key={h.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: `${heightPct}%`, borderRadius: 4, background: isBest ? 'var(--g2)' : 'var(--g3)', opacity: isBest ? 1 : 0.7, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 3 }}>
                          <span style={{ fontSize: 8, color: 'white', fontWeight: 700, fontFamily: 'Inter' }}>{s}</span>
                        </div>
                        <div style={{ fontSize: 7, color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                          {h.round_date ? new Date(h.round_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだスコアの記録がありません</div>
              <button onClick={() => setView('input')} style={{ marginTop: 12, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>スコアを記録する</button>
            </div>
          ) : history.map((h: any) => (
            <div key={h.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{h.course_name ?? 'コース未設定'}</div>
                  <div style={{ fontSize: 10, color: 'var(--mute)' }}>{h.round_date ? new Date(h.round_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(h.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: 'var(--g1)', lineHeight: 1 }}>{h.total_score}</div>
                  <div style={{ fontSize: 9, color: 'var(--mute)' }}>TOTAL</div>
                </div>
              </div>
              {(h.out_score || h.in_score) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: 'var(--g2)' }}>{h.out_score}</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)' }}>OUT</div>
                  </div>
                  {h.in_score && (
                    <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: 'var(--g2)' }}>{h.in_score}</div>
                      <div style={{ fontSize: 9, color: 'var(--mute)' }}>IN</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />

      {/* プランアップグレードモーダル */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '32px 24px 48px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--g1),var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>スコア記録はスタンダードプラン以上</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>スタンダードプラン（月額490円）にアップグレードすると、スコア記録・GPS計測・コンペ参加など全機能が使えます。</div>
            <button onClick={() => router.push('/subscription')} style={{ width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>プランをアップグレード</button>
            <button onClick={() => setShowUpgradeModal(false)} style={{ width: '100%', background: 'none', border: 'none', fontSize: 13, color: 'var(--mute)', cursor: 'pointer', padding: '8px' }}>キャンセル</button>
          </div>
        </div>
      )}
    </div>
  )
}
