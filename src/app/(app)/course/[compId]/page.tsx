'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addPoints } from '@/lib/points'
import { PageLoading } from '@/components/LoadingDots'
import BottomNav from '@/components/layout/BottomNav'



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
  image_url: string | null
  pdf_url: string | null
  created_at: string
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

interface Profile {
  user_id: string
  nickname: string
  avatar_url: string | null
  handicap: number
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
      setComp(compData)

      const [{ data: orgData }, { data: entriesData }, { data: myEntry }] = await Promise.all([
        supabase.from('profiles').select('user_id, nickname, avatar_url, handicap')
          .eq('user_id', compData.organizer_id).single(),
        supabase.from('comp_entries').select('user_id, profiles(user_id, nickname, avatar_url)')
          .eq('comp_id', compId),
        supabase.from('comp_entries').select('comp_id')
          .eq('comp_id', compId).eq('user_id', user.id).maybeSingle(),
      ])

      if (orgData) setOrganizer(orgData)
      if (entriesData) setEntries(entriesData.map((e: any) => e.profiles).filter(Boolean))
      setIsEntered(!!myEntry)

      // グループチャット未読件数を計算
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

  const handleEntry = async () => {
    if (!myId || !comp) return
    setEntering(true)
    if (isEntered) {
      await supabase.from('comp_entries').delete().eq('comp_id', comp.id).eq('user_id', myId)
      setIsEntered(false)
      setEntries(prev => prev.filter(e => e.user_id !== myId))
    } else {
      await supabase.from('comp_entries').insert({ comp_id: comp.id, user_id: myId, status: 'confirmed' })
      setIsEntered(true)
      addPoints(supabase, myId, 100)
      if (comp.organizer_id) {
        await Promise.all([
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: comp.organizer_id,
              title: 'GLH. コンペに参加者が来ました！',
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
    }
    setEntering(false)
  }

  if (loading) return <PageLoading />
  if (!comp) return null

  const isOrganizer = comp.organizer_id === myId
  const remaining = comp.max_players - entries.length
  const [cy, cm, cd] = comp.comp_date.split('-').map(Number)
  const dateStr = new Date(cy, cm - 1, cd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const effectiveStatus = computeEffectiveStatus(comp)
  const statusLabel = effectiveStatus === 'recruiting' ? '募集中' : effectiveStatus === 'closed' ? '締切' : '終了'
  const deadlineDate = comp.entry_deadline
    ? new Date(comp.entry_deadline)
    : new Date(cy, cm - 1, cd - 1, 23, 59, 0)
  const deadlineStr = deadlineDate.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>コンペ詳細</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

        {/* ヒーローバナー */}
        <div style={{ background: 'linear-gradient(135deg, var(--g1), var(--g2))', padding: '24px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ background: effectiveStatus === 'recruiting' ? 'var(--lime)' : 'rgba(255,255,255,.2)', color: effectiveStatus === 'recruiting' ? 'var(--g1)' : 'rgba(255,255,255,.8)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {statusLabel}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontFamily: 'Inter' }}>{dateStr}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.3 }}>{comp.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { label: '形式', value: comp.format },
              { label: '参加者', value: `${entries.length}/${comp.max_players}` },
              { label: '残り枠', value: remaining > 0 ? `${remaining}枠` : '満員' },
              { label: '参加費', value: `¥${comp.fee.toLocaleString()}` },
            ].map((s) => (
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
          {[
            { label: 'コース名', value: comp.course_name },
            { label: '開催日', value: dateStr },
            { label: '締切日時', value: deadlineStr },
            { label: '形式', value: comp.format },
            { label: '定員', value: `${comp.max_players}名` },
            { label: '参加費', value: `¥${comp.fee.toLocaleString()}` },
          ].map((info) => (
            <div key={info.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--surf)' }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{info.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{info.value}</span>
            </div>
          ))}
        </div>

        {/* コンペ詳細 */}
        {comp.description && (
          <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>コンペ詳細</div>
            <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.8 }}>{comp.description}</div>
          </div>
        )}

        {/* コンペ画像 */}
        {comp.image_url && (
          <div style={{ margin: '0 16px 10px' }}>
            <img src={comp.image_url} alt="コンペ画像" style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />
          </div>
        )}

        {/* 要項PDF */}
        {comp.pdf_url && (
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
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{organizer.nickname}</div>
                <div style={{ fontSize: 12, color: 'var(--mute)' }}>HCP {organizer.handicap}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          </div>
        )}

        {/* 参加者一覧 */}
        <div style={{ background: 'white', margin: '0 16px 10px', borderRadius: 12, border: '1px solid var(--line)', padding: '16px' }}>
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>参加者 {entries.length}名</div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center', padding: '8px 0' }}>まだ参加者がいません</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {entries.map((p) => (
                <div key={p.user_id} onClick={() => router.push(`/user/${p.user_id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : p.nickname?.[0] ?? '?'
                    }
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--txt)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* グループチャットバナー（締切・終了時） */}
        {(effectiveStatus === 'closed' || effectiveStatus === 'finished') && (isEntered || isOrganizer) && (
          <div
            onClick={() => router.push(`/comp/${comp.id}/chat`)}
            style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg, var(--g1), var(--g2))', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>参加者グループチャット</div>
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

        {/* 主催者向け一斉メール */}
        {isOrganizer && (
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
          {isOrganizer ? (
            <div style={{ background: 'rgba(168,224,99,.1)', border: '1px solid rgba(168,224,99,.3)', borderRadius: 10, padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--g2)', fontWeight: 600 }}>
              あなたが主催するコンペです
            </div>
          ) : effectiveStatus === 'recruiting' ? (
            <button
              onClick={handleEntry}
              disabled={entering}
              style={{ width: '100%', background: isEntered ? 'var(--surf)' : 'var(--g1)', color: isEntered ? 'var(--mute)' : 'white', border: isEntered ? '1px solid var(--line)' : 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: entering ? 'not-allowed' : 'pointer' }}
            >
              {entering ? '処理中...' : isEntered ? '参加をキャンセル' : '参加申し込み'}
            </button>
          ) : null}
        </div>

      </div>

      {/* 一斉メール確認モーダル */}
      {showBroadcastConfirm && (
        <>
          <div onClick={() => setShowBroadcastConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>参加者全員にメール送信</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>以下のメッセージを{entries.length}名の参加者全員に送信します。よろしいですか？</div>
            <div style={{ background: 'var(--surf)', borderRadius: 8, padding: '12px', fontSize: 13, color: 'var(--txt)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto' }}>{broadcastMsg}</div>
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
