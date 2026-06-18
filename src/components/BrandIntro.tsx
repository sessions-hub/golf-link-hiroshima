'use client'
import { useEffect, useState } from 'react'

export default function BrandIntro({ onFinish }: { onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? 900 : 2100
    const t1 = setTimeout(() => setLeaving(true), hold)
    const t2 = setTimeout(onFinish, hold + 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onFinish])
  const skip = () => { setLeaving(true); setTimeout(onFinish, 300) }
  return (
    <div onClick={skip} style={{ position:'fixed', inset:0, zIndex:9999,
      background:'radial-gradient(circle at 50% 44%, #ffffff, #f4f1e9)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:30, opacity: leaving ? 0 : 1, transition:'opacity .5s ease',
      pointerEvents: leaving ? 'none' : 'auto' }}>
      <style>{`
        @keyframes glhEmerge { to { opacity:1; filter:blur(0); } }
        @media (prefers-reduced-motion: reduce) {
          .glh-logowrap { animation: glhEmerge .5s ease forwards !important; filter:none !important; }
        }
      `}</style>

      {/* フレンドベア：最初から表示（静止） */}
      <img src="/avatars/friend-pair.png" alt=""
        style={{ height:160, filter:'drop-shadow(0 10px 18px rgba(0,0,0,.16))' }} />

      {/* ロゴ：固定位置で薄い→くっきりにゆっくり浮き出る（移動なし） */}
      <div className="glh-logowrap" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14,
        opacity:0.14, filter:'blur(3px)',
        animation:'glhEmerge 1.5s ease .3s forwards' }}>
        <img src="/glh-logo-dark.png" alt="GLH" style={{ width:200, maxWidth:'62vw' }} />
        <div style={{ display:'flex', alignItems:'center', gap:13 }}>
          <span style={{ width:34, height:1.5, background:'#c9a25a' }} />
          <span style={{ color:'#173d2c', fontSize:11, letterSpacing:'.3em', fontWeight:600 }}>GOLF LINK HIROSHIMA</span>
          <span style={{ width:34, height:1.5, background:'#c9a25a' }} />
        </div>
      </div>
    </div>
  )
}
