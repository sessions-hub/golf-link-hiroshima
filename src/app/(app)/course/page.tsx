'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canHostComp, type Plan } from '@/lib/plan'
import { addPoints } from '@/lib/points'
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
  entry_deadline: string | null
  format: string
  max_players: number
  fee: number
  status: string
  type: string
  created_at: string
  entries_count?: number
  is_entered?: boolean
}

function computeEffectiveStatus(comp: Pick<Competition, 'comp_date' | 'entry_deadline'>): 'recruiting' | 'closed' | 'finished' {
  const now = new Date()
  const [y, m, d] = comp.comp_date.split('-').map(Number)
  const compEndOfDay = new Date(y, m - 1, d + 1)
  if (now >= compEndOfDay) return 'finished'
  const deadline = comp.entry_deadline
    ? new Date(comp.entry_deadline)
    : new Date(y, m - 1, d - 1, 23, 59, 0)
  if (now >= deadline) return 'closed'
  return 'recruiting'
}

const COURSE_FILTERS = ['広島県', '山口県', '岡山県', '島根県']
const FORMAT_OPTIONS = ['ストロークプレー', 'ダブルペリア', 'ステーブルフォード', 'マッチプレー']

const getPlanBadge = (plan: Plan) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

const TypeTag = ({ type }: { type: string }) => {
  if (type === 'round') return (
    <span style={{ background: 'rgba(22,163,74,.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,.3)', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>⛳ ラウンド募集</span>
  )
  return (
    <span style={{ background: 'rgba(245,158,11,.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>🏆 コンペ</span>
  )
}

export default function CoursePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'course' | 'comp'>('comp')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'course') setActiveTab('course')
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
  const [compTypeFilter, setCompTypeFilter] = useState<'all' | 'comp' | 'round'>('all')

  // コンペ作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [attendeesModalCompId, setAttendeesModalCompId] = useState<string | null>(null)

  // コンペ作成フォーム
  const [title, setTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [compDate, setCompDate] = useState('')
  const [format, setFormat] = useState('ストロークプレー')
  const [maxPlayers, setMaxPlayers] = useState(24)
  const [fee, setFee] = useState(5000)
  const [description, setDescription] = useState('')
  const [entryDeadlineDate, setEntryDeadlineDate] = useState('')
  const [entryDeadlineTime, setEntryDeadlineTime] = useState('')
  const [compImage, setCompImage] = useState<File | null>(null)
  const [compPdf, setCompPdf] = useState<File | null>(null)
  const [compImagePreview, setCompImagePreview] = useState<string | null>(null)

  // ラウンド募集作成モーダル
  const [showCreateRoundModal, setShowCreateRoundModal] = useState(false)
  const [roundTitle, setRoundTitle] = useState('')
  const [roundCourseName, setRoundCourseName] = useState('')
  const [roundDate, setRoundDate] = useState('')
  const [roundDeadlineDate, setRoundDeadlineDate] = useState('')
  const [roundDeadlineTime, setRoundDeadlineTime] = useState('')
  const [roundMaxPlayers, setRoundMaxPlayers] = useState(4)
  const [roundDescription, setRoundDescription] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

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
    const [{ data }, { data: myEntries }] = await Promise.all([
      supabase.from('competitions').select('*, comp_entries(attendees_count)').order('comp_date', { ascending: true }),
      supabase.from('comp_entries').select('comp_id').eq('user_id', userId),
    ])
    if (data) {
      const enteredSet = new Set(myEntries?.map((e: any) => e.comp_id) ?? [])
      setCompetitions(data.map((c: any) => ({
        ...c,
        entries_count: (c.comp_entries ?? []).reduce((sum: number, e: any) => sum + (e.attendees_count ?? 1), 0),
        is_entered: enteredSet.has(c.id),
      })))
    }
  }

  const handleCreateComp = async () => {
    if (!title || !courseName || !compDate) return
    setCreating(true)
    setCreateError(null)

    let imageUrl: string | null = null
    let pdfUrl: string | null = null

    if (compImage) {
      const fileName = `${myId}/${Date.now()}_image`
      const { error: uploadError } = await supabase.storage
        .from('comp-files')
        .upload(fileName, compImage, { contentType: compImage.type, upsert: true })
      if (uploadError) {
        setCreateError(`画像のアップロードに失敗しました: ${uploadError.message}`)
        setCreating(false)
        return
      }
      const { data } = supabase.storage.from('comp-files').getPublicUrl(fileName)
      imageUrl = data.publicUrl
    }

    if (compPdf) {
      const fileName = `${myId}/${Date.now()}_pdf`
      const { error: uploadError } = await supabase.storage
        .from('comp-files')
        .upload(fileName, compPdf, { contentType: 'application/pdf', upsert: true })
      if (uploadError) {
        setCreateError(`PDFのアップロードに失敗しました: ${uploadError.message}`)
        setCreating(false)
        return
      }
      const { data } = supabase.storage.from('comp-files').getPublicUrl(fileName)
      pdfUrl = data.publicUrl
    }

    let entryDeadline: string | null = null
    if (entryDeadlineDate) {
      const time = entryDeadlineTime || '23:59'
      entryDeadline = `${entryDeadlineDate}T${time}:00`
    } else if (compDate) {
      const [y, m, d] = compDate.split('-').map(Number)
      const prev = new Date(y, m - 1, d - 1)
      const py = prev.getFullYear()
      const pm = String(prev.getMonth() + 1).padStart(2, '0')
      const pd = String(prev.getDate()).padStart(2, '0')
      entryDeadline = `${py}-${pm}-${pd}T23:59:00`
    }

    const { error } = await supabase.from('competitions').insert({
      organizer_id: myId,
      title,
      course_name: courseName,
      comp_date: compDate,
      entry_deadline: entryDeadline,
      format,
      max_players: maxPlayers,
      fee,
      description: description || null,
      image_url: imageUrl,
      pdf_url: pdfUrl,
      status: 'recruiting',
      type: 'comp',
    })

    if (!error) {
      addPoints(supabase, myId, 200)
      await fetchCompetitions(myId)
      setShowCreateModal(false)
      setTitle('')
      setCourseName('')
      setCompDate('')
      setEntryDeadlineDate('')
      setEntryDeadlineTime('')
      setDescription('')
      setCompImage(null)
      setCompPdf(null)
      setCompImagePreview(null)
    } else {
      console.error('competitions insert error:', JSON.stringify(error))
      setCreateError(`[${error.code}] ${error.message}${error.details ? ' / ' + error.details : ''}${error.hint ? ' / hint: ' + error.hint : ''}`)
    }
    setCreating(false)
  }

  const handleCreateRound = async () => {
    if (!roundTitle || !roundCourseName || !roundDate) return
    setCreating(true)
    setCreateError(null)

    let entryDeadline: string | null = null
    if (roundDeadlineDate) {
      const time = roundDeadlineTime || '23:59'
      entryDeadline = `${roundDeadlineDate}T${time}:00`
    } else if (roundDate) {
      const [y, m, d] = roundDate.split('-').map(Number)
      const prev = new Date(y, m - 1, d - 1)
      const py = prev.getFullYear()
      const pm = String(prev.getMonth() + 1).padStart(2, '0')
      const pd = String(prev.getDate()).padStart(2, '0')
      entryDeadline = `${py}-${pm}-${pd}T23:59:00`
    }

    const { error } = await supabase.from('competitions').insert({
      organizer_id: myId,
      title: roundTitle,
      course_name: roundCourseName,
      comp_date: roundDate,
      entry_deadline: entryDeadline,
      format: '',
      max_players: roundMaxPlayers,
      fee: 0,
      description: roundDescription || null,
      status: 'recruiting',
      type: 'round',
    })

    if (!error) {
      addPoints(supabase, myId, 200)
      await fetchCompetitions(myId)
      setShowCreateRoundModal(false)
      setRoundTitle('')
      setRoundCourseName('')
      setRoundDate('')
      setRoundDeadlineDate('')
      setRoundDeadlineTime('')
      setRoundDescription('')
      setRoundMaxPlayers(4)
    } else {
      console.error('round insert error:', JSON.stringify(error))
      setCreateError(`[${error.code}] ${error.message}${error.details ? ' / ' + error.details : ''}`)
    }
    setCreating(false)
  }

  const handleEntryClick = (e: React.MouseEvent, compId: string, isEntered: boolean) => {
    e.stopPropagation()
    if (isEntered) {
      supabase.from('comp_entries').delete()
        .eq('comp_id', compId).eq('user_id', myId)
        .then(() => fetchCompetitions(myId))
    } else {
      setAttendeesModalCompId(compId)
    }
  }

  const handleEnterWithAttendees = async (compId: string, attendeesCount: number) => {
    if (!myId) return
    setAttendeesModalCompId(null)
    await supabase.from('comp_entries').insert({
      comp_id: compId,
      user_id: myId,
      status: 'confirmed',
      attendees_count: attendeesCount,
    })
    addPoints(supabase, myId, 50)
    const comp = competitions.find(c => c.id === compId)
    if (comp?.organizer_id) {
      const isRound = comp.type === 'round'
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: comp.organizer_id,
          title: isRound ? 'GLH. ラウンド募集に参加者が来ました！' : 'GLH. コンペに参加者が来ました！',
          body: `${comp.title}に新しい参加者が申し込みました`,
          url: '/course',
        }),
      })
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-competition-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ compId, applicantId: myId }),
      })
    }
    await fetchCompetitions(myId)
  }

  const filteredCompetitions = competitions.filter(c => {
    if (compTypeFilter === 'comp') return c.type === 'comp'
    if (compTypeFilter === 'round') return c.type === 'round'
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        {(() => { const b = getPlanBadge(userPlan); return <span style={{ background: b.bg, color: b.color, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>{b.label}</span> })()}
      </div>

      {/* タブ：コンペ・ラウンド募集（左）/ 予約（右） */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['comp', 'course'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {tab === 'comp' ? Icons.trophy(14, 'currentColor') : Icons.golf(14, 'currentColor')}
              {tab === 'comp' ? 'コンペ・ラウンド募集' : '予約'}
            </span>
          </button>
        ))}
      </div>

      {/* コンペ・ラウンド募集タブ */}
      {activeTab === 'comp' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
          {/* 主催ボタン */}
          <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 8 }}>
            {canHostComp(userPlan) ? (
              <>
                <button onClick={() => setShowCreateModal(true)} style={{ flex: 1, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 7, padding: '9px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>＋ コンペを主催</button>
                <button onClick={() => setShowCreateRoundModal(true)} style={{ flex: 1, background: 'white', color: 'var(--g2)', border: '1.5px solid var(--g2)', borderRadius: 7, padding: '9px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>＋ ラウンド募集</button>
              </>
            ) : (
              <button onClick={() => router.push('/subscription')} style={{ width: '100%', background: 'rgba(168,224,99,.15)', color: 'rgba(168,224,99,.8)', border: '1px solid rgba(168,224,99,.3)', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>プレミアム以上で主催する</button>
            )}
          </div>

          {/* タイプフィルター */}
          <div style={{ display: 'flex', gap: 6, padding: '4px 16px 8px' }}>
            {(['all', 'comp', 'round'] as const).map(f => (
              <button key={f} onClick={() => setCompTypeFilter(f)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1px solid ${compTypeFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: compTypeFilter === f ? 'var(--g2)' : 'var(--mid)', background: compTypeFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: compTypeFilter === f ? 700 : 400 }}>
                {f === 'all' ? 'すべて' : f === 'comp' ? 'コンペ' : 'ラウンド募集'}
              </button>
            ))}
          </div>

          {loading && <SectionLoading />}

          {!loading && filteredCompetitions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ marginBottom: 12, color: 'var(--mute)' }}>{Icons.trophy(32, 'var(--mute)')}</div>
              <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>コンペ・ラウンド募集がまだありません</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 20 }}>プレミアム以上の会員になるとコンペやラウンドを主催できます</div>
              {!canHostComp(userPlan) && (
                <button onClick={() => router.push('/subscription')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>プレミアムに申し込む</button>
              )}
            </div>
          )}

          {filteredCompetitions.map((c) => (
            <div key={c.id} onClick={() => router.push(`/course/${c.id}`)} style={{ margin: '0 16px 10px', borderRadius: 12, padding: 15, cursor: 'pointer', border: c.organizer_id === myId ? '1px solid rgba(168,224,99,.35)' : '1px solid var(--line)', background: c.organizer_id === myId ? 'rgba(168,224,99,.04)' : 'white', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <TypeTag type={c.type} />
                  <span style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'Inter' }}>
                    {new Date(c.comp_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  {c.organizer_id === myId && <span style={{ background: 'var(--lime)', color: 'var(--g1)', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>主催</span>}
                </div>
                {(() => {
                  const eff = computeEffectiveStatus(c)
                  return (
                    <span style={{ background: eff === 'recruiting' ? 'var(--lime)' : 'var(--surf)', color: eff === 'recruiting' ? 'var(--g1)' : 'var(--mute)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: eff !== 'recruiting' ? '1px solid var(--line)' : 'none', flexShrink: 0 }}>
                      {eff === 'recruiting' ? '募集中' : eff === 'closed' ? '締切' : '終了'}
                    </span>
                  )
                })()}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 10 }}>
                {c.course_name}{c.type === 'comp' && c.format ? ` · ${c.format}` : ''}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {c.type === 'comp' ? (
                  <>
                    {[
                      { v: `${c.entries_count}/${c.max_players}`, k: '参加者' },
                      { v: `¥${c.fee.toLocaleString()}`, k: '参加費' },
                    ].map((s) => (
                      <div key={s.k} style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: 'var(--mute)' }}>{s.k}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ flex: 1, background: 'var(--surf)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{c.entries_count}/{c.max_players}</div>
                    <div style={{ fontSize: 9, color: 'var(--mute)' }}>参加者</div>
                  </div>
                )}
              </div>

              {c.description && (
                <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 10 }}>{c.description}</div>
              )}
              {(c as any).image_url && c.type === 'comp' && (
                <img src={(c as any).image_url} alt="コンペ画像" style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 200, objectFit: 'cover' }} />
              )}
              {(c as any).pdf_url && c.type === 'comp' && (
                <a href={(c as any).pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, textDecoration: 'none', color: 'var(--g2)', fontSize: 12, fontWeight: 600 }}>
                  <span>📄</span> 要項PDFを見る
                </a>
              )}

              {computeEffectiveStatus(c) === 'recruiting' && c.organizer_id !== myId && (
                <button
                  onClick={(e) => handleEntryClick(e, c.id, c.is_entered ?? false)}
                  style={{ width: '100%', background: c.is_entered ? 'var(--surf)' : 'var(--g1)', color: c.is_entered ? 'var(--mute)' : 'white', border: c.is_entered ? '1px solid var(--line)' : 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {c.is_entered ? '参加キャンセル' : '参加申し込み'}
                </button>
              )}

              {c.organizer_id === myId && (
                <div style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', marginTop: 4 }}>あなたが主催する{c.type === 'round' ? 'ラウンド募集' : 'コンペ'}です</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 予約タブ（ゴルフ場検索） */}
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
                <div style={{ marginBottom: 12, color: 'var(--mute)' }}>{Icons.golf(32, 'var(--mute)')}</div>
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

      {/* コンペ作成モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: createError ? 12 : 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>コンペを主催する</div>
              <button onClick={() => { setShowCreateModal(false); setCreateError(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>

            {createError && (
              <div style={{ background: 'rgba(200,60,60,.08)', border: '1px solid rgba(200,60,60,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#c05050', lineHeight: 1.6 }}>
                ⚠ {createError}
              </div>
            )}

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
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>募集締切日時（任意・未設定時は開催前日23:59）</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={entryDeadlineDate} onChange={e => setEntryDeadlineDate(e.target.value)} style={{ flex: 3, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: entryDeadlineDate ? 'var(--txt)' : 'var(--mute)', outline: 'none' }} />
                <input type="time" value={entryDeadlineTime} onChange={e => setEntryDeadlineTime(e.target.value)} disabled={!entryDeadlineDate} style={{ flex: 2, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 10px', fontSize: 13, color: entryDeadlineTime ? 'var(--txt)' : 'var(--mute)', outline: 'none', opacity: entryDeadlineDate ? 1 : 0.4 }} />
              </div>
              {entryDeadlineDate && (
                <button onClick={() => { setEntryDeadlineDate(''); setEntryDeadlineTime('') }} style={{ marginTop: 5, background: 'none', border: 'none', color: 'var(--mute)', fontSize: 11, cursor: 'pointer' }}>× クリア</button>
              )}
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

      {/* ラウンド募集作成モーダル */}
      {showCreateRoundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: createError ? 12 : 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>ラウンド募集を作成</div>
              <button onClick={() => { setShowCreateRoundModal(false); setCreateError(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mute)' }}>×</button>
            </div>

            {createError && (
              <div style={{ background: 'rgba(200,60,60,.08)', border: '1px solid rgba(200,60,60,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#c05050', lineHeight: 1.6 }}>
                ⚠ {createError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>タイトル</div>
              <input value={roundTitle} onChange={e => setRoundTitle(e.target.value)} placeholder="朝活ラウンド仲間を募集します" style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>コース</div>
              <input value={roundCourseName} onChange={e => setRoundCourseName(e.target.value)} placeholder="広島カントリークラブ" style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>開催日</div>
              <input type="date" value={roundDate} onChange={e => setRoundDate(e.target.value)} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>募集締切日時（任意・未設定時は開催前日23:59）</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={roundDeadlineDate} onChange={e => setRoundDeadlineDate(e.target.value)} style={{ flex: 3, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: roundDeadlineDate ? 'var(--txt)' : 'var(--mute)', outline: 'none' }} />
                <input type="time" value={roundDeadlineTime} onChange={e => setRoundDeadlineTime(e.target.value)} disabled={!roundDeadlineDate} style={{ flex: 2, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 10px', fontSize: 13, color: roundDeadlineTime ? 'var(--txt)' : 'var(--mute)', outline: 'none', opacity: roundDeadlineDate ? 1 : 0.4 }} />
              </div>
              {roundDeadlineDate && (
                <button onClick={() => { setRoundDeadlineDate(''); setRoundDeadlineTime('') }} style={{ marginTop: 5, background: 'none', border: 'none', color: 'var(--mute)', fontSize: 11, cursor: 'pointer' }}>× クリア</button>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>募集人数</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setRoundMaxPlayers(n)} style={{ padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${roundMaxPlayers === n ? 'var(--g2)' : 'var(--line)'}`, color: roundMaxPlayers === n ? 'var(--g2)' : 'var(--mid)', background: roundMaxPlayers === n ? 'rgba(46,125,85,.1)' : 'var(--surf)' }}>
                    {n}名
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>詳細・メッセージ（任意）</div>
              <textarea value={roundDescription} onChange={e => setRoundDescription(e.target.value)} placeholder={'朝7時集合でゆっくり18ホール回りましょう。プレー費は約12,000円（カート・昼食込み）。初心者の方も大歓迎です！'} rows={4} style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <button onClick={handleCreateRound} disabled={creating || !roundTitle || !roundCourseName || !roundDate} style={{ width: '100%', background: creating || !roundTitle || !roundCourseName || !roundDate ? 'var(--mute)' : '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? '作成中...' : 'ラウンド募集を作成する'}
            </button>
          </div>
        </div>
      )}

      {attendeesModalCompId && (
        <>
          <div onClick={() => setAttendeesModalCompId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 201 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 20, textAlign: 'center' }}>参加人数を選択</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => handleEnterWithAttendees(attendeesModalCompId, n)}
                  style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '18px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >
                  {n}人
                </button>
              ))}
            </div>
            <button
              onClick={() => setAttendeesModalCompId(null)}
              style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
            >キャンセル</button>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
