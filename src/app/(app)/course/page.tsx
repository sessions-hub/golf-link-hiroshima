'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canHostComp, type Plan } from '@/lib/plan'
import { addPoints } from '@/lib/points'
import PointToast from '@/components/PointToast'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface GoraCourse {
  golfCourseId: number
  golfCourseName: string
  golfCourseAbbr: string
  prefecture: string
  address: string
  golfCourseImageUrl: string
  golfCourseCaption: string
  evaluation: number
  golfCourseDetailUrl: string
  reserveCalUrl: string
  highestPrice: number
  lowestPrice: number
  holes: number
}

interface Competition {
  id: string
  organizer_id: string
  title: string
  description: string | null
  course_name: string
  comp_date: string
  format: string
  max_players: number
  fee: number
  status: string
  created_at: string
  entries_count?: number
  is_entered?: boolean
}

const COURSE_FILTERS = ['広島県', '山口県', '岡山県', '島根県']

const FORMAT_OPTIONS = ['ストロークプレー', 'ダブルペリア', 'ステーブルフォード', 'マッチプレー']


const getPlanBadge = (plan: Plan) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

export default function CoursePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'course' | 'comp'>('course')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'comp') setActiveTab('comp')
  }, [])
  const [courseFilter, setCourseFilter] = useState('広島県')
  const [searchText, setSearchText] = useState('')
  const [goraCourses, setGoraCourses] = useState<GoraCourse[]>([])
  const [courseLoading, setCourseLoading] = useState(false)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [myId, setMyId] = useState('')
  const [myPlan, setMyPlan] = useState('free')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const [toast, setToast] = useState<{ pts: number; k: number } | null>(null)

  // コンペ作成フォーム
  const [title, setTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [compDate, setCompDate] = useState('')
  const [format, setFormat] = useState('ストロークプレー')
  const [maxPlayers, setMaxPlayers] = useState(24)
  const [fee, setFee] = useState(5000)
  const [description, setDescription] = useState('')
  const [compImage, setCompImage] = useState<File | null>(null)
  const [compPdf, setCompPdf] = useState<File | null>(null)
  const [compImagePreview, setCompImagePreview] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // プラン・プロフィール・コンペ・コース を並列取得
      const [plan] = await Promise.all([
        getUserPlan(),
        supabase.from('profiles').select('plan').eq('user_id', user.id).single()
          .then(({ data: prof }) => { if (prof) setMyPlan(prof.plan) }),
        fetchCompetitions(user.id),
        fetchCourses('広島県'),
      ])
      setUserPlan(plan)
      setLoading(false)
    }
    init()
  }, [])

  const handleCourseSearch = () => {
    const q = searchText.trim()
    if (q) {
      setCourseFilter('')
      fetchCourses(q)
    }
  }

  const fetchCourses = async (keyword: string) => {
    setCourseLoading(true)
    try {
      const res = await fetch(`/api/gora?keyword=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      if (data.Items) {
        const allCourses = data.Items.map((item: any) => item.Item)
        // 住所でフィルタリング（北海道の北広島市を除外）
        const filtered = allCourses.filter((c: any) => {
          const addr = c.address ?? ''
          if (keyword === '広島' || keyword === '廿日市' || keyword === '東広島' || keyword === '福山') {
            return addr.includes('広島県')
          }
          if (keyword === '山口') {
            return addr.includes('山口県')
          }
          return true
        })
        setGoraCourses(filtered.length > 0 ? filtered : allCourses)
      }
    } catch (error) {
      console.error('Course fetch error:', error)
    }
    setCourseLoading(false)
  }

  const fetchCompetitions = async (userId: string) => {
    // コンペ一覧と自分の参加状況を並列取得（N+1を解消）
    const [{ data }, { data: myEntries }] = await Promise.all([
      supabase.from('competitions').select('*, comp_entries(count)').order('comp_date', { ascending: true }),
      supabase.from('comp_entries').select('comp_id').eq('user_id', userId),
    ])
    if (data) {
      const enteredSet = new Set(myEntries?.map((e: any) => e.comp_id) ?? [])
      setCompetitions(data.map((c: any) => ({
        ...c,
        entries_count: Number(c.comp_entries?.[0]?.count ?? 0),
        is_entered: enteredSet.has(c.id),
      })))
    }
  }

  const handleCreateComp = async () => {
    if (!title || !courseName || !compDate) return
    setCreating(true)

    let imageUrl: string | null = null
    let pdfUrl: string | null = null

    if (compImage) {
      const fileName = `${myId}/${Date.now()}_image`
      const { error: uploadError } = await supabase.storage
        .from('comp-files')
        .upload(fileName, compImage, { contentType: compImage.type, upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('comp-files').getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }
    }

    if (compPdf) {
      const fileName = `${myId}/${Date.now()}_pdf`
      const { error: uploadError } = await supabase.storage
        .from('comp-files')
        .upload(fileName, compPdf, { contentType: 'application/pdf', upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('comp-files').getPublicUrl(fileName)
        pdfUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('competitions').insert({
      organizer_id: myId,
      title,
      course_name: courseName,
      comp_date: compDate,
      format,
      max_players: maxPlayers,
      fee,
      description: description || null,
      image_url: imageUrl,
      pdf_url: pdfUrl,
      status: 'recruiting',
    })

    if (!error) {
      addPoints(supabase, myId, 200)
      setToast(t => ({ pts: 200, k: (t?.k ?? 0) + 1 }))
      await fetchCompetitions(myId)
      setShowCreateModal(false)
      setTitle('')
      setCourseName('')
      setCompDate('')
      setDescription('')
      setCompImage(null)
      setCompPdf(null)
      setCompImagePreview(null)
    }
    setCreating(false)
  }

  const handleEntry = async (compId: string, isEntered: boolean) => {
    if (!myId) return
    if (isEntered) {
      await supabase.from('comp_entries').delete()
        .eq('comp_id', compId).eq('user_id', myId)
    } else {
      await supabase.from('comp_entries').insert({
        comp_id: compId,
        user_id: myId,
        status: 'confirmed',
      })
      addPoints(supabase, myId, 50)
      setToast(t => ({ pts: 50, k: (t?.k ?? 0) + 1 }))
      // 主催者にプッシュ通知
      const comp = competitions.find(c => c.id === compId)
      if (comp?.organizer_id) {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: comp.organizer_id,
            title: 'GLH. コンペに参加者が来ました！',
            body: `${comp.title}に新しい参加者が申し込みました`,
            url: '/course',
          }),
        })
      }
    }
    await fetchCompetitions(myId)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {toast && <PointToast key={toast.k} amount={toast.pts} onDone={() => setToast(null)} />}

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        {(() => { const b = getPlanBadge(userPlan); return <span style={{ background: b.bg, color: b.color, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>{b.label}</span> })()}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['course', 'comp'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {tab === 'course' ? Icons.golf(14, 'currentColor') : Icons.trophy(14, 'currentColor')}
              {tab === 'course' ? 'ゴルフ場予約' : 'コンペ'}
            </span>
          </button>
        ))}
      </div>

      {/* ゴルフ場予約タブ */}
      {activeTab === 'course' && (
        <>
          <div style={{ background: 'white', padding: '10px 16px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '8px 12px', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCourseSearch()}
                  placeholder="コース名・エリアで検索"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)' }}
                />
                {searchText && (
                  <button onClick={() => { setSearchText(''); fetchCourses('広島県') }} style={{ background: 'none', border: 'none', color: 'var(--mute)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>
              <button onClick={handleCourseSearch} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>検索</button>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {COURSE_FILTERS.map((f) => (
                <button key={f} onClick={() => { setCourseFilter(f); fetchCourses(f) }} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: `1px solid ${courseFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: courseFilter === f ? 'var(--g2)' : 'var(--mid)', background: courseFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: courseFilter === f ? 600 : 400 }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
            {courseLoading && <SectionLoading text="コースを検索中" />}
            {!courseLoading && goraCourses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: 12, color: "var(--mute)" }}>{Icons.golf(32, "var(--mute)")}</div>
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>コースが見つかりませんでした</div>
              </div>
            )}
            {!courseLoading && goraCourses.map((c) => (
              <div key={c.golfCourseId} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                {c.golfCourseImageUrl && (
                  <img src={c.golfCourseImageUrl} alt={c.golfCourseName} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                )}
                {!c.golfCourseImageUrl && (
                  <div style={{ height: 72, background: 'var(--g1)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{c.golfCourseName}</div>
                  </div>
                )}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{c.golfCourseName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--mute)' }}>{c.address}</div>
                    {c.lowestPrice > 0 && (
                      <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)', flexShrink: 0, marginLeft: 8 }}>¥{c.lowestPrice?.toLocaleString()}〜</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(Math.round(c.evaluation ?? 0))}</span>
                    <span style={{ fontSize: 10, color: 'var(--mute)' }}>{c.evaluation}</span>
                  </div>
                  {c.golfCourseCaption && (
                    <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.golfCourseCaption}</div>
                  )}
                  <a href={c.golfCourseDetailUrl || c.reserveCalUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                    楽天GORAで予約する →
                  </a>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '8px 16px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.7 }}>※ 楽天GORAのアフィリエイトリンク経由で予約されます</div>
            </div>
          </div>
        </>
      )}

      {/* コンペタブ */}
      {activeTab === 'comp' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
          <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'flex-end' }}>
            {canHostComp(userPlan) ? (
              <button onClick={() => setShowCreateModal(true)} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>＋ 主催する</button>
            ) : (
              <button onClick={() => router.push('/subscription')} style={{ background: 'rgba(168,224,99,.15)', color: 'rgba(168,224,99,.8)', border: '1px solid rgba(168,224,99,.3)', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>プレミアム以上で主催する</button>
            )}
          </div>
          {loading && <SectionLoading />}

          {!loading && competitions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ marginBottom: 12, color: "var(--mute)" }}>{Icons.trophy(32, "var(--mute)")}</div>
              <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>コンペがまだありません</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 20 }}>プレミアム以上の会員になるとコンペを主催できます</div>
              {!canHostComp(userPlan) && (
                <button onClick={() => router.push('/subscription')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>プレミアムに申し込む</button>
              )}
            </div>
          )}

          {competitions.map((c) => (
            <div key={c.id} onClick={() => router.push(`/course/${c.id}`)} style={{ margin: '0 16px 10px', borderRadius: 12, padding: 15, cursor: 'pointer', border: c.organizer_id === myId ? '1px solid rgba(168,224,99,.35)' : '1px solid var(--line)', background: c.organizer_id === myId ? 'rgba(168,224,99,.04)' : 'white', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'Inter' }}>
                  {new Date(c.comp_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {c.organizer_id === myId && <span style={{ marginLeft: 6, background: 'var(--lime)', color: 'var(--g1)', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>主催</span>}
                </div>
                <span style={{ background: c.status === 'recruiting' ? 'var(--lime)' : 'var(--surf)', color: c.status === 'recruiting' ? 'var(--g1)' : 'var(--mute)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: c.status !== 'recruiting' ? '1px solid var(--line)' : 'none' }}>
                  {c.status === 'recruiting' ? '募集中' : c.status === 'closed' ? '締切' : '終了'}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 10 }}>{c.course_name} · {c.format}</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[
                  { v: `${c.entries_count}/${c.max_players}`, k: '参加者' },
                  { v: `¥${c.fee.toLocaleString()}`, k: '参加費' },
                ].map((s) => (
                  <div key={s.k} style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)' }}>{s.k}</div>
                  </div>
                ))}
              </div>

              {c.description && (
                <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 10 }}>{c.description}</div>
              )}
              {(c as any).image_url && (
                <img src={(c as any).image_url} alt="コンペ画像" style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 200, objectFit: 'cover' }} />
              )}
              {(c as any).pdf_url && (
                <a href={(c as any).pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, textDecoration: 'none', color: 'var(--g2)', fontSize: 12, fontWeight: 600 }}>
                  <span>📄</span> 要項PDFを見る
                </a>
              )}

              {c.status === 'recruiting' && c.organizer_id !== myId && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEntry(c.id, c.is_entered ?? false) }}
                  style={{ width: '100%', background: c.is_entered ? 'var(--surf)' : 'var(--g1)', color: c.is_entered ? 'var(--mute)' : 'white', border: c.is_entered ? '1px solid var(--line)' : 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {c.is_entered ? '参加キャンセル' : '参加申し込み'}
                </button>
              )}

              {c.organizer_id === myId && (
                <div style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', marginTop: 4 }}>あなたが主催するコンペです</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* コンペ作成モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>コンペを主催する</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>

            {[
              { label: 'コンペ名', value: title, setter: setTitle, placeholder: 'GLH. 春季オープンコンペ' },
              { label: 'コース名', value: courseName, setter: setCourseName, placeholder: '広島カントリークラブ' },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>開催日</div>
              <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>競技形式</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FORMAT_OPTIONS.map((f) => (
                  <button key={f} onClick={() => setFormat(f)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: `1px solid ${format === f ? 'var(--g3)' : 'var(--line)'}`, color: format === f ? 'var(--g2)' : 'var(--mid)', background: format === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: format === f ? 600 : 400 }}>{f}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>定員</div>
                <input type="number" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>参加費（円）</div>
                <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>説明（任意）</div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="コンペの詳細・注意事項など" rows={3} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            </div>

            {/* 写真アップロード */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>コンペ画像（任意）</div>
              {compImagePreview && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img src={compImagePreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => { setCompImage(null); setCompImagePreview(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                <span style={{ fontSize: 16 }}>📷</span>
                <span style={{ fontSize: 13, color: 'var(--mid)' }}>{compImage ? compImage.name : '画像を選択'}</span>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setCompImage(file)
                  setCompImagePreview(URL.createObjectURL(file))
                }} style={{ display: 'none' }} />
              </label>
            </div>

            {/* PDFアップロード */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>要項PDF（任意）</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontSize: 13, color: compPdf ? 'var(--g2)' : 'var(--mid)', fontWeight: compPdf ? 600 : 400 }}>{compPdf ? compPdf.name : 'PDFを選択'}</span>
                <input type="file" accept=".pdf" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setCompPdf(file)
                }} style={{ display: 'none' }} />
              </label>
              {compPdf && (
                <button onClick={() => setCompPdf(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--mute)', fontSize: 11, cursor: 'pointer' }}>× PDFを削除</button>
              )}
            </div>

            <button onClick={handleCreateComp} disabled={creating || !title || !courseName || !compDate} style={{ width: '100%', background: creating || !title || !courseName || !compDate ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? '作成中...' : 'コンペを作成する'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
