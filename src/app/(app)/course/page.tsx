'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

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

const COURSES = [
  { id: 1, name: '広島カントリークラブ', area: '広島市安佐北区', holes: 18, par: 72, price: 9200, status: 'open', times: ['7:30', '9:00', '10:30'], day: '土曜', url: 'https://www.gora.jp' },
  { id: 2, name: '広島若草カントリークラブ', area: '安佐北区', holes: 18, par: 72, price: 7800, status: 'few', times: ['6:45', '8:15'], day: '日曜', url: 'https://www.gora.jp' },
  { id: 3, name: '廿日市カントリークラブ', area: '廿日市市', holes: 18, par: 72, price: 8500, status: 'open', times: ['7:00', '8:30', '10:00'], day: '土曜', url: 'https://www.gora.jp' },
]

const COURSE_FILTERS = ['今週末', '平日格安', '2名〜', '早朝']

const FORMAT_OPTIONS = ['ストロークプレー', 'ダブルペリア', 'ステーブルフォード', 'マッチプレー']

export default function CoursePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'course' | 'comp'>('course')
  const [courseFilter, setCourseFilter] = useState('今週末')
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [myPlan, setMyPlan] = useState('free')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // コンペ作成フォーム
  const [title, setTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [compDate, setCompDate] = useState('')
  const [format, setFormat] = useState('ストロークプレー')
  const [maxPlayers, setMaxPlayers] = useState(24)
  const [fee, setFee] = useState(5000)
  const [description, setDescription] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single()
      if (prof) setMyPlan(prof.plan)

      await fetchCompetitions(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const fetchCompetitions = async (userId: string) => {
    const { data } = await supabase
      .from('competitions')
      .select('*, comp_entries(count)')
      .order('comp_date', { ascending: true })

    if (data) {
      const comps = await Promise.all(data.map(async (c: any) => {
        const { data: entry } = await supabase
          .from('comp_entries')
          .select('id')
          .eq('comp_id', c.id)
          .eq('user_id', userId)
          .single()
        return {
          ...c,
          entries_count: Number(c.comp_entries?.[0]?.count ?? 0),
          is_entered: !!entry,
        }
      }))
      setCompetitions(comps)
    }
  }

  const handleCreateComp = async () => {
    if (!title || !courseName || !compDate) return
    setCreating(true)

    const { error } = await supabase.from('competitions').insert({
      organizer_id: myId,
      title,
      course_name: courseName,
      comp_date: compDate,
      format,
      max_players: maxPlayers,
      fee,
      description: description || null,
      status: 'recruiting',
    })

    if (!error) {
      await fetchCompetitions(myId)
      setShowCreateModal(false)
      setTitle('')
      setCourseName('')
      setCompDate('')
      setDescription('')
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
    }
    await fetchCompetitions(myId)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        {activeTab === 'comp' && (myPlan === 'premium') && (
          <button onClick={() => setShowCreateModal(true)} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>＋ 主催する</button>
        )}
        {activeTab === 'comp' && myPlan !== 'premium' && (
          <button onClick={() => router.push('/subscription')} style={{ background: 'rgba(168,224,99,.15)', color: 'rgba(168,224,99,.8)', border: '1px solid rgba(168,224,99,.3)', borderRadius: 7, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>プレミアムで主催</button>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['course', 'comp'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'course' ? '⛳ ゴルフ場予約' : '🏆 コンペ'}
          </button>
        ))}
      </div>

      {/* ゴルフ場予約タブ */}
      {activeTab === 'course' && (
        <>
          <div style={{ background: 'white', padding: '10px 16px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--line)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span style={{ fontSize: 13, color: 'var(--mute)' }}>エリア・コース名で検索</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {COURSE_FILTERS.map((f) => (
                <button key={f} onClick={() => setCourseFilter(f)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer', border: `1px solid ${courseFilter === f ? 'var(--g3)' : 'var(--line)'}`, color: courseFilter === f ? 'var(--g2)' : 'var(--mid)', background: courseFilter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: courseFilter === f ? 600 : 400 }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
            {COURSES.map((c) => (
              <div key={c.id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div style={{ height: 72, background: 'var(--g1)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(168,224,99,.7)', letterSpacing: '.1em' }}>{c.day} {c.times[0]}〜</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginTop: 2 }}>{c.name}</div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--mute)' }}>{c.area} · {c.holes}H · Par{c.par}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>¥{c.price.toLocaleString()}〜</div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ background: c.status === 'few' ? 'var(--lime)' : 'var(--surf)', color: c.status === 'few' ? 'var(--g1)' : 'var(--g3)', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: c.status !== 'few' ? '1px solid var(--line)' : 'none' }}>
                      {c.status === 'few' ? '残2枠' : '空きあり'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--mute)' }}>{c.times.join(' / ')}</span>
                  </div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                    予約サイトで予約する →
                  </a>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '8px 16px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.7 }}>※ 予約は楽天GORAなど外部サイトにて承ります</div>
            </div>
          </div>
        </>
      )}

      {/* コンペタブ */}
      {activeTab === 'comp' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)', fontSize: 13 }}>読み込み中...</div>}

          {!loading && competitions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>コンペがまだありません</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 20 }}>プレミアム会員になるとコンペを主催できます</div>
              {myPlan !== 'premium' && (
                <button onClick={() => router.push('/subscription')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>プレミアムに申し込む</button>
              )}
            </div>
          )}

          {competitions.map((c) => (
            <div key={c.id} style={{ margin: '0 16px 10px', borderRadius: 12, padding: 15, cursor: 'pointer', border: c.organizer_id === myId ? '1px solid rgba(168,224,99,.35)' : '1px solid var(--line)', background: c.organizer_id === myId ? 'rgba(168,224,99,.04)' : 'white', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
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

              {c.status === 'recruiting' && c.organizer_id !== myId && (
                <button
                  onClick={() => handleEntry(c.id, c.is_entered ?? false)}
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

            <button onClick={handleCreateComp} disabled={creating || !title || !courseName || !compDate} style={{ width: '100%', background: creating || !title || !courseName || !compDate ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? '作成中...' : 'コンペを作成する 🏆'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
