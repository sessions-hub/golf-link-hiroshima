'use client'
import { useEffect, useState } from 'react'

interface Props {
  amount: number | null
  onDone: () => void
}

export default function PointToast({ amount, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (amount === null) return
    setVisible(true)
    const hide = setTimeout(() => setVisible(false), 1800)
    const done = setTimeout(() => { onDone() }, 2200)
    return () => { clearTimeout(hide); clearTimeout(done) }
  }, [amount])

  if (amount === null) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top) + 16px)',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -80}px)`,
      transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease',
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
