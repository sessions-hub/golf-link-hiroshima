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
  const [greenDist, setGreenDist] = useState<{ center: number } | null>(null)
  const [greenSide, setGreenSide] = useState<'single' | 'left' | 'right'>('single')
  const [searchText, setSearchText] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)
  const [scores, setScores] = useState<number[]>(Array(18).fill(0))
  const [saving, setSaving] = useState(false)
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

  const selectCourse = (course: GoraCourse & { distKm: number }) => {
    if (!canUseGPS(userPlan)) { setShowUpgradeModal(true); return }
    setSelected(course)
    setHole(1)
    setScores(Array(18).fill(0))
    setGreenSide('single')
    if (myId) { addPoints(supabase, myId, 50); setToast(t => ({ pts: 50, k: (t?.k ?? 0) + 1 })) }
    if (position && course.latitude && course.longitude) {
      const distM = calcDistance(position.lat, position.lng, course.latitude, course.longitude) * 1000
      const center = mToY(distM)
      setGreenDist({ center })
    }
  }

  const filteredCourses = courses.filter(c =>
    c.golfCourseName?.includes(searchText) || c.address?.includes(searchText)
  )

  const updateScore = (holeIdx: number, val: number) => {
    if (val < 1 || val > 15) return
    setScores(prev => { const n = [...prev]; n[holeIdx] = val; return n })
  }

  const handleSaveRound = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const total = scores.reduce((a, b) => a + b, 0)
    const outScore = scores.slice(0, 9).reduce((a, b) => a + b, 0)
    const inScore = scores.slice(9, 18).reduce((a, b) => a + b, 0)
    const { error } = await supabase.from('scorecards').insert({
      user_id: user.id,
      course_name: selected?.golfCourseName ?? '',
      hole_scores: scores,
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

  const greenTitle =
    greenSide === 'left' ? '左グリーンセンターまで' :
    greenSide === 'right' ? '右グリーンセンターまで' :
    'グリーンセンターまで'

  const currentPar = DEFAULT_PARS[hole - 1] ?? 4
  const currentScore = scores[hole - 1]
  const scoreDiff = currentScore > 0 ? currentScore - currentPar : null

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
          {loadingCourses && (
            <SectionLoading text="コースを読み込み中" />
          )}
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

  // GPS計測画面
  return (
    <div style={{ minHeight: '100vh', background: '#070f07', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {toast && <PointToast key={toast.k} amount={toast.pts} onDone={() => setToast(null)} />}
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

        {/* ヘッダー */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(env(safe-area-inset-top) + 8px) 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg,rgba(0,0,0,.72) 0%,transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ background: 'rgba(168,224,99,.25)', border: '1px solid rgba(168,224,99,.5)', borderRadius: 20, padding: '2px 9px', fontSize: 9, color: '#C5F08A', fontFamily: 'Inter', fontWeight: 600 }}>HOLE {hole}</div>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>{selected.golfCourseName}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: position ? '#A8E063' : '#e05070' }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,.65)' }}>
              {position ? `GPS ±${position.accuracy}m` : 'GPS未取得'}
            </span>
          </div>
        </div>

        {/* 下部スクロールパネル */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '78vh', overflowY: 'auto', background: 'white', borderRadius: '18px 18px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,.25)', borderTop: '2px solid rgba(168,224,99,.2)' }}>
          <div style={{ padding: '16px 14px 0' }}>
            <div style={{ width: 32, height: 2.5, background: 'linear-gradient(90deg,var(--g3),var(--lime))', borderRadius: 2, margin: '0 auto 13px' }} />

            {/* ホール選択 */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 13, overflowX: 'auto' }}>
              {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
                <button key={h} onClick={() => setHole(h)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: hole === h ? 'var(--g1)' : 'var(--surf)', color: hole === h ? 'var(--lime)' : 'var(--mute)', fontFamily: 'Inter', fontSize: 11, fontWeight: 700 }}>{h}</button>
              ))}
            </div>

            {/* グリーン選択トグル */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['single', 'left', 'right'] as const).map((side) => {
                const label = side === 'single' ? '1グリーン' : side === 'left' ? '左グリーン' : '右グリーン'
                const active = greenSide === side
                return (
                  <button key={side} onClick={() => setGreenSide(side)} style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: active ? 700 : 500, color: active ? 'var(--g1)' : 'var(--mute)', background: active ? 'rgba(13,61,43,.08)' : 'var(--surf)', border: active ? '1px solid rgba(13,61,43,.25)' : '1px solid var(--line)', borderRadius: 7, cursor: 'pointer' }}>{label}</button>
                )
              })}
            </div>

            {greenDist ? (
              <div>
                <div style={{ fontSize: 8, color: 'var(--mute)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 2 }}>{greenTitle}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 700, color: 'var(--g1)', lineHeight: 1, letterSpacing: '-.03em' }}>{greenDist.center}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 17, color: 'var(--g3)', opacity: .7, fontWeight: 500 }}>y</span>
                </div>
                <div style={{ fontSize: 8, color: 'var(--pale)', marginTop: 1 }}>GPS精度 ±{position?.accuracy ?? '?'}m</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mute)', fontSize: 13 }}>
                GPS取得中...現在地からの距離を計算します
              </div>
            )}

            {/* スコア入力セクション */}
            <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 14px' }} />

            {/* ホール番号と前後移動 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button
                onClick={() => setHole(h => Math.max(1, h - 1))}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mid)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              </button>
              <div style={{ background: 'var(--g1)', borderRadius: 12, padding: '8px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', fontFamily: 'Inter', letterSpacing: '.15em' }}>HOLE</div>
                <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: '#A8E063', lineHeight: 1 }}>{hole}</div>
              </div>
              <button
                onClick={() => setHole(h => Math.min(18, h + 1))}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surf)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mid)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
              </button>
            </div>

            {/* スコア入力コントロール */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {/* 左：Par + 判定 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500 }}>Par {currentPar}</div>
                {scoreDiff !== null && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: getJudgmentColor(scoreDiff), marginTop: 2 }}>{getJudgment(scoreDiff)}</div>
                )}
              </div>

              {/* 中央：スコア数字（大） */}
              <div style={{ fontFamily: 'Inter', fontSize: 52, fontWeight: 800, color: scoreDiff !== null ? getJudgmentColor(scoreDiff) : 'var(--line)', lineHeight: 1, minWidth: 60, textAlign: 'center' }}>
                {currentScore === 0 ? '-' : currentScore}
              </div>

              {/* 右：− ／ + ボタン */}
              <div style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => updateScore(hole - 1, currentScore === 0 ? currentPar - 1 : currentScore - 1)}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--line)', background: 'var(--surf)', fontSize: 20, fontWeight: 700, color: 'var(--mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >−</button>
                <button
                  onClick={() => updateScore(hole - 1, currentScore === 0 ? currentPar : currentScore + 1)}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--g3)', background: 'rgba(13,61,43,.06)', fontSize: 20, fontWeight: 700, color: 'var(--g2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              </div>
            </div>

            {/* ラウンド終了・スコア保存ボタン */}
            <button
              onClick={handleSaveRound}
              disabled={saving}
              style={{ width: '100%', background: saving ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 4 }}
            >
              {saving ? '保存中...' : 'ラウンド終了・スコア保存'}
            </button>
          </div>

          {/* BottomNav分の余白 */}
          <div style={{ height: 90 }} />
        </div>
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
