'use client'
import { useState, useEffect } from 'react'
import { PageLoading } from '@/components/LoadingDots'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [plan, setPlan] = useState('free')
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const [{ data: prof }, { data: sub }] = await Promise.all([
        supabase.from('profiles').select('plan').eq('user_id', user.id).single(),
        supabase.from('subscriptions').select('cancel_at_period_end').eq('user_id', user.id).single(),
      ])
      if (prof) setPlan(prof.plan === 'standard' ? 'premium' : (prof.plan ?? 'free'))
      if (sub) setCancelAtPeriodEnd(sub.cancel_at_period_end ?? false)
      setLoading(false)
    }
    init()
  }, [])

  const isPaidActive = (plan === 'premium' || plan === 'executive') && !cancelAtPeriodEnd

  const handleDelete = async () => {
    if (emailInput !== userEmail) {
      setError('メールアドレスが一致しません')
      return
    }
    setError('')
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: emailInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '退会処理に失敗しました')
        setDeleting(false)
        return
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setError('退会処理に失敗しました')
      setDeleting(false)
    }
  }

  if (loading) return <PageLoading />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#c05050' }}>退会する</div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px 60px', overflowY: 'auto' }}>

        {/* 注意事項 */}
        <div style={{ background: 'rgba(200,60,60,.06)', border: '1px solid rgba(200,60,60,.2)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c05050', marginBottom: 12 }}>退会前にご確認ください</div>
          {[
            '退会するとすべてのデータが削除されます',
            '投稿・チャット履歴・マッチング情報が全て消えます',
            'この操作は取り消せません',
          ].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(200,60,60,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c05050" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <div style={{ fontSize: 13, color: '#c05050', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>

        {/* 有料プラン警告 */}
        {isPaidActive && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>退会前にプランを解約してください</div>
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, marginBottom: 12 }}>
              現在有料プランをご利用中です。退会する前にサブスクリプションを解約してください。
            </div>
            <button
              onClick={() => router.push('/subscription')}
              style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              プラン管理へ →
            </button>
          </div>
        )}

        {/* 退会ボタン（有料プランが解約済みまたはフリープランの場合のみ表示） */}
        {!isPaidActive && (
          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', background: 'white', border: '1.5px solid rgba(200,60,60,.4)', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, color: '#c05050', cursor: 'pointer' }}
          >
            退会する
          </button>
        )}
      </div>

      {/* 確認モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: '24px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c05050', marginBottom: 8, textAlign: 'center' }}>本当に退会しますか？</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
              この操作は取り消せません。確認のためメールアドレスを入力してください。
            </div>

            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>メールアドレス</div>
            <input
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setError('') }}
              placeholder={userEmail}
              type="email"
              autoComplete="off"
              style={{ width: '100%', border: `1.5px solid ${error ? 'rgba(200,60,60,.5)' : 'var(--line)'}`, borderRadius: 8, padding: '11px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none', marginBottom: error ? 6 : 20 }}
            />
            {error && (
              <div style={{ fontSize: 12, color: '#c05050', marginBottom: 16 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setEmailInput(''); setError('') }}
                style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !emailInput}
                style={{ flex: 1, background: deleting || !emailInput ? 'var(--mute)' : '#c05050', color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: deleting || !emailInput ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? '処理中...' : '退会を確定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
