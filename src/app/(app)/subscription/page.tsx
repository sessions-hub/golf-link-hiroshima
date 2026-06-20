'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizePlan } from '@/lib/plan'
import Logo from '@/components/layout/Logo'

const PLANS = [
  {
    id: 'premium',
    nameEn: 'PREMIUM',
    nameJa: 'プレミアム',
    price: 490,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? '',
    features: [
      'FREEの全機能',
      'コンペ主催・ラウンド募集',
      '気になるタブ（足跡・お気に入り確認）',
    ],
    recommended: true,
    secret: false,
  },
  {
    id: 'executive',
    nameEn: 'EXECUTIVE',
    nameJa: 'エグゼクティブ',
    price: 990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? '',
    features: [
      'PREMIUMの全機能',
      'メンバーズカード＆特典',
    ],
    recommended: false,
    secret: true,
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
        if (profileData) setCurrentPlan(normalizePlan(profileData.plan))

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
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <Logo variant="screen" height={40} />
      </div>

      <div style={{ flex: 1, padding: '24px 16px' }}>
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

        {/* FREEプラン */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: '16px 18px', marginBottom: 14, boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)', fontFamily: 'Inter', letterSpacing: '-.01em' }}>FREE</span>
                <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 500 }}>無料</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--g2)', marginTop: 2 }}>¥0<span style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 400 }}>/月</span></div>
            </div>
            {currentPlan === 'free' && (
              <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--mute)' }}>現在のプラン</div>
            )}
          </div>
          {['基本プロフィール・ゴルファー検索', 'SNS投稿・いいね・コメント', '個別チャット・グループチャット', 'スコア記録・GPS距離計測', 'コース検索・予約', 'コンペ参加・ラウンド参加'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* 有料プラン */}
        {PLANS.map((plan) => {
          const isExec = plan.secret
          const cardBg = isExec ? '#0d0d0d' : plan.recommended ? 'var(--g1)' : 'white'
          const cardBorder = isExec ? '2px solid #c8962a' : plan.recommended ? '2px solid rgba(168,224,99,.4)' : '1px solid var(--line)'
          const cardShadow = isExec ? '0 8px 28px rgba(0,0,0,.5)' : plan.recommended ? '0 8px 24px rgba(13,61,43,.2)' : '0 2px 8px rgba(13,61,43,.05)'
          const nameColor = isExec ? 'white' : plan.recommended ? 'white' : 'var(--txt)'
          const nameSubColor = isExec ? '#c8962a' : plan.recommended ? 'rgba(255,255,255,.6)' : 'var(--mute)'
          const priceColor = isExec ? '#f0c060' : plan.recommended ? 'var(--lime)' : 'var(--g2)'
          const priceSubColor = isExec ? 'rgba(240,192,96,.5)' : plan.recommended ? 'rgba(255,255,255,.5)' : 'var(--mute)'
          const featIconBg = isExec ? 'rgba(200,150,42,.15)' : plan.recommended ? 'rgba(168,224,99,.2)' : 'var(--surf)'
          const featIconBorder = isExec ? 'rgba(200,150,42,.4)' : plan.recommended ? 'rgba(168,224,99,.4)' : 'var(--line)'
          const featIconStroke = isExec ? '#c8962a' : plan.recommended ? 'var(--lime)' : 'var(--g3)'
          const featTextColor = isExec ? 'rgba(255,255,255,.85)' : plan.recommended ? 'rgba(255,255,255,.85)' : 'var(--txt)'
          const curPlanBadgeBg = isExec ? 'rgba(200,150,42,.25)' : 'rgba(168,224,99,.3)'
          const curPlanBadgeColor = isExec ? '#f0c060' : 'var(--lime)'
          const cancelBtnColor = isExec ? 'rgba(240,192,96,.5)' : plan.recommended ? 'rgba(255,255,255,.5)' : 'var(--mute)'
          const cancelBtnBorder = isExec ? 'rgba(200,150,42,.3)' : plan.recommended ? 'rgba(255,255,255,.2)' : 'var(--line)'

          return (
            <div key={plan.id} style={{ background: cardBg, borderRadius: 14, border: cardBorder, padding: '16px 18px', marginBottom: 14, boxShadow: cardShadow, position: 'relative', overflow: 'hidden' }}>
              {/* バッジ */}
              {plan.recommended && !isExec && (
                <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--lime)', color: 'var(--g1)', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: '0 14px 0 8px' }}>おすすめ</div>
              )}
              {isExec && (
                <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg, #c8962a, #f0c060)', color: '#0d0d0d', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: '0 14px 0 8px', letterSpacing: '.06em' }}>SECRET</div>
              )}
              {currentPlan === plan.id && (
                <div style={{ position: 'absolute', top: 0, left: 0, background: curPlanBadgeBg, color: curPlanBadgeColor, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: '14px 0 8px 0' }}>現在のプラン</div>
              )}

              {/* プラン名・価格 */}
              <div style={{ marginBottom: 14, marginTop: currentPlan === plan.id ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: nameColor, fontFamily: 'Inter', letterSpacing: '-.01em' }}>{plan.nameEn}</span>
                  <span style={{ fontSize: 11, color: nameSubColor, fontWeight: 500 }}>{plan.nameJa}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: priceColor, fontFamily: 'Inter' }}>¥{plan.price.toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: priceSubColor }}>/月</span>
                </div>
              </div>

              {/* メンバーズカード画像（エグゼクティブのみ） */}
              {isExec && (
                <div style={{ margin: '6px 0 18px' }}>
                  <img
                    src="/member-id-cards.png"
                    alt="限定メンバーズカード"
                    style={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block', margin: '0 auto' }}
                  />
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#f0c060', letterSpacing: '.08em', marginTop: 8 }}>
                    Members ID
                  </div>
                </div>
              )}

              {/* 機能リスト */}
              <div style={{ marginBottom: 16 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: featIconBg, border: `1px solid ${featIconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={featIconStroke} strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                    <span style={{ fontSize: 12, color: featTextColor }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* 申し込みボタン / 条件表示 */}
              {isExec ? (
                currentPlan === plan.id ? (
                  <button
                    disabled
                    style={{ width: '100%', background: 'rgba(200,150,42,.12)', color: 'rgba(240,192,96,.5)', border: '1px solid rgba(200,150,42,.2)', borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'not-allowed' }}>
                    契約中
                  </button>
                ) : (
                  <div style={{ width: '100%', background: 'rgba(200,150,42,.08)', border: '1px solid rgba(200,150,42,.25)', borderRadius: 8, padding: '12px 14px', textAlign: 'center', lineHeight: 1.7 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f0c060' }}>招待制</div>
                    <div style={{ fontSize: 11, color: 'rgba(240,192,96,.65)' }}>申し込みには条件があります</div>
                  </div>
                )
              ) : (
                <button
                  onClick={() => handleSubscribe(plan as any)}
                  disabled={loading === plan.id || currentPlan === plan.id}
                  style={{ width: '100%', background: currentPlan === plan.id ? 'rgba(255,255,255,.1)' : 'var(--lime)', color: currentPlan === plan.id ? 'rgba(255,255,255,.4)' : 'var(--g1)', border: 'none', borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, cursor: loading === plan.id || currentPlan === plan.id ? 'not-allowed' : 'pointer', opacity: loading === plan.id ? 0.7 : 1 }}>
                  {loading === plan.id ? '処理中...' : currentPlan === plan.id ? '契約中' : `${plan.nameEn}に申し込む`}
                </button>
              )}

              {/* 解約ボタン */}
              {currentPlan === plan.id && !cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{ width: '100%', marginTop: 10, background: 'transparent', color: cancelBtnColor, border: `1px solid ${cancelBtnBorder}`, borderRadius: 8, padding: '10px', fontSize: 12, cursor: 'pointer' }}>
                  解約する
                </button>
              )}
            </div>
          )
        })}

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

    </div>
  )
}
