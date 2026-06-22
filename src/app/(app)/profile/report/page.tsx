'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'

const CATEGORIES = [
  { value: '', label: '種類を選択（任意）' },
  { value: '表示崩れ', label: '表示崩れ' },
  { value: '動作しない・エラー', label: '動作しない・エラー' },
  { value: '機能の要望', label: '機能の要望' },
  { value: 'その他', label: 'その他' },
]

export default function BugReportPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    setStatus('idle')

    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const timestamp = jst.toISOString().replace('T', ' ').substring(0, 19) + ' JST'

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-bug-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            category: category || '未選択',
            message: message.trim(),
            email,
            userId,
            userAgent: navigator.userAgent,
            page: window.location.pathname,
            timestamp,
          }),
        }
      )
      if (res.ok) {
        setStatus('success')
        setMessage('')
        setCategory('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
    setSubmitting(false)
  }

  if (loading) return <PageLoading />

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: 14, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ cursor: 'pointer', color: 'var(--g2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          戻る
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)' }}>不具合の報告</div>
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {status === 'success' ? (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>送信しました</div>
            <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7 }}>
              ご報告ありがとうございました。<br/>確認のうえ対応いたします。
            </div>
            <button
              onClick={() => router.back()}
              style={{ marginTop: 20, background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              戻る
            </button>
          </div>
        ) : (
          <>
            {/* 説明 */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.7 }}>
                アプリの不具合・表示崩れ・機能のご要望などをお送りください。いただいた内容はサービス改善に活用させていただきます。
              </div>
            </div>

            {/* フォーム */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>

              {/* 種類 */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surf)' }}>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 6, letterSpacing: '.06em' }}>種類（任意）</div>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: category ? 'var(--txt)' : 'var(--mute)',
                    background: 'var(--surf)',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* 内容 */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 6, letterSpacing: '.06em' }}>
                  内容 <span style={{ color: '#c05050' }}>*</span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={'どの画面で・何をしたら・どうなったか'}
                  rows={6}
                  style={{
                    width: '100%',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: 'var(--txt)',
                    background: 'var(--surf)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* エラー */}
            {status === 'error' && (
              <div style={{ background: '#fff5f5', border: '1px solid rgba(200,60,60,.2)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#c05050', lineHeight: 1.6 }}>
                送信に失敗しました。時間をおいて再度お試しください。
              </div>
            )}

            {/* 送信ボタン */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              style={{
                width: '100%',
                background: submitting || !message.trim() ? 'var(--mute)' : 'var(--g1)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '15px',
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
              }}
            >
              {submitting ? '送信中...' : '送信する'}
            </button>

            <div style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.6 }}>
              送信時にメールアドレス・ユーザーID・端末情報が<br/>自動的に付加されます
            </div>
          </>
        )}
      </div>
    </div>
  )
}
