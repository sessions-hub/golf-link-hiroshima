'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { getUserPlan, canUseGPS, type Plan } from '@/lib/plan'
import { createClient } from '@/lib/supabase/client'
import { addPoints } from '@/lib/points'
import PointToast from '@/components/PointToast'
import { getVenueCourses, getGroupCombos, getCourseById, type CourseEntry, type CourseCombo } from '@/lib/courses'
import { GREEN_COORDS, COURSE_ID_TO_GREEN_KEY } from '@/lib/greenCoords'

interface GoraCourse {
  golfCourseId: number
  golfCourseName: string
  address: string
  latitude: number
  longitude: number
  golfCourseDetailUrl: string
  holes: number
  evaluation: number
}

interface GPSPosition {
  lat: number
  lng: number
  accuracy: number
}

type ActiveCombo = { label: string; courses: CourseEntry[] }

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function mToY(m: number): number {
  return Math.round(m * 1.09361)
}

const getJudgment = (diff: number) => {
  if (diff <= -3) return 'アルバトロス'
  if (diff === -2) return 'イーグル'
  if (diff === -1) return 'バーディ'
  if (diff === 0) return 'パー'
  if (diff === 1) return 'ボギー'
  if (diff === 2) return 'ダブルボギー'
  return 'トリプルボギー以上'
}

const getJudgmentColor = (diff: number) => {
  if (diff <= -2) return '#f59e0b'
  if (diff === -1) return '#16a34a'
  if (diff === 0) return 'var(--g2)'
  if (diff === 1) return '#3b82f6'
  return '#ef4444'
}

const DEFAULT_PARS = [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4]

export default function GpsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [myId, setMyId] = useState('')
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [courses, setCourses] = useState<(GoraCourse & { distKm: number })[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [selected, setSelected] = useState<GoraCourse & { distKm: number } | null>(null)
  const [hole, setHole] = useState(1)
  const [greenDist, setGreenDist] = useState<{ center: number | '—'; isApprox?: boolean } | null>(null)
  const [greenSide, setGreenSide] = useState<'left' | 'right'>('left')
  const [searchText, setSearchText] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)
  const [scores, setScores] = useState<number[]>(Array(27).fill(0))
  const [saving, setSaving] = useState(false)
  // サブコース・コンボ選択
  const [subCourseOptions, setSubCourseOptions] = useState<CourseEntry[]>([])
  const [selectedSubCourse, setSelectedSubCourse] = useState<CourseEntry | null>(null)
  const [pendingSubCourse, setPendingSubCourse] = useState<CourseEntry | null>(null)
  const [gpsCombo, setGpsCombo] = useState<ActiveCombo | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastPositionRef = useRef<GPSPosition | null>(null)
  const lastSortRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      getUserPlan().then(setUserPlan)
    }
    init()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('このデバイスはGPSに対応していません')
      return
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: GPSPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }
        const prev = lastPositionRef.current
        const moved = prev ? calcDistance(prev.lat, prev.lng, next.lat, next.lng) : 999
        const accuracyImproved = !prev || prev.accuracy - next.accuracy > 5
        if (moved > 0.03 || accuracyImproved) {
          lastPositionRef.current = next
          setPosition(next)
        }
        setGpsError('')
      },
      () => {
        setGpsError('GPS取得に失敗しました。位置情報を許可してください。')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  useEffect(() => {
    fetchCourses('広島県')
  }, [])

  useEffect(() => {
    if (!position) return
    const last = lastSortRef.current
    if (last && calcDistance(last.lat, last.lng, position.lat, position.lng) < 0.1) return
    lastSortRef.current = { lat: position.lat, lng: position.lng }
    setCourses(prev => {
      if (prev.length === 0) return prev
      return [...prev.map(c => ({
        ...c,
        distKm: c.latitude && c.longitude
          ? calcDistance(position.lat, position.lng, c.latitude, c.longitude)
          : 999,
      }))].sort((a, b) => a.distKm - b.distKm)
    })
  }, [position])

  const fetchCourses = async (keyword: string, retryCount = 0) => {
    setLoadingCourses(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`/api/gora?keyword=${encodeURIComponent(keyword)}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.Items && data.Items.length > 0) {
        const pos = lastPositionRef.current
        const list = data.Items.map((item: any) => ({
          ...item.Item,
          distKm: pos && item.Item.latitude && item.Item.longitude
            ? calcDistance(pos.lat, pos.lng, item.Item.latitude, item.Item.longitude)
            : 999,
        })).sort((a: any, b: any) => a.distKm - b.distKm)
        setCourses(list)
        if (pos) lastSortRef.current = { lat: pos.lat, lng: pos.lng }
      } else if (retryCount < 2) {
        setTimeout(() => fetchCourses(keyword, retryCount + 1), 2000)
        return
      }
    } catch (e: any) {
      if (retryCount < 2 && e.name !== 'AbortError') {
        setTimeout(() => fetchCourses(keyword, retryCount + 1), 2000)
        return
      }
    }
    setLoadingCourses(false)
  }

  const resetAllCourseState = () => {
    setSubCourseOptions([])
    setSelectedSubCourse(null)
    setPendingSubCourse(null)
    setGpsCombo(null)
    setScores(Array(27).fill(0))
    setGreenDist(null)
  }

  const selectCourse = (course: GoraCourse & { distKm: number }) => {
    if (!canUseGPS(userPlan)) { setShowUpgradeModal(true); return }
    const matchingCourses = getVenueCourses(course.golfCourseName)
    resetAllCourseState()
    if (matchingCourses.length > 1) {
      setSubCourseOptions(matchingCourses)
    } else if (matchingCourses.length === 1) {
      const mc = matchingCourses[0]
      if (mc.holes === 9) {
        setPendingSubCourse(mc)
      } else {
        setSelectedSubCourse(mc)
      }
    }
    setSelected(course)
    setHole(1)
    setGreenSide('left')
    if (myId) { addPoints(supabase, myId, 50); setToast(t => ({ pts: 50, k: (t?.k ?? 0) + 1 })) }
  }

  const handlePickSubCourse = (c: CourseEntry) => {
    if (c.holes === 9) {
      setPendingSubCourse(c)
      setSelectedSubCourse(null)
    } else {
      setSelectedSubCourse(c)
      setPendingSubCourse(null)
    }
    setGpsCombo(null)
    setScores(Array(27).fill(0))
  }

  const handlePickSingle = () => {
    if (!pendingSubCourse) return
    setSelectedSubCourse(pendingSubCourse)
    setPendingSubCourse(null)
    setGpsCombo(null)
    setScores(Array(27).fill(0))
    setHole(1)
  }

  const handlePickCombo = (combo: CourseCombo) => {
    const entries = combo.courses.map(id => getCourseById(id)).filter(Boolean) as CourseEntry[]
    setGpsCombo({ label: combo.label, courses: entries })
    setSelectedSubCourse(null)
    setPendingSubCourse(null)
    setScores(Array(27).fill(0))
    setHole(1)
  }

  useEffect(() => {
    if (!position) {
      setGreenDist(null)
      return
    }

    let courseId: string | null = null
    let holeInCourse = hole

    if (gpsCombo) {
      let offset = 0
      for (const course of gpsCombo.courses) {
        if (hole <= offset + course.holes) {
          courseId = course.id
          holeInCourse = hole - offset
          break
        }
        offset += course.holes
      }
    } else if (selectedSubCourse) {
      courseId = selectedSubCourse.id
      holeInCourse = hole
    }

    if (!courseId) {
      setGreenDist(null)
      return
    }

    const greenKey = COURSE_ID_TO_GREEN_KEY[courseId]
    const courseData = greenKey ? GREEN_COORDS[greenKey] : undefined
    const holeData = courseData?.holes.find(h => h.hole === holeInCourse)

    if (!holeData?.green) {
      if (selected?.latitude && selected?.longitude) {
        const distM = calcDistance(position.lat, position.lng, selected.latitude, selected.longitude) * 1000
        setGreenDist({ center: mToY(distM), isApprox: true })
      } else {
        setGreenDist({ center: '—' })
      }
      return
    }

    const { green } = holeData
    let coord: { lat: number; lng: number } | null | undefined

    if (green.type === 'single') {
      coord = green.center
    } else if (greenSide === 'right') {
      coord = green.right ?? green.left
    } else {
      coord = green.left
    }

    if (!coord) {
      setGreenDist({ center: '—' })
      return
    }

    const distM = calcDistance(position.lat, position.lng, coord.lat, coord.lng) * 1000
    setGreenDist({ center: mToY(distM) })
  }, [position, hole, greenSide, selectedSubCourse, gpsCombo, selected])

  const filteredCourses = courses.filter(c =>
    c.golfCourseName?.includes(searchText) || c.address?.includes(searchText)
  )

  const updateScore = (holeIdx: number, val: number) => {
    if (val < 1 || val > 15) return
    setScores(prev => { const n = [...prev]; n[holeIdx] = val; return n })
  }

  // アクティブpar・ホール数
  const gpsActivePars: number[] = gpsCombo
    ? gpsCombo.courses.flatMap(c => c.pars)
    : selectedSubCourse ? selectedSubCourse.pars : DEFAULT_PARS
  const gpsHoleCount = gpsCombo
    ? gpsCombo.courses.reduce((a, c) => a + c.holes, 0)
    : selectedSubCourse?.holes ?? 18

  // コース名
  const activeCourseName = gpsCombo
    ? `${selected?.golfCourseName ?? ''} ${gpsCombo.label}`.trim()
    : selectedSubCourse ? selectedSubCourse.name : (selected?.golfCourseName ?? '')

  const handleSaveRound = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const total = scores.slice(0, gpsHoleCount).reduce((a, b) => a + b, 0)
    const outScore = scores.slice(0, 9).reduce((a, b) => a + b, 0)
    const inScore = gpsHoleCount >= 18 ? scores.slice(9, 18).reduce((a, b) => a + b, 0) : null
    const { error } = await supabase.from('scorecards').insert({
      user_id: user.id,
      course_name: activeCourseName,
      hole_scores: scores.slice(0, gpsHoleCount),
      total_score: total,
      out_score: outScore,
      in_score: inScore,
      played_at: new Date().toISOString(),
    })
    if (!error) {
      alert('スコアを保存しました！')
    } else {
      alert('保存に失敗しました')
    }
    setSaving(false)
  }

  // アクティブコースのグリーンタイプ
  let activeCourseIdForGreen: string | null = null
  if (gpsCombo) {
    let offset = 0
    for (const course of gpsCombo.courses) {
      if (hole <= offset + course.holes) { activeCourseIdForGreen = course.id; break }
      offset += course.holes
    }
  } else if (selectedSubCourse) {
    activeCourseIdForGreen = selectedSubCourse.id
  }
  const activeGreenKey = activeCourseIdForGreen ? COURSE_ID_TO_GREEN_KEY[activeCourseIdForGreen] : undefined
  const activeCourseGreenData = activeGreenKey ? GREEN_COORDS[activeGreenKey] : undefined
  const activeGreenType = activeCourseGreenData?.greenType ?? 'single'

  const greenTitle =
    activeGreenType === 'double'
      ? (greenSide === 'left' ? '左グリーンセンターまで' : '右グリーンセンターまで')
      : 'グリーンセンターまで'

  const currentPar = gpsActivePars[hole - 1] ?? 4
  const currentScore = scores[hole - 1]
  const scoreDiff = currentScore > 0 ? currentScore - currentPar : null
  const allFilled = scores.slice(0, gpsHoleCount).every(s => s > 0)

  // スコアサマリーセクション
  const gpsSections: { label: string; startHole: number; pars: number[] }[] = gpsCombo
    ? gpsCombo.courses.map((c, idx) => ({
        label: idx === 0 ? 'OUT（1〜9H）' : idx === 1 ? 'IN（10〜18H）' : '3rd（19〜27H）',
        startHole: idx * 9,
        pars: c.pars,
      }))
    : gpsHoleCount >= 18
      ? [
          { label: 'OUT（1〜9H）', startHole: 0, pars: gpsActivePars.slice(0, 9) },
          { label: 'IN（10〜18H）', startHole: 9, pars: gpsActivePars.slice(9, 18) },
        ]
      : [{ label: 'OUT（1〜9H）', startHole: 0, pars: gpsActivePars.slice(0, 9) }]

  // コース選択画面
  if (!selected) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Logo variant="screen" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: position ? 'var(--lime)' : gpsError ? '#e05070' : '#f59e0b' }} />
              <span style={{ fontSize: 10, color: 'var(--mute)' }}>
                {position ? `GPS ±${position.accuracy}m` : gpsError ? 'GPS未取得' : 'GPS取得中...'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '8px 12px', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="コース名・エリアで検索"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 8, overflowX: 'auto' }}>
            {['広島県', '山口県', '岡山県', '島根県'].map(f => (
              <button key={f} onClick={() => fetchCourses(f)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)', flexShrink: 0, fontWeight: 500 }}>{f}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
          {gpsError && (
            <div style={{ margin: '8px 16px', background: 'rgba(200,60,60,.08)', border: '1px solid rgba(200,60,60,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c05050' }}>
              ⚠️ {gpsError}
            </div>
          )}
          {loadingCourses && <SectionLoading text="コースを読み込み中" />}
          {!loadingCourses && (
            <div style={{ padding: '4px 16px 8px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em' }}>
              {filteredCourses.length}件のコース
            </div>
          )}
          {filteredCourses.map((c) => (
            <div key={c.golfCourseId} onClick={() => selectCourse(c)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--g2)' }}>{Icons.golf(22, 'var(--g2)')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 600, marginBottom: 2 }}>{c.golfCourseName}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{c.address}</div>
                  {c.distKm < 999 && (
                    <div style={{ fontSize: 10, color: 'var(--g3)', marginTop: 3 }}>
                      📍 {c.distKm < 1 ? `${Math.round(c.distKm * 1000)}m` : `${c.distKm.toFixed(1)}km`}
                    </div>
                  )}
                </div>
                {c.distKm < 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 10, padding: '3px 8px', flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lime)' }} />
                    <span style={{ fontSize: 9, color: 'var(--g2)', fontFamily: 'Inter' }}>近い</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <BottomNav />

        {showUpgradeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '32px 24px 48px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--g1),var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {Icons.pin(26, 'white')}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>GPS計測はスタンダードプラン以上</div>
              <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>スタンダードプラン（月額490円）にアップグレードすると、GPS距離計測・スコア記録・コンペ参加など全機能が使えます。</div>
              <button onClick={() => router.push('/subscription')} style={{ width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>プランをアップグレード</button>
              <button onClick={() => setShowUpgradeModal(false)} style={{ width: '100%', background: 'none', border: 'none', fontSize: 13, color: 'var(--mute)', cursor: 'pointer', padding: '8px' }}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // サブコース選択画面
  if (selected && subCourseOptions.length > 0 && !selectedSubCourse && !pendingSubCourse && !gpsCombo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div onClick={() => { setSelected(null); resetAllCourseState() }} style={{ cursor: 'pointer', color: 'var(--g2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              コース一覧
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>{selected.golfCourseName}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>コースを選択してください</div>
          {subCourseOptions.map(c => (
            <div key={c.id} onClick={() => handlePickSubCourse(c)} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{c.subCourse}</div>
                <div style={{ fontSize: 11, color: 'var(--mute)' }}>{c.holes}ホール / Par {c.par}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  // ラウンド形式選択画面（9Hコース選択後）
  if (selected && pendingSubCourse && !selectedSubCourse && !gpsCombo) {
    const venueName = pendingSubCourse.venueName
    const availableCombos = getGroupCombos(venueName)
      .filter(combo => combo.courses.includes(pendingSubCourse.id))
    const backAction = subCourseOptions.length > 0
      ? () => setPendingSubCourse(null)
      : () => { setSelected(null); resetAllCourseState() }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div onClick={backAction} style={{ cursor: 'pointer', color: 'var(--g2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              {subCourseOptions.length > 0 ? 'コース選択' : 'コース一覧'}
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>{pendingSubCourse.name}</div>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{pendingSubCourse.holes}ホール / Par {pendingSubCourse.par}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>ラウンド形式を選択してください</div>
          <div onClick={handlePickSingle} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>単独ラウンド（9H）</div>
              <div style={{ fontSize: 11, color: 'var(--mute)' }}>Par {pendingSubCourse.par}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
          {availableCombos.map(combo => {
            const totalH = combo.courses.reduce((a, id) => {
              const c = getCourseById(id); return a + (c?.holes ?? 0)
            }, 0)
            return (
              <div key={combo.label} onClick={() => handlePickCombo(combo)} style={{ background: 'rgba(13,61,43,.03)', borderRadius: 12, border: '1px solid rgba(13,61,43,.2)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g1)', marginBottom: 2 }}>{combo.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--g3)' }}>{totalH}ホールラウンド</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
              </div>
            )
          })}
        </div>
        <BottomNav />
      </div>
    )
  }

  // GPS計測画面
  return (
    <div style={{ height: '100vh', background: '#070f07', display: 'flex', flexDirection: 'column' }}>
      {toast && <PointToast key={toast.k} amount={toast.pts} onDone={() => setToast(null)} />}

      {/* マップエリア（固定高さ） */}
      <div style={{ height: '32vh', position: 'relative', flexShrink: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 390 240" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
          <rect width="390" height="240" fill="#080f08"/>
          <path d="M130 240 Q124 200 140 160 Q155 120 145 88 Q135 59 158 42 Q170 32 185 28 Q200 25 205 24 Q210 25 225 29 Q250 36 238 59 Q226 83 240 116 Q254 148 244 184 Q238 208 240 240Z" fill="#1c3e10" opacity="0.82"/>
          <ellipse cx="200" cy="31" rx="46" ry="22" fill="#1d5612"/>
          <ellipse cx="200" cy="31" rx="38" ry="17" fill="#246c18"/>
          <circle cx="200" cy="31" r="4" fill="rgba(255,255,255,.8)"/>
          <line x1="200" y1="35" x2="200" y2="48" stroke="#608040" strokeWidth="1.5"/>
          <polygon points="200,15 214,27 200,39" fill="#A8E063" opacity="0.95"/>
          <line x1="200" y1="196" x2="200" y2="35" stroke="rgba(168,224,99,0.2)" strokeWidth="1" strokeDasharray="5,4"/>
          <circle cx="200" cy="196" r="14" fill="rgba(168,224,99,0.08)" stroke="rgba(168,224,99,0.28)" strokeWidth="1.2"/>
          <circle cx="200" cy="196" r="6" fill="#A8E063"/>
          <circle cx="200" cy="196" r="2.5" fill="rgba(0,0,0,.85)"/>
        </svg>

        {/* ヘッダー */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(env(safe-area-inset-top) + 8px) 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg,rgba(0,0,0,.72) 0%,transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => { setSelected(null); resetAllCourseState() }} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#C5F08A', fontFamily: 'Inter', fontWeight: 600, letterSpacing: '.1em' }}>HOLE {hole}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>{activeCourseName}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: position ? '#A8E063' : '#e05070' }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,.65)' }}>
              {position ? `GPS ±${position.accuracy}m` : 'GPS未取得'}
            </span>
          </div>
        </div>
      </div>

      {/* スクロールパネル（flex: 1 で残り全高を占有） */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'white', borderRadius: '18px 18px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,.25)', borderTop: '2px solid rgba(168,224,99,.2)', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div style={{ padding: '16px 14px 0' }}>
          <div style={{ width: 32, height: 2.5, background: 'linear-gradient(90deg,var(--g3),var(--lime))', borderRadius: 2, margin: '0 auto 13px' }} />

          {/* グリーン選択トグル（ダブルグリーンのみ表示） */}
          {activeGreenType === 'double' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['left', 'right'] as const).map((side) => {
                const active = greenSide === side
                return (
                  <button key={side} onClick={() => setGreenSide(side)} style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'white' : 'var(--mute)', background: active ? 'var(--g2)' : 'var(--surf)', border: active ? '1px solid var(--g2)' : '1px solid var(--line)', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    {side === 'left'
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
                    }
                    {side === 'left' ? '左グリーン' : '右グリーン'}
                  </button>
                )
              })}
            </div>
          )}

          {/* 距離表示 + HOLEボックス */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            {position ? (
              <div>
                <div style={{ fontSize: 8, color: 'var(--mute)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 2 }}>{greenTitle}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 700, color: 'var(--g1)', lineHeight: 1, letterSpacing: '-.03em' }}>{greenDist?.center ?? '—'}</span>
                  {typeof greenDist?.center === 'number' && <span style={{ fontFamily: 'Inter', fontSize: 17, color: 'var(--g3)', opacity: .7, fontWeight: 500 }}>y</span>}
                </div>
                {greenDist?.isApprox && <div style={{ fontSize: 8, color: 'var(--mute)', marginTop: 1 }}>※概算</div>}
                <div style={{ fontSize: 8, color: 'var(--pale)', marginTop: 1 }}>GPS精度 ±{position.accuracy}m</div>
              </div>
            ) : (
              <div style={{ padding: '12px 0', color: 'var(--mute)', fontSize: 13 }}>
                GPS取得中...
              </div>
            )}

            {/* HOLE ボックス（罫線付き・２行） */}
            <div style={{ border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 18px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: 'var(--mute)', letterSpacing: '.18em' }}>HOLE</div>
              <div style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: 800, color: 'var(--g1)', lineHeight: 1.1 }}>{hole}</div>
            </div>
          </div>

          {/* スコア入力セクション */}
          <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 14px' }} />

          {/* スコア入力コントロール */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => updateScore(hole - 1, currentScore === 0 ? currentPar - 1 : currentScore - 1)}
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--line)', background: 'var(--surf)', fontSize: 20, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >−</button>
              <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: scoreDiff !== null ? getJudgmentColor(scoreDiff) : 'var(--line)', minWidth: 40, textAlign: 'center', lineHeight: 1 }}>
                {currentScore === 0 ? '−' : currentScore}
              </div>
              <button
                onClick={() => updateScore(hole - 1, currentScore === 0 ? currentPar : currentScore + 1)}
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--g3)', background: 'rgba(13,61,43,.06)', fontSize: 20, fontWeight: 700, color: 'var(--g2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >+</button>
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, color: 'var(--mute)', marginTop: 4 }}>
              Par {currentPar}
            </div>
          </div>
          {scoreDiff !== null && (
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: getJudgmentColor(scoreDiff), marginTop: -12, marginBottom: 16 }}>{getJudgment(scoreDiff)}</div>
          )}

          {/* ホールスコアサマリー */}
          <div style={{ borderTop: '1px solid var(--line)', marginBottom: 14, paddingTop: 14 }}>
            {gpsSections.map((section, sIdx) => (
              <div key={sIdx}>
                <div style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '.12em', marginBottom: 8 }}>{section.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3, marginBottom: 12 }}>
                  {Array.from({ length: 9 }, (_, i) => {
                    const holeIdx = section.startHole + i
                    const par = section.pars[i] ?? 4
                    const s = scores[holeIdx]
                    const diff = s > 0 ? s - par : null
                    return (
                      <div key={i} onClick={() => setHole(holeIdx + 1)} style={{ textAlign: 'center', cursor: 'pointer', padding: '4px 0', borderRadius: 5, background: hole === holeIdx + 1 ? 'rgba(13,61,43,.08)' : 'transparent' }}>
                        <div style={{ fontSize: 8, color: 'var(--mute)', fontFamily: 'Inter' }}>{holeIdx + 1}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: diff !== null ? getJudgmentColor(diff) : 'var(--line)' }}>{s || '—'}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--mute)' }}>OUT {scores.slice(0, 9).reduce((a, b) => a + b, 0) || '—'}</span>
              {gpsHoleCount >= 18 && <span style={{ fontSize: 10, color: 'var(--mute)' }}>IN {scores.slice(9, 18).reduce((a, b) => a + b, 0) || '—'}</span>}
              {gpsHoleCount >= 27 && <span style={{ fontSize: 10, color: 'var(--mute)' }}>3rd {scores.slice(18, 27).reduce((a, b) => a + b, 0) || '—'}</span>}
              <span style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 800, color: 'var(--g1)' }}>TOTAL {scores.slice(0, gpsHoleCount).reduce((a, b) => a + b, 0) || '—'}</span>
            </div>
          </div>

          {/* ラウンド終了・スコア保存ボタン */}
          <button
            onClick={allFilled && !saving ? handleSaveRound : undefined}
            style={{ width: '100%', background: saving ? 'var(--mute)' : allFilled ? 'var(--g1)' : '#c8cfc8', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: allFilled && !saving ? 'pointer' : 'default', marginBottom: 4, transition: 'background .2s' }}
          >
            {saving ? '保存中...' : allFilled ? 'ラウンド終了・スコア保存' : `ラウンド終了・スコア保存（${scores.slice(0, gpsHoleCount).filter(s => s > 0).length}/${gpsHoleCount}）`}
          </button>
        </div>

        {/* BottomNav分の余白 */}
        <div style={{ height: 90 }} />
      </div>
      <BottomNav />

      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '32px 24px 48px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--g1),var(--g2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {Icons.pin(26, 'white')}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>GPS計測はスタンダードプラン以上</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>スタンダードプラン（月額490円）にアップグレードすると、GPS距離計測・スコア記録・コンペ参加など全機能が使えます。</div>
            <button onClick={() => router.push('/subscription')} style={{ width: '100%', background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>プランをアップグレード</button>
            <button onClick={() => setShowUpgradeModal(false)} style={{ width: '100%', background: 'none', border: 'none', fontSize: 13, color: 'var(--mute)', cursor: 'pointer', padding: '8px' }}>キャンセル</button>
          </div>
        </div>
      )}
    </div>
  )
}
