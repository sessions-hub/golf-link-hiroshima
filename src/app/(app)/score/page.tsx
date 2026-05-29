'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addPoints } from '@/lib/points'
import PointToast from '@/components/PointToast'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { type CourseEntry, type CourseCombo, searchVenues, getVenueCourses, getGroupCombos, getCourseById, COURSES, COURSE_COMBOS } from '@/lib/courses'

// コース名からpar配列を取得（実際のpar基準で集計するため）
function getScoreCardPars(courseName: string, holeCount: number): number[] {
  const norm = (s: string) => s.replace(/\s+|　/g, '')
  const cn = courseName ?? ''
  const exact = COURSES.find(c => c.name === cn || norm(c.name) === norm(cn))
  if (exact) return exact.pars.slice(0, holeCount)
  for (const group of COURSE_COMBOS) {
    for (const combo of group.combos) {
      if (norm(`${group.groupName}${combo.label}`) === norm(cn)) {
        const pars = combo.courses.map(id => getCourseById(id)).filter(Boolean).flatMap(c => c!.pars)
        if (pars.length >= holeCount) return pars.slice(0, holeCount)
      }
    }
  }
  return Array(holeCount).fill(4)
}

const DEFAULT_PARS = [4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4]

type ActiveCombo = { label: string; courses: CourseEntry[] }

export default function ScorePage() {
  const router = useRouter()
  const supabase = createClient()
  const [scores, setScores] = useState<number[]>(Array(27).fill(0))
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [view, setView] = useState<'input' | 'history'>('input')
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [avgScore, setAvgScore] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<{ birdie: number; par: number; bogey: number; dbl: number } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)

  // コース検索
  const [courseSearch, setCourseSearch] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null)
  const [subCourseOptions, setSubCourseOptions] = useState<CourseEntry[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null)
  const [roundFormatFor, setRoundFormatFor] = useState<CourseEntry | null>(null)
  const [selectedCombo, setSelectedCombo] = useState<ActiveCombo | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // アクティブなpar・ホール数
  const activePars: number[] = selectedCombo
    ? selectedCombo.courses.flatMap(c => c.pars)
    : selectedCourse ? selectedCourse.pars : DEFAULT_PARS
  const holeCount = selectedCombo
    ? selectedCombo.courses.reduce((a, c) => a + c.holes, 0)
    : selectedCourse?.holes ?? 18

  const calcStats = (data: any[]) => {
    if (data.length === 0) return
    const s = data.map((d: any) => d.total_score).filter(Boolean)
    setBestScore(s.length > 0 ? Math.min(...s) : null)
    setAvgScore(s.length > 0 ? Math.round(s.reduce((a: number, b: number) => a + b, 0) / s.length) : null)
    setRoundCount(data.length)

    // ホールスコア内訳（実際のpar基準で集計）
    let birdie = 0, par = 0, bogey = 0, dbl = 0, total = 0
    for (const d of data) {
      const holes = (d.hole_scores ?? []) as number[]
      const pars = getScoreCardPars(d.course_name ?? '', holes.length)
      holes.forEach((score, i) => {
        if (!score) return
        total++
        const diff = score - (pars[i] ?? 4)
        if (diff <= -1) birdie++
        else if (diff === 0) par++
        else if (diff === 1) bogey++
        else dbl++
      })
    }
    if (total > 0) {
      const b = Math.round(birdie / total * 100)
      const p = Math.round(par / total * 100)
      const bo = Math.round(bogey / total * 100)
      setScoreBreakdown({ birdie: b, par: p, bogey: bo, dbl: 100 - b - p - bo })
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
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

  const resetScores = () => setScores(Array(27).fill(0))

  const handleSearchChange = (val: string) => {
    setCourseSearch(val)
    setSelectedVenueName(null)
    setSelectedCourse(null)
    setSubCourseOptions([])
    setRoundFormatFor(null)
    setSelectedCombo(null)
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    setSuggestions(searchVenues(val))
    setShowSuggestions(true)
  }

  const handleSelectVenue = (venueName: string) => {
    setSelectedVenueName(venueName)
    setCourseSearch(venueName)
    setShowSuggestions(false)
    setRoundFormatFor(null)
    setSelectedCombo(null)
    const courses = getVenueCourses(venueName)
    if (courses.length === 1) {
      if (courses[0].holes === 9) {
        setRoundFormatFor(courses[0])
        setSelectedCourse(null)
      } else {
        setSelectedCourse(courses[0])
      }
      setSubCourseOptions([])
      resetScores()
    } else {
      setSelectedCourse(null)
      setSubCourseOptions(courses)
    }
  }

  const handleSelectSubCourse = (course: CourseEntry) => {
    if (course.holes === 9) {
      setRoundFormatFor(course)
      setSelectedCourse(null)
    } else {
      setSelectedCourse(course)
      setRoundFormatFor(null)
    }
    setSelectedCombo(null)
    resetScores()
  }

  const handleSelectSingle = () => {
    if (!roundFormatFor) return
    setSelectedCourse(roundFormatFor)
    setRoundFormatFor(null)
    setSelectedCombo(null)
    resetScores()
  }

  const handleSelectCombo = (combo: CourseCombo) => {
    const entries = combo.courses.map(id => getCourseById(id)).filter(Boolean) as CourseEntry[]
    setSelectedCombo({ label: combo.label, courses: entries })
    setSelectedCourse(null)
    setRoundFormatFor(null)
    resetScores()
  }

  const handleClearCourse = () => {
    setCourseSearch('')
    setSelectedVenueName(null)
    setSelectedCourse(null)
    setSubCourseOptions([])
    setSuggestions([])
    setRoundFormatFor(null)
    setSelectedCombo(null)
    resetScores()
  }

  const updateScore = (hole: number, val: number) => {
    if (val < 1 || val > 15) return
    setScores(prev => { const n = [...prev]; n[hole] = val; return n })
  }

  const outTotal = scores.slice(0, 9).reduce((a, b) => a + b, 0)
  const inTotal = holeCount >= 18 ? scores.slice(9, 18).reduce((a, b) => a + b, 0) : 0
  const thirdTotal = holeCount >= 27 ? scores.slice(18, 27).reduce((a, b) => a + b, 0) : 0
  const total = scores.slice(0, holeCount).reduce((a, b) => a + b, 0)
  const outPar = activePars.slice(0, 9).reduce((a, b) => a + b, 0)
  const inPar = holeCount >= 18 ? activePars.slice(9, 18).reduce((a, b) => a + b, 0) : 0
  const thirdPar = holeCount >= 27 ? activePars.slice(18, 27).reduce((a, b) => a + b, 0) : 0
  const totalPar = outPar + inPar + thirdPar

  const scoreColor = (score: number, par: number) => {
    if (score === 0) return 'var(--line)'
    const diff = score - par
    if (diff <= -2) return '#f59e0b'
    if (diff === -1) return '#16a34a'
    if (diff === 0) return 'var(--txt)'
    if (diff === 1) return '#3b82f6'
    return '#ef4444'
  }

  // スコアセクション（OUT / IN / 3rd）
  const scoreSections: { label: string; startHole: number; pars: number[] }[] = selectedCombo
    ? selectedCombo.courses.map((c, idx) => ({
        label: idx === 0 ? 'OUT (1-9H)' : idx === 1 ? 'IN (10-18H)' : '3rd (19-27H)',
        startHole: idx * 9,
        pars: c.pars,
      }))
    : holeCount >= 18
      ? [
          { label: 'OUT (1-9H)', startHole: 0, pars: activePars.slice(0, 9) },
          { label: 'IN (10-18H)', startHole: 9, pars: activePars.slice(9, 18) },
        ]
      : [{ label: 'OUT (1-9H)', startHole: 0, pars: activePars.slice(0, 9) }]

  const handleSave = async () => {
    if (!selectedCourse && !selectedCombo) { alert('コースを選択してください'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const courseName = selectedCombo
      ? `${selectedVenueName ?? ''} ${selectedCombo.label}`.trim()
      : selectedCourse!.name
    const holeScores = scores.slice(0, holeCount)
    const totalScore = holeScores.reduce((a, b) => a + b, 0)
    const outScore = holeScores.slice(0, 9).reduce((a, b) => a + b, 0)
    const inScore = holeCount >= 18 ? holeScores.slice(9, 18).reduce((a, b) => a + b, 0) : null
    const { error } = await supabase.from('scorecards').insert({
      user_id: user.id,
      course_name: courseName,
      round_date: roundDate,
      played_at: roundDate,
      total_score: totalScore,
      out_score: outScore,
      in_score: inScore,
      hole_scores: holeScores,
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
      handleClearCourse()
      setView('history')
      alert('スコアを保存しました！')
    } else {
      alert('保存に失敗しました')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスコアを削除しますか？')) return
    const { error } = await supabase.from('scorecards').delete().eq('id', id)
    if (!error) {
      const newHistory = history.filter((h: any) => h.id !== id)
      setHistory(newHistory)
      calcStats(newHistory)
      if (expandedId === id) setExpandedId(null)
    } else {
      alert('削除に失敗しました')
    }
  }

  const StatsBanner = () => (
    <div style={{ background: 'linear-gradient(135deg,#0d3d2b,#1a4a2a)', borderRadius: 14, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,224,99,.15) 0%,transparent 70%)' }}/>
      <div style={{ fontSize: 10, color: 'rgba(168,224,99,.7)', letterSpacing: '.12em', fontFamily: 'Inter', marginBottom: 12 }}>MY GOLF STATS</div>
      <div style={{ display: 'flex' }}>
        {[
          { v: bestScore ?? '-', label: 'BEST', sub: '自己ベスト' },
          { v: avgScore ?? '-', label: 'AVG', sub: '平均スコア' },
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

  // コース選択エリア
  const renderCourseSelector = () => {
    // コンボ確定済み
    if (selectedCombo) {
      return (
        <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{selectedVenueName} {selectedCombo.label}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{holeCount}ホール / Par {totalPar}</div>
          </div>
          <button onClick={handleClearCourse} style={{ fontSize: 11, color: 'var(--g2)', background: 'none', border: '1px solid var(--g2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>コースを変更する</button>
        </div>
      )
    }
    // 単独コース確定済み
    if (selectedCourse) {
      return (
        <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{selectedCourse.name}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{selectedCourse.holes}ホール / Par {selectedCourse.par}</div>
          </div>
          <button onClick={handleClearCourse} style={{ fontSize: 11, color: 'var(--g2)', background: 'none', border: '1px solid var(--g2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>コースを変更する</button>
        </div>
      )
    }
    // 9Hコース選択済み → ラウンド形式を選択
    if (roundFormatFor) {
      const availableCombos = getGroupCombos(selectedVenueName ?? roundFormatFor.venueName)
        .filter(combo => combo.courses.includes(roundFormatFor.id))
      return (
        <div style={{ marginBottom: 10 }}>
          <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{roundFormatFor.name}</div>
            <button onClick={handleClearCourse} style={{ fontSize: 11, color: 'var(--g2)', background: 'none', border: '1px solid var(--g2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>変更する</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--mute)', marginBottom: 6 }}>ラウンド形式を選択</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={handleSelectSingle}
              style={{ width: '100%', background: 'white', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', textAlign: 'left', fontSize: 13, color: 'var(--txt)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>単独ラウンド（9H）</span>
              <span style={{ fontSize: 11, color: 'var(--mute)' }}>Par {roundFormatFor.par}</span>
            </button>
            {availableCombos.map(combo => (
              <button
                key={combo.label}
                onClick={() => handleSelectCombo(combo)}
                style={{ width: '100%', background: 'rgba(13,61,43,.04)', border: '1px solid rgba(13,61,43,.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'left', fontSize: 13, color: 'var(--g1)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}
              >
                <span>{combo.label}</span>
                <span style={{ fontSize: 11, color: 'var(--g3)', fontWeight: 400 }}>
                  {combo.courses.reduce((a, id) => {
                    const c = getCourseById(id); return a + (c?.holes ?? 0)
                  }, 0)}H
                </span>
              </button>
            ))}
          </div>
        </div>
      )
    }
    // 複数コース会場選択済み → サブコース選択
    if (selectedVenueName && subCourseOptions.length > 0) {
      return (
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
      )
    }
    // 検索入力
    return (
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
    )
  }

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
            {renderCourseSelector()}
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 6 }}>ラウンド日</div>
            <input type="date" value={roundDate} onChange={e => setRoundDate(e.target.value)} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {scoreSections.map((section, sIdx) => (
            <div key={sIdx}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 8 }}>{section.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {Array.from({ length: 9 }, (_, i) => {
                  const hole = section.startHole + i
                  const holePar = section.pars[i] ?? 4
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
              ...(holeCount >= 18 ? [{ label: 'IN', score: inTotal, par: inPar }] : []),
              ...(holeCount >= 27 ? [{ label: '3rd', score: thirdTotal, par: thirdPar }] : []),
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

          {scoreBreakdown && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>スコア内訳</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { pct: scoreBreakdown.birdie, label: 'バーディ以下', color: '#f59e0b' },
                  { pct: scoreBreakdown.par,    label: 'パー',         color: '#16a34a' },
                  { pct: scoreBreakdown.bogey,  label: 'ボギー',       color: '#3b82f6' },
                  { pct: scoreBreakdown.dbl,    label: 'ダブル+',      color: '#ef4444' },
                ].map(({ pct, label, color }) => (
                  <div key={label} style={{ textAlign: 'center', background: 'var(--surf)', borderRadius: 8, padding: '10px 4px' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{pct}%</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)', lineHeight: 1.4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                {[
                  { pct: scoreBreakdown.birdie, color: '#f59e0b' },
                  { pct: scoreBreakdown.par,    color: '#16a34a' },
                  { pct: scoreBreakdown.bogey,  color: '#3b82f6' },
                  { pct: scoreBreakdown.dbl,    color: '#ef4444' },
                ].filter(({ pct }) => pct > 0).map(({ pct, color }, i) => (
                  <div key={i} style={{ width: `${pct}%`, background: color }} />
                ))}
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだスコアの記録がありません</div>
              <button onClick={() => setView('input')} style={{ marginTop: 12, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>スコアを記録する</button>
            </div>
          ) : history.map((h: any) => {
            const isExpanded = expandedId === h.id
            const holeScores: number[] = h.hole_scores ?? []
            const pars = getScoreCardPars(h.course_name ?? '', holeScores.length)
            const dateStr = h.round_date
              ? new Date(h.round_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date(h.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            // セクション（OUT/IN/3rdを9H単位で分割）
            const sectionCount = Math.ceil(holeScores.length / 9) || 2
            const sectionLabels = ['OUT（1〜9H）', 'IN（10〜18H）', '3rd（19〜27H）']
            return (
              <div key={h.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', marginBottom: 10, overflow: 'hidden' }}>
                {/* ヘッダー（常時表示・タップで展開） */}
                <div onClick={() => setExpandedId(isExpanded ? null : h.id)} style={{ padding: 14, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.course_name ?? 'コース未設定'}</div>
                      <div style={{ fontSize: 10, color: 'var(--mute)' }}>{dateStr}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: 'var(--g1)', lineHeight: 1 }}>{h.total_score}</div>
                        <div style={{ fontSize: 9, color: 'var(--mute)' }}>TOTAL</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s', flexShrink: 0 }}>
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </div>
                  </div>
                  {/* 折りたたみ時はOUT/INチップを表示 */}
                  {!isExpanded && (h.out_score || h.in_score) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {h.out_score != null && (
                        <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: '4px 0', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>{h.out_score}</span>
                          <span style={{ fontSize: 9, color: 'var(--mute)', marginLeft: 3 }}>OUT</span>
                        </div>
                      )}
                      {h.in_score != null && (
                        <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 6, padding: '4px 0', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>{h.in_score}</span>
                          <span style={{ fontSize: 9, color: 'var(--mute)', marginLeft: 3 }}>IN</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 展開時：ホール別スコア詳細 */}
                {isExpanded && holeScores.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--surf)', padding: '10px 14px 14px' }}>
                    {Array.from({ length: sectionCount }, (_, sIdx) => {
                      const start = sIdx * 9
                      const sectionScores = holeScores.slice(start, start + 9)
                      const sectionPars = pars.slice(start, start + 9)
                      const sectionTotal = sectionScores.reduce((a, b) => a + (b || 0), 0)
                      const sectionParTotal = sectionPars.reduce((a, b) => a + b, 0)
                      const sectionLabel = sectionLabels[sIdx] ?? `${sIdx * 9 + 1}〜${sIdx * 9 + 9}H`
                      return (
                        <div key={sIdx} style={{ marginBottom: sIdx < sectionCount - 1 ? 12 : 0 }}>
                          <div style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '.1em', marginBottom: 6 }}>{sectionLabel}</div>
                          {/* ホールグリッド */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2, marginBottom: 4 }}>
                            {/* 行1: ホール番号 */}
                            {Array.from({ length: 9 }, (_, i) => (
                              <div key={i} style={{ textAlign: 'center', fontSize: 8, color: 'var(--mute)', fontFamily: 'Inter' }}>{start + i + 1}</div>
                            ))}
                            {/* 行2: par */}
                            {sectionPars.map((p, i) => (
                              <div key={i} style={{ textAlign: 'center', fontSize: 8, color: 'var(--g3)', fontFamily: 'Inter' }}>P{p}</div>
                            ))}
                            {/* 行3: スコア（色付き） */}
                            {Array.from({ length: 9 }, (_, i) => {
                              const sc = sectionScores[i] ?? 0
                              const par = sectionPars[i] ?? 4
                              const diff = sc > 0 ? sc - par : null
                              return (
                                <div key={i} style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: diff === null ? 'var(--line)' : scoreColor(sc, par) }}>
                                  {sc || '—'}
                                </div>
                              )
                            })}
                          </div>
                          {/* セクション合計 */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: 'var(--mute)' }}>Par {sectionParTotal}</span>
                            <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: 'var(--g2)' }}>
                              {['OUT', 'IN', '3rd'][sIdx]} {sectionTotal || '—'}
                            </span>
                            {sectionTotal > 0 && (
                              <span style={{ fontSize: 9, fontWeight: 600, color: sectionTotal - sectionParTotal > 0 ? '#3b82f6' : '#16a34a' }}>
                                {sectionTotal - sectionParTotal > 0 ? `+${sectionTotal - sectionParTotal}` : sectionTotal - sectionParTotal}
                              </span>
                            )}
                          </div>
                          {sIdx < sectionCount - 1 && <div style={{ borderBottom: '1px solid var(--surf)', marginTop: 8 }} />}
                        </div>
                      )
                    })}
                    {/* 削除ボタン */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--surf)' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                        style={{ width: '100%', background: 'none', border: '1px solid #ef4444', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>
                        このスコアを削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
