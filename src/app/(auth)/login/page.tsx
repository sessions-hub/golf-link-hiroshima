'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが間違っています')
      setLoading(false)
    } else {
      router.push('/home')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--g1)', padding: '60px 22px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/GL白抜きロゴ.png" alt="GLH." style={{ height: 64, width: 'auto', mixBlendMode: 'screen' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4, letterSpacing: '.08em' }}>Golf Link Hiroshima</span>
      </div>
      <div style={{ flex: 1, padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>ログイン</div>
        <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 24 }}>Golf Link Hiroshima へようこそ</div>

        {error && (
          <div style={{ background: 'rgba(200,60,60,.1)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c05050', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>メールアドレス</div>
        <div style={{ background: 'white', border: '1.5px solid var(--g3)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, boxShadow: '0 0 0 3px rgba(46,125,85,.08)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="メールアドレス"
            type="email"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--txt)', background: 'transparent' }}
          />
        </div>

        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>パスワード</div>
        <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pale)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="パスワード"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--txt)', background: 'transparent' }}
          />
        </div>

        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--g3)', marginBottom: 20, cursor: 'pointer' }}>パスワードをお忘れの方</div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: loading ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: .5, background: 'var(--line)' }} />
          <span style={{ fontSize: 11, color: 'var(--mute)' }}>または</span>
          <div style={{ flex: 1, height: .5, background: 'var(--line)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
          <button style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 11, fontSize: 12, color: 'var(--txt)', cursor: 'pointer' }}>Facebook</button>
          <button style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 11, fontSize: 12, color: 'var(--txt)', cursor: 'pointer' }}>Google</button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--mute)', marginTop: 14 }}>
          アカウントをお持ちでない方は
          <span onClick={() => router.push('/register')} style={{ color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>　新規登録</span>
        </div>
      </div>
    </div>
  )
}
