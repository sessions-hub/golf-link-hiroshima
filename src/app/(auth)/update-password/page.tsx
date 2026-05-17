'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleUpdate = async () => {
    if (!password.trim()) { setError('パスワードを入力してください'); return }
    if (password.length < 6) { setError('パスワードは6文字以上で入力してください'); return }
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('パスワードの更新に失敗しました')
    } else {
      setDone(true)
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
        {done ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>パスワードを更新しました</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 28 }}>新しいパスワードでログインしてください</div>
            <button onClick={() => router.push('/login')} style={{ background: 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '13px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ログイン画面へ
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>パスワードの再設定</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 28 }}>新しいパスワードを入力してください</div>

            {error && (
              <div style={{ background: 'rgba(200,60,60,.1)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c05050', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>新しいパスワード</div>
            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6文字以上" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--txt)', background: 'transparent' }} />
            </div>

            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>パスワード（確認）</div>
            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="もう一度入力" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--txt)', background: 'transparent' }} />
            </div>

            <button onClick={handleUpdate} disabled={loading} style={{ width: '100%', background: loading ? 'var(--mute)' : 'var(--g1)', color: 'white', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
