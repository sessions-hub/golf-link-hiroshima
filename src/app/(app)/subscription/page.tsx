'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

const PLANS = [
  {
    id: 'standard',
    name: 'スタンダード',
    price: 490,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? '',
    features: [
      'ゴルファー検索・マッチング',
      'メッセージ送受信',
      'コンペ参加',
      'GPS距離計測',
      'コース予約',
    ],
    recommended: false,
  },
  {
    id: 'premium',
    name: 'プレミアム',
    price: 990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? '',
    features: [
      'スタンダードの全機能',
      '相性診断フィルター',
      'コンペ主催',
      'レッスン予約',
      'プロフィール優先表示',
      '月次ラウンドレポート',
    ],
    recommended: true,
  },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [currentPlan, setCurrentPlan] = useState('free')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setUserId(user.id)
      }
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        if (data) setCurrentPlan(data.plan)
      }
    }
    getUser()
  }, [])

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (!userEmail) { router.push('/login'); return }
    setLoading(plan.id)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          plan: plan.id,
          userEmail,
          userId,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <Logo variant="screen" height={40} />
      </div>

      <div style={{ flex: 1, padding: '24px 16px 100px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>プランを選択</div>
          <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7 }}>ゴルフライフをもっと充実させましょう</div>
        </div>

        {/* 無料プラン */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: '16px 18px', marginBottom: 14, boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>無料</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--g2)', marginTop: 2 }}>¥0<span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 400 }}>/月</span></div>
            </div>
            {currentPlan === 'free' && (
              <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--mute)' }}>現在のプラン</div>
            )}
          </div>
          {['プロフィール作成', 'ゴルファー検索（閲覧のみ）', 'コンペ閲覧'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* 有料プラン */}
        {PLANS.map((plan) => (
          <div key={plan.id} style={{ background: plan.recommended ? 'var(--g1)' : 'white', borderRadius: 14, border: plan.recommended ? '2px solid rgba(168,224,99,.4)' : '1px solid var(--line)', padding: '16px 18px', marginBottom: 14, boxShadow: plan.recommended ? '0 8px 24px rgba(13,61,43,.2)' : '0 2px 8px rgba(13,61,43,.05)', position: 'relative', overflow: 'hidden' }}>
            {plan.recommended && (
              <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--lime)', color: 'var(--g1)', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: '0 14px 0 8px' }}>おすすめ</div>
            )}
            {currentPlan === plan.id && (
              <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(168,224,99,.3)', color: 'var(--lime)', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: '14px 0 8px 0' }}>現在のプラン</div>
            )}
            <div style={{ marginBottom: 14, marginTop: currentPlan === plan.id ? 16 : 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: plan.recommended ? 'white' : 'var(--txt)' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: plan.recommended ? 'var(--lime)' : 'var(--g2)', fontFamily: 'Inter' }}>¥{plan.price.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: plan.recommended ? 'rgba(255,255,255,.5)' : 'var(--mute)' }}>/月</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {plan.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: plan.recommended ? 'rgba(168,224,99,.2)' : 'var(--surf)', border: `1px solid ${plan.recommended ? 'rgba(168,224,99,.4)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={plan.recommended ? 'var(--lime)' : 'var(--g3)'} strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                  </div>
                  <span style={{ fontSize: 12, color: plan.recommended ? 'rgba(255,255,255,.85)' : 'var(--txt)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading === plan.id || currentPlan === plan.id}
              style={{ width: '100%', background: currentPlan === plan.id ? 'rgba(255,255,255,.1)' : plan.recommended ? 'var(--lime)' : 'var(--g1)', color: currentPlan === plan.id ? 'rgba(255,255,255,.4)' : plan.recommended ? 'var(--g1)' : 'white', border: 'none', borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, cursor: loading === plan.id || currentPlan === plan.id ? 'not-allowed' : 'pointer', opacity: loading === plan.id ? 0.7 : 1 }}>
              {loading === plan.id ? '処理中...' : currentPlan === plan.id ? '契約中' : `${plan.name}に申し込む`}
            </button>
          </div>
        ))}

        <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.8, textAlign: 'center', padding: '0 8px' }}>
          いつでもキャンセル可能です。<br/>
          決済はStripeの安全な環境で処理されます。
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
