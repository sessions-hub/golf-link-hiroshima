'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INITIAL_MESSAGES = [
  { id: 1, sender: 'other', text: 'はじめまして！マッチングありがとうございます😊', time: '10:24' },
  { id: 2, sender: 'me', text: 'こちらこそよろしくお願いします！今週末いかがですか？', time: '10:26' },
  { id: 3, sender: 'other', text: 'ぜひ！広島CCはどうでしょう？⛳', time: '10:28' },
]

const REPLIES = [
  'わかりました！楽しみですね⛳',
  '了解です！当日よろしくお願いします',
  'ぜひ！一緒にいきましょう！',
  'いいですね！楽しみにしています',
]

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')

  const sendMsg = () => {
    if (!input.trim()) return
    const now = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
    const newId = messages.length + 1

    setMessages(prev => [...prev, { id: newId, sender: 'me', text: input, time }])
    setInput('')

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: newId + 1,
        sender: 'other',
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        time,
      }])
    }, 1200)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--off)' }}>
      <div style={{ background: 'var(--g1)', padding: '52px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,.18)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8F0F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#3a6aaa' }}>佐</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>佐藤 健一</div>
          <div style={{ fontSize: 10, color: 'var(--lime)', marginTop: 1 }}>● オンライン</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ maxWidth: '76%', alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              padding: '10px 13px',
              borderRadius: m.sender === 'me' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: m.sender === 'me' ? 'var(--g1)' : 'white',
              color: m.sender === 'me' ? 'white' : 'var(--txt)',
              fontSize: 13, lineHeight: 1.5,
              border: m.sender === 'other' ? '1px solid var(--line)' : 'none',
            }}>{m.text}</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 3, textAlign: m.sender === 'me' ? 'right' : 'left' }}>{m.time}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px 34px', background: 'white', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          placeholder="メッセージを入力..."
          style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--txt)', outline: 'none' }}
        />
        <button onClick={sendMsg} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--g1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
