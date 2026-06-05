'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LPRegisterPage() {
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formId = '1FAIpQLSe_gA5PC80Dz09kKe5MbHLf9WTlWcl_LbTfaCjSTpvztDnqnQ'
    const url = `https://docs.google.com/forms/d/e/${formId}/formResponse`

    const body = new FormData()
    body.append('entry.1213002662', email)
    body.append('entry.1297532682', nickname)

    await fetch(url, { method: 'POST', mode: 'no-cors', body }).catch(() => {})

    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a4a2e 0%, #2d7a4f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Noto Sans JP", sans-serif',
      padding: '2rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            color: '#2d7a4f',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>EARLY ACCESS</span>
        </div>

        {submitted ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h1 style={{ fontSize: '1.5rem', color: '#1a4a2e', marginBottom: '1rem', fontWeight: 700 }}>
              事前登録ありがとうございます！
            </h1>
            <p style={{ color: '#666', lineHeight: 1.8, marginBottom: '2rem' }}>
              リリース時にご連絡します。<br />
              広島のゴルフ仲間との出会いをお楽しみに。
            </p>
            <Link href="/lp" style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              background: '#1a4a2e',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}>
              トップページへ戻る
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.6rem', color: '#1a4a2e', marginBottom: '0.75rem', fontWeight: 700 }}>
              事前登録
            </h1>
            <p style={{ color: '#555', lineHeight: 1.8, marginBottom: '2rem', fontSize: '0.95rem' }}>
              リリース初日に通知＋プレミアム機能<strong>30日間無料</strong>。<br />
              登録は無料、いつでも解除できます。
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                style={{
                  padding: '0.9rem 1.2rem',
                  border: '1.5px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}
              />
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="ニックネーム（任意）"
                style={{
                  padding: '0.9rem 1.2rem',
                  border: '1.5px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '1rem',
                  background: loading ? '#999' : '#1a4a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.05em',
                }}
              >
                {loading ? '送信中...' : '事前登録する'}
              </button>
            </form>

            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#999', lineHeight: 1.7 }}>
              スパムは送りません。いつでも配信解除できます。
            </p>

            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/lp" style={{ color: '#2d7a4f', fontSize: '0.85rem', textDecoration: 'none' }}>
                ← トップページへ戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
