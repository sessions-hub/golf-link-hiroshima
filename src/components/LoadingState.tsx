'use client'
import { useEffect, useState } from 'react'
export function LoadingState({ messages = ['読み込み中'] }: { messages?: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (messages.length <= 1) return
    const t = setInterval(() => setI(p => (p + 1) % messages.length), 1800)
    return () => clearInterval(t)
  }, [messages.length])
  return (
    <div className="loading">
      <div className="bw"><span className="halo" /><img src="/avatars/bear-black.png" alt="" /></div>
      <div className="lmsg" key={i}>{messages[i]}</div>
      <div className="dots"><span /><span /><span /></div>
      <style jsx>{`
        .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 30px;min-height:340px;gap:6px}
        .bw{position:relative;width:140px;height:140px;display:flex;align-items:center;justify-content:center}
        .halo{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(201,162,39,.14),transparent 68%);animation:pulse 1.3s ease-in-out infinite}
        .bw img{height:120px;position:relative;z-index:1;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18));animation:bounce 1.3s ease-in-out infinite}
        .lmsg{font-size:13px;color:#1f2d24;min-height:20px;animation:fade .4s ease}
        .dots{display:flex;gap:5px;margin-top:4px}
        .dots span{width:5px;height:5px;border-radius:50%;background:#c9a227;display:inline-block;animation:blink 1.2s infinite}
        .dots span:nth-child(2){animation-delay:.2s} .dots span:nth-child(3){animation-delay:.4s}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse{0%,100%{transform:scale(.9);opacity:.7}50%{transform:scale(1.05);opacity:1}}
        @keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes fade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){.bw img,.halo,.dots span{animation:none!important}}
      `}</style>
    </div>
  )
}
