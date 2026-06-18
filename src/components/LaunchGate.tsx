'use client'
import { useState } from 'react'
import BrandIntro from '@/components/BrandIntro'

export default function LaunchGate({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true)
  return (
    <>
      {children}
      {showIntro && <BrandIntro onFinish={() => setShowIntro(false)} />}
    </>
  )
}
