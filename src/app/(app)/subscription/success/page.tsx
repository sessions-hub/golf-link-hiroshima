'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addPoints } from '@/lib/points'
import Logo from '@/components/layout/Logo'

function SuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const awardPlanPoints = async () => {
      const sessionId = searchParams.get('session_id')
      if (!sessionId) return
      const storageKey = `plan_pts_${sessionId}`
      if (localStorage.getItem(storageKey)) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sub?.plan === 'premium') {
        addPoints(supabase, user.id, 100)
      } else if (sub?.plan === 'standard') {
        addPoints(supabase, user.id, 50)
      }
      localStorage.setItem(storageKey, '1')
    }
    awardPlanPoints()
    setTimeout(() => router.push('/home'), 3000)
  }, [])

  return (
    <button onClick={() => router.push('/home')} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
      ホームへ →
    </button>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--g1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
      <Logo variant="screen" height={80} />
      <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '28px auto 20px' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--g1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 10 }}>お申し込み完了！</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.85, marginBottom: 30 }}>
        <span style={{ color: 'var(--lime)' }}>Golf Link Hiroshima</span> の<br/>
        プレミアム機能をお楽しみください！<br/>
        3秒後にホームへ移動します...
      </div>
      <Suspense fallback={
        <button style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ホームへ →
        </button>
      }>
        <SuccessInner />
      </Suspense>
    </div>
  )
}
