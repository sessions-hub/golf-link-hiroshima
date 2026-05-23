'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { getUserPlan, canUseGPS, type Plan } from '@/lib/plan'

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

// 2点間の距離計算（km）
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ヤードをメートルに変換
function mToY(m: number): number {
  return Math.round(m * 1.09361)
}

const getClub = (y: number) => {
  if (y >= 220) return 'Dr'
  if (y >= 200) return '3W'
  if (y >= 185) return '5W'
  if (y >= 170) return '4番I'
  if (y >= 158) return '5番I'
  if (y >= 145) return '6番I'
  if (y >= 133) return '7番I'
  if (y >= 120) return '8番I'
  if (y >= 108) return '9番I'
  return 'PW'
}


const getPlanBadge = (plan: Plan) => {
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'standard') return { label: 'STANDARD', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

export default function GpsPage() {
  const router = useRouter()
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [courses, setCourses] = useState<(GoraCourse & { distKm: number })[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [selected, setSelected] = useState<GoraCourse & { distKm: number } | null>(null)
  const [hole, setHole] = useState(1)
  const [greenDist, setGreenDist] = useState<{ front: number; center: number; back: number } | null>(null)
  const [searchText, setSearchText] = useState('')
  const watchRef = useRef<number | null>(null)
  const lastPositionRef = useRef<GPSPosition | null>(null)
  const lastSortRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    getUserPlan().then(setUserPlan)
  }, [])

  // GPS取得（大きく動いたか精度が改善したときだけ state 更新）
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

  // コース一覧はマウント時に1回だけ取得
  useEffect(() => {
    fetchCourses('広島県')
  }, [])

  // 位置が100m以上変わったときだけ距離を再ソート
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

  // コース選択時にグリーン距離を計算
  const selectCourse = (course: GoraCourse & { distKm: number }) => {
    setSelected(course)
    setHole(1)
    if (position && course.latitude && course.longitude) {
      const distM = calcDistance(position.lat, position.lng, course.latitude, course.longitude) * 1000
      const center = mToY(distM)
      setGreenDist({ front: center - 10, center, back: center + 10 })
    }
  }

  const filteredCourses = courses.filter(c =>
    c.golfCourseName?.includes(searchText) || c.address?.includes(searchText)
  )

  // プラン制限
  if (!canUseGPS(userPlan)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center' }}>
          <Logo />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 20, color: "var(--mute)" }}>{Icons.pin(48, "var(--mute)")}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 10 }}>GPS計測はスタンダードプラン以上</div>
          <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>GPS距離計測機能を使うには<br/>スタンダードプランへのアップグレードが必要です</div>
          <button onClick={() => router.push('/subscription')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>プランをアップグレード</button>
        </div>
        <BottomNav />
      </div>
    )
  }

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
          {/* 検索窓 */}
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
          {/* エリアタブ */}
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
      </div>
    )
  }

  // GPS計測画面
  return (
    <div style={{ minHeight: '100vh', background: '#070f07', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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

        {/* 距離パネル */}
        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, background: 'white', borderRadius: '18px 18px 0 0', padding: '16px 14px 16px', boxShadow: '0 -8px 32px rgba(0,0,0,.25)', borderTop: '2px solid rgba(168,224,99,.2)' }}>
          <div style={{ width: 32, height: 2.5, background: 'linear-gradient(90deg,var(--g3),var(--lime))', borderRadius: 2, margin: '0 auto 13px' }} />

          {/* ホール選択 */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 13, overflowX: 'auto' }}>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
              <button key={h} onClick={() => setHole(h)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: hole === h ? 'var(--g1)' : 'var(--surf)', color: hole === h ? 'var(--lime)' : 'var(--mute)', fontFamily: 'Inter', fontSize: 11, fontWeight: 700 }}>{h}</button>
            ))}
          </div>

          {greenDist ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 11 }}>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--mute)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 2 }}>グリーン センター</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 700, color: 'var(--g1)', lineHeight: 1, letterSpacing: '-.03em' }}>{greenDist.center}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 17, color: 'var(--g3)', opacity: .7, fontWeight: 500 }}>y</span>
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--pale)', marginTop: 1 }}>GPS精度 ±{position?.accuracy ?? '?'}m</div>
                </div>
                <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderLeft: '2.5px solid var(--g3)', borderRadius: 7, padding: '9px 13px', textAlign: 'center' }}>
                  <div style={{ fontSize: 7, color: 'var(--mute)', letterSpacing: '.1em', fontFamily: 'Inter' }}>推奨クラブ</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 19, fontWeight: 700, color: 'var(--g1)', marginTop: 2 }}>{getClub(greenDist.center)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { label: 'FRONT', val: greenDist.front, color: '#3a7a3a', bg: 'var(--off)', border: 'var(--line)' },
                  { label: 'CENTER', val: greenDist.center, color: 'var(--g1)', bg: 'rgba(13,61,43,.06)', border: 'rgba(13,61,43,.18)' },
                  { label: 'BACK', val: greenDist.back, color: '#c05050', bg: 'var(--off)', border: 'var(--line)' },
                ].map((d) => (
                  <div key={d.label} style={{ flex: 1, background: d.bg, borderRadius: 6, padding: 7, textAlign: 'center', border: `1px solid ${d.border}` }}>
                    <div style={{ fontSize: 7, color: 'var(--mute)', letterSpacing: '.1em', fontFamily: 'Inter' }}>{d.label}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: d.color }}>{d.val}</div>
                    <div style={{ fontSize: 7, color: 'var(--pale)' }}>y</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mute)', fontSize: 13 }}>
              GPS取得中...現在地からの距離を計算します
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
