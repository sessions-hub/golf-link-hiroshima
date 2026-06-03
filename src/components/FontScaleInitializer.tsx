'use client'
import { useEffect } from 'react'
import { applyFontScale } from '@/lib/fontScale'

export default function FontScaleInitializer() {
  useEffect(() => {
    applyFontScale()
  }, [])
  return null
}
