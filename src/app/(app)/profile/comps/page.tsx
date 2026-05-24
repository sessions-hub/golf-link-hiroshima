'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'
import BottomNav from '@/components/layout/BottomNav'

interface CompEntry {
  comp_id: string
  created_at: string
  competitions: {
    id: string
    title: string
    course_name: string
    comp_date: string
    max_players: number
    fee: number
    status: string
    format: string
    entries_count?: number
  }
}

export default function CompsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [entries, setEntries] = useState<CompEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data } = await supabase
        .from('comp_entries')
        .select('comp_id, created_at, competitions(*, comp_entries(count))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setEntries(data.map((e: any) => ({
          ...e,
          competitions: {
            ...e.competitions,
            entries_count: Number(e.competitions?.comp_entries?.[0]?.count ?? 0),
          },
        })))
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleCancel = async (compId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このコンペへの参加をキャンセルしますか？')) return
    await supabase.from('comp_entries').delete().eq('comp_id', compId).eq('user_id', myId)
    setEntries(prev => prev.filter(en => en.comp_id !== compId))
  }

  if (loading) return <PageLoading />

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = entries.filter(e => new Date(e.competitions.comp_date) >= today)
  const played = entries.filter(e => new Date(e.competitions.comp_date) < today)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>参加コンペ一覧</div>
      </div>

      {/* 統計バナー */}
      <div style={{ background: 'linear-gradient(135deg, var(--g1), var(--g2))', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'TOTAL', value: entries.length },
            { label: 'UPCOMING', value: upcoming.length },
            { label: 'PLAYED', value: played.length },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.1em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0 90px' }}>

        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><path d="M7 4h10l-1 7a5 5 0 01-10 0z"/><path d="M5 4H2v2a4 4 0 004 4M19 4h3v2a4 4 0 01-4 4"/></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 6 }}>まだコンペへの参加履歴がありません</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 20 }}>コースページからコンペに参加してみましょう</div>
            <button onClick={() => router.push('/course?tab=comp')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>コンペページへ</button>
          </div>
        )}

        {/* 参加予定 */}
        {upcoming.length > 0 && (
          <>
            <div style={{ padding: '8px 20px 6px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>参加予定</div>
            {upcoming.map((e) => {
              const c = e.competitions
              const dateStr = new Date(c.comp_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
              return (
                <div key={e.comp_id} onClick={() => router.push(`/course/${e.comp_id}`)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 8 }}>{c.course_name} · {dateStr}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--mid)' }}>{c.format}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--g2)', fontWeight: 600 }}>¥{c.fee.toLocaleString()}</span>
                    {c.entries_count !== undefined && (
                      <span style={{ fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--mid)' }}>{c.entries_count}/{c.max_players}名</span>
                    )}
                  </div>
                  <button
                    onClick={(ev) => handleCancel(e.comp_id, ev)}
                    style={{ width: '100%', background: 'var(--surf)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, color: '#c05050', cursor: 'pointer' }}
                  >
                    参加をキャンセル
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* 参加済み */}
        {played.length > 0 && (
          <>
            <div style={{ padding: '8px 20px 6px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>参加済み</div>
            {played.map((e) => {
              const c = e.competitions
              const dateStr = new Date(c.comp_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
              return (
                <div key={e.comp_id} onClick={() => router.push(`/course/${e.comp_id}`)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px', cursor: 'pointer', opacity: 0.75 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 8 }}>{c.course_name} · {dateStr}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--mid)' }}>{c.format}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--mid)', fontWeight: 600 }}>¥{c.fee.toLocaleString()}</span>
                    {c.entries_count !== undefined && (
                      <span style={{ fontSize: 11, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--mid)' }}>{c.entries_count}/{c.max_players}名</span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
