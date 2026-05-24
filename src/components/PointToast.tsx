'use client'
import { useEffect, useState } from 'react'

interface Props {
  amount: number
  onDone: () => void
}

// key prop でリマウントして使う。マウント時に即表示し 2 秒後に自動で消える。
export default function PointToast({ amount, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 次フレームで visible=true にすることで CSS transition が確実に発火する
    const enter = requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => setVisible(false), 2000)
    const done = setTimeout(onDone, 2350)
    return () => {
      cancelAnimationFrame(enter)
      clearTimeout(hide)
      clearTimeout(done)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top) + 16px)',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -80}px)`,
      transition: 'transform .32s cubic-bezier(.34,1.56,.64,1), opacity .32s ease',
      opacity: visible ? 1 : 0,
      background: 'var(--g1)',
      color: 'white',
      padding: '10px 20px',
      borderRadius: 24,
      fontSize: 14,
      fontWeight: 700,
      boxShadow: '0 4px 20px rgba(13,61,43,.35)',
      zIndex: 9999,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      ⭐ +{amount}pt 獲得！
    </div>
  )
}
