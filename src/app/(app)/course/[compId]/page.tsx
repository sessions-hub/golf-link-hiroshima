'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addPoints } from '@/lib/points'
import { PageLoading } from '@/components/LoadingDots'
import BottomNav from '@/components/layout/BottomNav'
import GenderBadge from '@/components/GenderBadge'



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
  image_url: string | null
  pdf_url: string | null
  created_at: string
}

function computeEffectiveStatus(comp: Pick<Competition, 'comp_date' | 'entry_deadline' | 'status'>): 'recruiting' | 'closed' | 'finished' {
  const now = new Date()
  const [y, m, d] = comp.comp_date.split('-').map(Number)
  const compEndOfDay = new Date(y, m - 1, d + 1)
  if (comp.status === 'recruiting') {
    if (now >= compEndOfDay) return 'finished'
    return 'recruiting'
  }
  if (comp.status === 'closed' || comp.status === 'full' || comp.status === 'cancelled') return 'closed'
  if (now >= compEndOfDay) return 'finished'
  const deadline = comp.entry_deadline
    ? new Date(comp.entry_deadline)
    : new Date(y, m - 1, d - 1, 23, 59, 0)
  if (now >= deadline) return 'closed'
  return 'recruiting'
}

interface Profile {
  user_id: string
  nickname: string
  avatar_url: string | null
  handicap: number
  gender: string | null
}

export default function CompDetailPage() {
  const router = useRouter()
  const params = useParams()
  const compId = params.compId as string
  const supabase = createClient()

  const [comp, setComp] = useState<Competition | null>(null)
  const [organizer, setOrganizer] = useState<Profile | null>(null)
  const [entries, setEntries] = useState<Profile[]>([])
  const [myId, setMyId] = useState('')
  const [isEntered, setIsEntered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastDone, setBroadcastDone] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const [showAttendeesModal, setShowAttendeesModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [rawEntriesData, setRawEntriesData] = useState<{user_id: string, attendees_count: number | null}[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: compData } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', compId)
        .single()

      if (!compData) { router.push('/course'); return }

      const [{ data: orgData }, { data: entriesData }, { data: myEntry }] = await Promise.all([
        supabase.from('profiles').select('user_id, nickname, avatar_url, handicap, gender')
          .eq('user_id', compData.organizer_id).single(),
        supabase.from('comp_entries').select('user_id, attendees_count, profiles(user_id, nickname, avatar_url, gender)')
          .eq('comp_id', compId),
        supabase.from('comp_entries').select('comp_id')
          .eq('comp_id', compId).eq('user_id', user.id).maybeSingle(),
      ])

      const totalAttendeesCount = (entriesData ?? []).reduce((sum: number, e: any) => sum + (e.attendees_count ?? 1), 0)

      const isDeadlinePassed = !!(compData.entry_deadline && new Date(compData.entry_deadline) < new Date())
      const isFull = totalAttendeesCount >= compData.max_players

      let updatedStatus = compData.status
      if (compData.status === 'recruiting') {
        if (isDeadlinePassed) {
          await supabase.from('competitions').update({ status: 'closed' }).eq('id', compId)
          updatedStatus = 'closed'
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-competition-closed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ compId, reason: 'deadline' }),
          })
        } else if (isFull) {
          await supabase.from('competitions').update({ status: 'full' }).eq('id', compId)
          updatedStatus = 'full'
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-competition-closed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ compId, reason: 'full' }),
          })
        }
      }
      setComp({ ...compData, status: updatedStatus })

      if (orgData) setOrganizer(orgData)
      if (entriesData) {
        setRawEntriesData(entriesData.map((e: any) => ({ user_id: e.user_id, attendees_count: e.attendees_count })))
        setEntries(entriesData.map((e: any) => e.profiles).filter(Boolean))
      }
      setIsEntered(!!myEntry)

      const lastSeen = localStorage.getItem(`comp_chat_last_seen_${compId}`)
      if (lastSeen) {
        const { count } = await supabase
          .from('comp_group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('comp_id', compId)
          .gt('created_at', lastSeen)
        setUnreadCount(count ?? 0)
      } else {
        const { count } = await supabase
          .from('comp_group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('comp_id', compId)
        setUnreadCount(count ?? 0)
      }

      setLoading(false)
    }
    init()
  }, [compId])

  const handleEntryClick = () => {
    if (!myId || !comp) return
    if (isEntered) {
      setShowCancelConfirm(true)
    } else {
      setShowAttendeesModal(true)
    }
  }

  const handleEnterWithAttendees = async (attendeesCount: number) => {
    if (!myId || !comp) return
    setShowAttendeesModal(false)
    setEntering(true)
    await supabase.from('comp_entries').insert({ comp_id: comp.id, user_id: myId, status: 'confirmed', attendees_count: attendeesCount })
    setIsEntered(true)
    addPoints(supabase, myId, 100)
    if (comp.organizer_id) {
      const isRound = comp.type === 'round'
      await Promise.all([
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: comp.organizer_id,
            title: isRound ? 'GLH. ラウンド募集に参加者が来ました！' : 'GLH. コンペに参加者が来ました！',
            body: `${comp.title}に新しい参加者が申し込みました`,
            url: `/course/${comp.id}`,
          }),
        }),
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-competition-entry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ compId: comp.id, applicantId: myId }),
        }),
      ])
    }
    setEntering(false)
  }

  const handleCancelConfirm = async () => {
    if (!myId || !comp) return
    setShowCancelConfirm(false)
    setEntering(true)
    const cancelledCount = rawEntriesData.find(e => e.user_id === myId)?.attendees_count ?? 1
    const currentTotal = rawEntriesData.reduce((sum, e) => sum + (e.attendees_count ?? 1), 0)
    const newTotal = currentTotal - cancelledCount
    await supabase.from('comp_entries').delete().eq('comp_id', comp.id).eq('user_id', myId)
    setIsEntered(false)
    setRawEntriesData(prev => prev.filter(e => e.user_id !== myId))
    setEntries(prev => prev.filter(e => e.user_id !== myId))
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-competition-cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ compId: comp.id, applicantId: myId }),
    })
    if ((comp.status === 'closed' || comp.status === 'full') && newTotal < comp.max_players) {
      await supabase.from('competitions').update({ status: 'recruiting' }).eq('id', comp.id)
      setComp(prev => prev ? { ...prev, status: 'recruiting' } : prev)
    }
    setEntering(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!comp) return
    setChangingStatus(true)
    await supabase.from('competitions').update({ status: newStatus }).eq('id', comp.id)
    setComp(prev => prev ? { ...prev, status: newStatus } : prev)
    setChangingStatus(false)
    setStatusChangeTarget(null)
  }

  if (loading) return <PageLoading />
  if (!comp) return null

  const isRound = comp.type === 'round'
  const isOrganizer = comp.organizer_id === myId
  const totalAttendees = rawEntriesData.reduce((sum, e) => sum + (e.attendees_count ?? 1), 0)
  const remaining = comp.max_players - totalAttendees
  const [cy, cm, cd] = comp.comp_date.split('-').map(Number)
  const dateStr = new Date(cy, cm - 1, cd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const effectiveStatus = computeEffectiveStatus(comp)
  const statusLabel = comp.status === 'recruiting' ? (effectiveStatus === 'finished' ? '終了' : '募集中')
    : comp.status === 'cancelled' ? '中止'
    : comp.status === 'full' ? '満員'
    : comp.status === 'closed' ? '締切'
    : effectiveStatus === 'finished' ? '終了'
    : effectiveStatus === 'closed' ? '締切'
    : '募集中'
  const heroBadgeBg = comp.status === 'recruiting' ? (effectiveStatus === 'finished' ? 'rgba(255,255,255,.2)' : 'var(--lime)')
    : comp.status === 'cancelled' ? '#ef4444'
    : comp.status === 'full' ? '#f97316'
    : comp.status === 'closed' ? 'rgba(255,255,255,.2)'
    : effectiveStatus === 'finished' ? 'rgba(255,255,255,.2)'
    : effectiveStatus === 'closed' ? 'rgba(255,255,255,.2)'
    : 'var(--lime)'
  const heroBadgeColor = comp.status === 'recruiting' ? (effectiveStatus === 'finished' ? 'rgba(255,255,255,.8)' : 'var(--g1)')
    : comp.status === 'cancelled' || comp.status === 'full' ? 'white'
    : comp.status === 'closed' ? 'rgba(255,255,255,.8)'
    : effectiveStatus === 'finished' ? 'rgba(255,255,255,.8)'
    : effectiveStatus === 'closed' ? 'rgba(255,255,255,.8)'
    : 'var(--g1)'
  const deadlineDate = comp.entry_deadline
    ? new Date(comp.entry_deadline)
    : new Date(cy, cm - 1, cd - 1, 23, 59, 0)
  const deadlineStr = deadlineDate.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const heroStats = isRound
    ? [
        { label: '参加者', value: `${totalAttendees}/${comp.max_players}` },
        { label: '残り枠', value: remaining > 0 ? `${remaining}枠` : '満員' },
      ]
    : [
        { label: '形式', value: comp.format },
        { label: '参加者', value: `${totalAttendees}/${comp.max_players}` },
        { label: '残り枠', value: remaining > 0 ? `${remaining}枠` : '満員' },
        { label: '参加費', value: `¥${comp.fee.toLocaleString()}` },
      ]

  const eventInfoRows = isRound
    ? [
        { label: 'コース名', value: comp.course_name },
        { label: '開催日', value: dateStr },
        { label: '締切日時', value: deadlineStr },
        { label: '定員', value: `${comp.max_players}名` },
      ]
    : [
        { label: 'コース名', value: comp.course_name },
        { label: '開催日', value: dateStr },
        { label: '締切日時', value: deadlineStr },
        { label: '形式', value: comp.format },
        { label: '定員', value: `${comp.max_players}名` },
        { label: '参加費', value: `¥${comp.fee.toLocaleString()}` },
      ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/course')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isRound ? 'ラウンド募集詳細' : 'コンペ詳細'}
        </div>
      </div>

      <div style={{ paddingBottom: 90 }}>

        {/* ヒーローバナー */}
        <div style={{ background: 'linear-gradient(135deg, var(--g1), var(--g2))', padding: '24px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: heroBadgeBg, color: heroBadgeColor, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {statusLabel}
              </span>
              {isRound && (
                <span style={{ background: 'rgba(22,163,74,.25)', color: 'white', border: '1px solid rgba(255,255,255,.4)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  ⛳ ラウンド募集
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontFamily: 'Inter' }}>{dateStr}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.3 }}>{comp.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {heroStats.map((s) => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>{s.label}</span>
                <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: 'white' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 開催情報 */}
        <div style={{ background: 'white', margin: '10px 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>開催情報</div>
          {eventInfoRows.map((info) => (
            <div key={info.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--surf)' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{info.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{info.value}</span>
            </div>
          ))}
        </div>

        {/* 詳細テキスト */}
        {comp.description && (
          <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              {isRound ? 'ラウンド詳細' : 'コンペ詳細'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.8 }}>{comp.description}</div>
          </div>
        )}

        {/* コンペ画像（compのみ） */}
        {!isRound && comp.image_url && (
          <div style={{ margin: '0 16px 10px' }}>
            <img src={comp.image_url} alt="コンペ画像" style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />
          </div>
        )}

        {/* 要項PDF（compのみ） */}
        {!isRound && comp.pdf_url && (
          <div style={{ margin: '0 16px 10px' }}>
            <a href={comp.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none' }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g2)' }}>要項PDFを見る</div>
                <div style={{ fontSize: 11, color: 'var(--mute)' }}>タップして開く</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </a>
          </div>
        )}

        {/* 主催者プロフィール */}
        {organizer && (
          <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>主催者</div>
            <div onClick={() => router.push(`/user/${organizer.user_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden' }}>
                {organizer.avatar_url
                  ? <img src={organizer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : organizer.nickname?.[0] ?? '?'
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 4 }}>{organizer.nickname}<GenderBadge gender={organizer.gender} size={13} /></div>
                <div style={{ fontSize: 12, color: 'var(--mute)' }}>HCP {organizer.handicap}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          </div>
        )}

        {/* 主催者メニュー */}
        {isOrganizer && (
          <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>主催者メニュー</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => router.push(`/course/${comp.id}/edit`)}
                style={{ width: '100%', background: 'rgba(46,125,85,.08)', color: 'var(--g2)', border: '1px solid rgba(46,125,85,.25)', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                編集する
              </button>
              {(comp.status === 'recruiting' || comp.status === 'full') && (
                <button
                  onClick={() => setStatusChangeTarget('recruiting' === comp.status ? 'full' : 'recruiting')}
                  style={{ width: '100%', background: comp.status === 'recruiting' ? 'rgba(249,115,22,.1)' : 'rgba(46,125,85,.1)', color: comp.status === 'recruiting' ? '#f97316' : 'var(--g2)', border: `1px solid ${comp.status === 'recruiting' ? 'rgba(249,115,22,.3)' : 'rgba(46,125,85,.3)'}`, borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {comp.status === 'recruiting' ? '満員にする' : '募集再開'}
                </button>
              )}
              {comp.status === 'cancelled' && (
                <button
                  onClick={() => setStatusChangeTarget('recruiting')}
                  style={{ width: '100%', background: 'rgba(46,125,85,.1)', color: 'var(--g2)', border: '1px solid rgba(46,125,85,.3)', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  募集再開
                </button>
              )}
              {comp.status !== 'cancelled' && (
                <button
                  onClick={() => setStatusChangeTarget('cancelled')}
                  style={{ width: '100%', background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  中止にする
                </button>
              )}
            </div>
          </div>
        )}

        {/* 参加者一覧 */}
        <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>参加者 {totalAttendees}名</div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center', padding: '8px 0' }}>まだ参加者がいません</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {entries.map((p) => {
                const count = rawEntriesData.find(r => r.user_id === p.user_id)?.attendees_count ?? 1
                return (
                <div key={p.user_id} onClick={() => router.push(`/user/${p.user_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ position: 'relative', width: 44, height: 44 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : p.nickname?.[0] ?? '?'
                      }
                    </div>
                    {count > 1 && (
                      <div style={{ position: 'absolute', bottom: 0, right: -2, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--g1)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', padding: '0 3px' }}>+{count - 1}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--txt)', maxWidth: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</div>
                    <GenderBadge gender={p.gender} size={10} />
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* グループチャットバナー（締切・終了時） */}
        {(effectiveStatus === 'closed' || effectiveStatus === 'finished' || comp.status === 'full' || comp.status === 'cancelled') && (isEntered || isOrganizer) && (
          <div
            onClick={() => router.push(`/comp/${comp.id}/chat`)}
            style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg, var(--g1), var(--g2))', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>参加者グループチャット</div>
                {isRound
                  ? <span style={{ background: 'rgba(22,163,74,.35)', color: 'white', border: '1px solid rgba(255,255,255,.4)', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>⛳ ラウンド</span>
                  : <span style={{ background: 'rgba(245,158,11,.35)', color: 'white', border: '1px solid rgba(255,255,255,.4)', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>🏆 コンペ</span>
                }
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>参加者・主催者と連絡を取り合えます</div>
            </div>
            {unreadCount > 0 && (
              <div style={{ background: '#ff4444', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 4px' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
        )}

        {/* 主催者向け一斉メール（compのみ） */}
        {isOrganizer && !isRound && (
          <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>参加者への一斉メール</div>
            <textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="参加者へのメッセージを入力..."
              rows={4}
              style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => { if (broadcastMsg.trim()) setShowBroadcastConfirm(true) }}
              disabled={!broadcastMsg.trim() || broadcastDone}
              style={{ marginTop: 10, width: '100%', background: broadcastDone ? 'var(--surf)' : !broadcastMsg.trim() ? 'var(--mute)' : 'var(--g2)', color: broadcastDone ? 'var(--mute)' : 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: broadcastMsg.trim() && !broadcastDone ? 'pointer' : 'not-allowed' }}
            >
              {broadcastDone ? '送信完了 ✓' : '参加者全員にメール送信'}
            </button>
          </div>
        )}

        {/* 参加ボタン */}
        <div style={{ padding: '0 16px 10px' }}>
          {(comp.status !== 'cancelled' && comp.status !== 'closed' && comp.status !== 'full' && (isOrganizer || effectiveStatus === 'recruiting')) ? (
            <button
              onClick={handleEntryClick}
              disabled={entering}
              style={{ width: '100%', background: isEntered ? 'var(--surf)' : 'var(--g1)', color: isEntered ? 'var(--mute)' : 'white', border: isEntered ? '1px solid var(--line)' : 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: entering ? 'not-allowed' : 'pointer' }}
            >
              {entering ? '処理中...' : isEntered ? '参加をキャンセル' : '参加申し込み'}
            </button>
          ) : null}
        </div>

      </div>

      {/* 参加人数選択モーダル */}
      {showAttendeesModal && (
        <>
          <div onClick={() => setShowAttendeesModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 20, textAlign: 'center' }}>参加人数を選択</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  disabled={n > remaining}
                  onClick={() => handleEnterWithAttendees(n)}
                  style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '18px 0', fontSize: 15, fontWeight: 700, cursor: n > remaining ? 'not-allowed' : 'pointer', opacity: n > remaining ? 0.3 : 1 }}
                >
                  {n}人
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAttendeesModal(false)}
              style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
            >キャンセル</button>
          </div>
        </>
      )}

      {/* 参加キャンセル確認モーダル */}
      {showCancelConfirm && (
        <>
          <div onClick={() => setShowCancelConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>参加をキャンセル</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 24, lineHeight: 1.7 }}>この参加をキャンセルします。よろしいですか？</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
              >戻る</button>
              <button
                onClick={handleCancelConfirm}
                disabled={entering}
                style={{ flex: 2, background: '#c05050', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: entering ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {entering ? 'キャンセル中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ステータス変更確認モーダル */}
      {statusChangeTarget && (
        <>
          <div onClick={() => setStatusChangeTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>
              {statusChangeTarget === 'full' ? '満員にする' : statusChangeTarget === 'cancelled' ? '中止にする' : '募集再開'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 24, lineHeight: 1.7 }}>
              {statusChangeTarget === 'full' && (isRound ? 'この募集を満員に設定します。新規参加申し込みができなくなります。' : 'このコンペを満員に設定します。新規参加申し込みができなくなります。')}
              {statusChangeTarget === 'cancelled' && (isRound ? 'この募集を中止にします。参加者への連絡は別途行ってください。' : 'このコンペを中止にします。参加者への連絡は別途行ってください。')}
              {statusChangeTarget === 'recruiting' && (isRound ? 'この募集を再開します。' : 'このコンペの募集を再開します。')}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStatusChangeTarget(null)}
                style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
              >キャンセル</button>
              <button
                onClick={() => handleStatusChange(statusChangeTarget)}
                disabled={changingStatus}
                style={{ flex: 2, background: statusChangeTarget === 'cancelled' ? '#ef4444' : statusChangeTarget === 'full' ? '#f97316' : 'var(--g1)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: changingStatus ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {changingStatus ? '変更中...' : '変更する'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 一斉メール確認モーダル */}
      {showBroadcastConfirm && (
        <>
          <div onClick={() => setShowBroadcastConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>参加者全員にメール送信</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>以下のメッセージを{entries.length}名の参加者全員に送信します。よろしいですか？</div>
            <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '12px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap', maxHeight: 120 }}>{broadcastMsg}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowBroadcastConfirm(false)}
                style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
              >キャンセル</button>
              <button
                onClick={async () => {
                  setBroadcasting(true)
                  try {
                    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/comp-broadcast-email`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                      },
                      body: JSON.stringify({ compId: comp.id, organizerId: myId, message: broadcastMsg }),
                    })
                    setBroadcastDone(true)
                    setBroadcastMsg('')
                  } finally {
                    setBroadcasting(false)
                    setShowBroadcastConfirm(false)
                  }
                }}
                disabled={broadcasting}
                style={{ flex: 2, background: 'var(--g1)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: broadcasting ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {broadcasting ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
