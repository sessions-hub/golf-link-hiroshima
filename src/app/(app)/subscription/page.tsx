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
      'ゴルファー検索・フレンド',
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

const CANCEL_REASONS = [
  { value: 'price', label: '料金が高い' },
  { value: 'usability', label: '機能が使いにくい' },
  { value: 'low_usage', label: '使う機会が少ない' },
  { value: 'switched', label: '別のサービスに移った' },
  { value: 'other', label: 'その他' },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [currentPlan, setCurrentPlan] = useState('free')
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOtherText, setCancelOtherText] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setUserId(user.id)
      }
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        if (profileData) setCurrentPlan(profileData.plan)

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('cancel_at_period_end, current_period_end')
          .eq('user_id', user.id)
          .single()
        if (subData) {
          setCancelAtPeriodEnd(subData.cancel_at_period_end ?? false)
          setCurrentPeriodEnd(subData.current_period_end ?? null)
        }
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

  const handleCancelSubmit = async () => {
    if (!cancelReason) return
    if (cancelReason === 'other' && !cancelOtherText.trim()) return
    setCancelLoading(true)
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: cancelReason,
          otherText: cancelReason === 'other' ? cancelOtherText.trim() : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCancelAtPeriodEnd(true)
        if (data.current_period_end) setCurrentPeriodEnd(data.current_period_end)
        setCancelDone(true)
      }
    } catch (error) {
      console.error(error)
    }
    setCancelLoading(false)
  }

  const formatPeriodEnd = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })

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

        {/* 解約予定バナー */}
        {cancelAtPeriodEnd && currentPeriodEnd && (
          <div style={{ background: '#fff8f0', border: '1px solid rgba(200,100,0,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#a05000', lineHeight: 1.6 }}>
            解約手続き済み。{formatPeriodEnd(currentPeriodEnd)}までご利用いただけます。
          </div>
        )}

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

            {/* 解約ボタン */}
            {currentPlan === plan.id && !cancelAtPeriodEnd && (
              <button
                onClick={() => setShowCancelModal(true)}
                style={{ width: '100%', marginTop: 10, background: 'transparent', color: plan.recommended ? 'rgba(255,255,255,.5)' : 'var(--mute)', border: `1px solid ${plan.recommended ? 'rgba(255,255,255,.2)' : 'var(--line)'}`, borderRadius: 8, padding: '10px', fontSize: 12, cursor: 'pointer' }}>
                解約する
              </button>
            )}
          </div>
        ))}

        <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.8, textAlign: 'center', padding: '0 8px' }}>
          いつでもキャンセル可能です。<br/>
          決済はStripeの安全な環境で処理されます。
        </div>
      </div>

      {/* 解約モーダル */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', padding: '24px 20px 40px' }}>
            {cancelDone ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>解約手続きが完了しました</div>
                {currentPeriodEnd && (
                  <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.7 }}>
                    {formatPeriodEnd(currentPeriodEnd)}までご利用いただけます。
                  </div>
                )}
                <button
                  onClick={() => setShowCancelModal(false)}
                  style={{ marginTop: 20, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 32px', fontSize: 14, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer' }}>
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>解約理由をお聞かせください</div>
                  <button onClick={() => setShowCancelModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--mute)', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ marginBottom: 16 }}>
                  {CANCEL_REASONS.map((r) => (
                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--surf)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="cancel_reason"
                        value={r.value}
                        checked={cancelReason === r.value}
                        onChange={() => setCancelReason(r.value)}
                        style={{ width: 18, height: 18, accentColor: 'var(--g2)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--txt)' }}>{r.label}</span>
                    </label>
                  ))}
                </div>
                {cancelReason === 'other' && (
                  <textarea
                    value={cancelOtherText}
                    onChange={e => setCancelOtherText(e.target.value)}
                    placeholder="その他の理由をご記入ください"
                    style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 16, minHeight: 80, boxSizing: 'border-box' }}
                  />
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, fontSize: 13, color: 'var(--mid)', cursor: 'pointer', fontWeight: 600 }}>
                    キャンセル
                  </button>
                  <button
                    onClick={handleCancelSubmit}
                    disabled={cancelLoading || !cancelReason || (cancelReason === 'other' && !cancelOtherText.trim())}
                    style={{ flex: 1, background: cancelLoading || !cancelReason ? 'var(--mute)' : '#c05050', color: 'white', border: 'none', borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 700, cursor: cancelLoading || !cancelReason ? 'not-allowed' : 'pointer', opacity: cancelLoading ? 0.7 : 1 }}>
                    {cancelLoading ? '処理中...' : '解約する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
