'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinPage() {
  const router = useRouter()

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) sessionStorage.setItem('ref_source', ref)
    router.replace('/register')
  }, [router])

  return null
}
