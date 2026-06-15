'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'

const FORMAT_OPTIONS = ['ストロークプレー', 'ダブルペリア', 'ステーブルフォード', 'マッチプレー']

function fieldLabel(text: string) {
  return (
    <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>
      {text}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surf)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '11px 14px',
  fontSize: 13,
  color: 'var(--txt)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function EditCompPage() {
  const router = useRouter()
  const params = useParams()
  const compId = params.compId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [comp, setComp] = useState<any>(null)
  const [myId, setMyId] = useState('')
  const [totalAttendees, setTotalAttendees] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<any>(null)

  // フォーム状態
  const [title, setTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [compDate, setCompDate] = useState('')
  const [format, setFormat] = useState('ストロークプレー')
  const [maxPlayers, setMaxPlayers] = useState(24)
  const [fee, setFee] = useState(0)
  const [description, setDescription] = useState('')
  const [entryDeadlineDate, setEntryDeadlineDate] = useState('')
  const [entryDeadlineTime, setEntryDeadlineTime] = useState('')

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
      if (compData.organizer_id !== user.id) { router.push(`/course/${compId}`); return }

      setComp(compData)
      setTitle(compData.title)
      setCourseName(compData.course_name)
      setCompDate(compData.comp_date)
      setFormat(compData.format ?? 'ストロークプレー')
      setMaxPlayers(compData.max_players)
      setFee(compData.fee ?? 0)
      setDescription(compData.description ?? '')

      if (compData.entry_deadline) {
        const dl = new Date(compData.entry_deadline)
        const pad = (n: number) => String(n).padStart(2, '0')
        setEntryDeadlineDate(`${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())}`)
        setEntryDeadlineTime(`${pad(dl.getHours())}:${pad(dl.getMinutes())}`)
      }

      const { data: entriesData } = await supabase
        .from('comp_entries')
        .select('attendees_count')
        .eq('comp_id', compId)
      if (entriesData) {
        setTotalAttendees(entriesData.reduce((sum: number, e: any) => sum + (e.attendees_count ?? 1), 0))
      }

      setLoading(false)
    }
    init()
  }, [compId])

  const buildUpdate = () => {
    let entryDeadline: string | null = null
    if (entryDeadlineDate) {
      const time = entryDeadlineTime || '23:59'
      entryDeadline = `${entryDeadlineDate}T${time}:00`
    }
    return {
      title,
      course_name: courseName,
      comp_date: compDate,
      entry_deadline: entryDeadline,
      format: isRound ? '' : format,
      max_players: maxPlayers,
      fee: isRound ? 0 : fee,
      description: description || null,
    }
  }

  const handleSave = () => {
    setFormError(null)
    if (!title.trim() || !courseName.trim() || !compDate) {
      setFormError('タイトル・コース・開催日は必須です')
      return
    }
    if (maxPlayers < totalAttendees) {
      setFormError(`定員は現在の参加者数（${totalAttendees}名）以上に設定してください`)
      return
    }

    const update = buildUpdate()

    // 開催日または締切が変更されており参加者がいる場合は通知確認モーダルを表示
    const origDate = comp.comp_date
    const origDeadline = comp.entry_deadline ? new Date(comp.entry_deadline).getTime() : null
    const newDeadline = update.entry_deadline ? new Date(update.entry_deadline).getTime() : null
    const dateOrDeadlineChanged = compDate !== origDate || origDeadline !== newDeadline

    if (dateOrDeadlineChanged && totalAttendees > 0) {
      setPendingUpdate(update)
      setShowNotifyModal(true)
    } else {
      performSave(update, false)
    }
  }

  const performSave = async (update: any, notify: boolean) => {
    setSaving(true)
    setShowNotifyModal(false)

    const { error: updateError } = await supabase
      .from('competitions')
      .update(update)
      .eq('id', compId)

    if (updateError) {
      setFormError(`更新に失敗しました: ${updateError.message}`)
      setSaving(false)
      return
    }

    if (notify) {
      const [y, m, d] = update.comp_date.split('-').map(Number)
      const dateStr = new Date(y, m - 1, d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
      const deadlineStr = update.entry_deadline
        ? new Date(update.entry_deadline).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : ''
      const label = isRound ? 'ラウンド募集' : 'コンペ'
      const message = `${label}「${update.title}」の情報が更新されました。\n\n開催日：${dateStr}${deadlineStr ? `\n募集締切：${deadlineStr}` : ''}`
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/comp-broadcast-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ compId, organizerId: myId, message }),
      })
    }

    router.push(`/course/${compId}`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('competitions').delete().eq('id', compId)
    router.push('/course')
  }

  if (loading) return <PageLoading />
  if (!comp) return null

  const isRound = comp.type === 'round'
  const label = isRound ? 'ラウンド募集' : 'コンペ'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => router.push(`/course/${compId}`)}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', flex: 1 }}>{label}を編集</div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {formError && (
          <div style={{ background: 'rgba(200,60,60,.08)', border: '1px solid rgba(200,60,60,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#c05050', lineHeight: 1.6 }}>
            ⚠ {formError}
          </div>
        )}

        {/* タイトル */}
        <div style={{ marginBottom: 14 }}>
          {fieldLabel('タイトル')}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isRound ? '朝活ラウンド仲間を募集します' : 'GLH. 春季オープンコンペ'}
            style={inputStyle}
          />
        </div>

        {/* コース */}
        <div style={{ marginBottom: 14 }}>
          {fieldLabel('コース')}
          <input
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            placeholder="広島カントリークラブ"
            style={inputStyle}
          />
        </div>

        {/* 開催日 */}
        <div style={{ marginBottom: 14 }}>
          {fieldLabel('開催日')}
          <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} style={inputStyle} />
        </div>

        {/* 募集締切 */}
        <div style={{ marginBottom: 14 }}>
          {fieldLabel('募集締切日時（任意・未設定時は開催前日23:59）')}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={entryDeadlineDate}
              onChange={e => setEntryDeadlineDate(e.target.value)}
              style={{ ...inputStyle, flex: 3, color: entryDeadlineDate ? 'var(--txt)' : 'var(--mute)' }}
            />
            <input
              type="time"
              value={entryDeadlineTime}
              onChange={e => setEntryDeadlineTime(e.target.value)}
              disabled={!entryDeadlineDate}
              style={{ ...inputStyle, flex: 2, color: entryDeadlineTime ? 'var(--txt)' : 'var(--mute)', opacity: entryDeadlineDate ? 1 : 0.4 }}
            />
          </div>
          {entryDeadlineDate && (
            <button
              onClick={() => { setEntryDeadlineDate(''); setEntryDeadlineTime('') }}
              style={{ marginTop: 5, background: 'none', border: 'none', color: 'var(--mute)', fontSize: 11, cursor: 'pointer' }}
            >× クリア</button>
          )}
        </div>

        {/* 競技形式（compのみ） */}
        {!isRound && (
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('競技形式')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: `1px solid ${format === f ? 'var(--g3)' : 'var(--line)'}`, color: format === f ? 'var(--g2)' : 'var(--mid)', background: format === f ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: format === f ? 600 : 400 }}
                >{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* 定員（comp: 数値入力 / round: 1〜4ボタン） */}
        <div style={{ marginBottom: 14 }}>
          {fieldLabel(`定員${totalAttendees > 0 ? `（現在の参加者数：${totalAttendees}名）` : ''}`)}
          {isRound ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  disabled={n < totalAttendees}
                  style={{
                    padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: n < totalAttendees ? 'not-allowed' : 'pointer',
                    border: `1.5px solid ${maxPlayers === n ? 'var(--g2)' : 'var(--line)'}`,
                    color: n < totalAttendees ? 'var(--mute)' : maxPlayers === n ? 'var(--g2)' : 'var(--mid)',
                    background: n < totalAttendees ? 'var(--surf)' : maxPlayers === n ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                    opacity: n < totalAttendees ? 0.4 : 1,
                  }}
                >
                  {n}名
                </button>
              ))}
            </div>
          ) : (
            <input
              type="number"
              value={maxPlayers}
              min={totalAttendees || 1}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              style={inputStyle}
            />
          )}
        </div>

        {/* 参加費（compのみ） */}
        {!isRound && (
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('参加費（円）')}
            <input
              type="number"
              value={fee}
              onChange={e => setFee(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}

        {/* 詳細・メッセージ */}
        <div style={{ marginBottom: 24 }}>
          {fieldLabel(isRound ? '詳細・メッセージ（任意）' : '説明（任意）')}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={isRound
              ? '朝7時集合でゆっくり18ホール回りましょう。プレー費は約12,000円（カート・昼食込み）。初心者の方も大歓迎です！'
              : 'コンペの詳細・注意事項など'}
            rows={4}
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* 更新ボタン */}
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !courseName.trim() || !compDate}
          style={{ width: '100%', background: saving || !title.trim() || !courseName.trim() || !compDate ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 12 }}
        >
          {saving ? '更新中...' : '更新する'}
        </button>

        {/* 削除ボタン */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{ width: '100%', background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          この{label}を削除する
        </button>

      </div>

      {/* 日程変更通知確認モーダル */}
      {showNotifyModal && (
        <>
          <div onClick={() => setShowNotifyModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>変更内容を保存</div>
            <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 24, lineHeight: 1.7 }}>
              開催日または募集締切が変更されています。{totalAttendees}名の参加者に変更通知メールを送りますか？
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => performSave(pendingUpdate, true)}
                disabled={saving}
                style={{ width: '100%', background: 'var(--g1)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {saving ? '保存中...' : '保存して参加者に通知する'}
              </button>
              <button
                onClick={() => performSave(pendingUpdate, false)}
                disabled={saving}
                style={{ width: '100%', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--txt)' }}
              >
                通知せずに保存する
              </button>
              <button
                onClick={() => setShowNotifyModal(false)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '8px', fontSize: 13, color: 'var(--mute)', cursor: 'pointer' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)', zIndex: 301 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>この{label}を削除</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 24, lineHeight: 1.7 }}>
              「{comp.title}」を削除します。参加者の情報もすべて削除されます。この操作は取り消せません。
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--txt)' }}
              >戻る</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 2, background: '#ef4444', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
