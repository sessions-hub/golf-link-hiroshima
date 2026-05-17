'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (!email.trim()) { setError('メールアドレスを入力してください'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) {
      setError('送信に失敗しました。メールアドレスを確認してください')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 56px)', paddingBottom: '56px', paddingLeft: '22px', paddingRight: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/グリーン.png" alt="GLH." style={{ height: 96, width: 'auto', objectFit: 'contain', display: 'block' }} />
          <div style={{ borderLeft: '1px solid #111814', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111814', letterSpacing: '.2em', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>GOLF LINK</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111814', letterSpacing: '.2em', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>HIROSHIMA</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
        <div onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--g2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 24 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          戻る
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>メールを送信しました</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7, marginBottom: 28 }}>
              {email} に<br/>パスワードリセットのメールを送信しました。<br/>メール内のリンクからパスワードを再設定してください。
            </div>
            <button onClick={() => router.push('/login')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '13px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ログイン画面へ
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>パスワードを忘れた方</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 28, lineHeight: 1.7 }}>登録済みのメールアドレスを入力してください。パスワードリセットのリンクをお送りします。</div>

            {error && (
              <div style={{ background: 'rgba(200,60,60,.1)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c05050', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>メールアドレス</div>
            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--txt)', background: 'transparent' }}
              />
            </div>

            <button onClick={handleReset} disabled={loading} style={{ width: '100%', background: loading ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '送信中...' : 'リセットメールを送信'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
