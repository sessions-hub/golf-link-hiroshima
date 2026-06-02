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

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://golflink-hiroshima.com/auth/callback',
      },
    })
  }

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
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
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



        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: loading ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div onClick={() => router.push('/reset-password')} style={{ textAlign: 'center', marginTop: 4, marginBottom: 8, fontSize: 13, color: 'var(--g2)', cursor: 'pointer', fontWeight: 600 }}>
          パスワードを忘れた方はこちら
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
          <div style={{ flex: 1, height: .5, background: 'var(--line)' }} />
          <span style={{ fontSize: 11, color: 'var(--mute)' }}>または</span>
          <div style={{ flex: 1, height: .5, background: 'var(--line)' }} />
        </div>

        <button onClick={handleGoogleLogin} style={{ width: '100%', background: 'white', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--txt)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--mute)', marginTop: 14 }}>
          アカウントをお持ちでない方は
          <span onClick={() => router.push('/register')} style={{ color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>　新規登録</span>
        </div>
      </div>
    </div>
  )
}
