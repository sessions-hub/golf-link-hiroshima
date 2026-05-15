'use client'
import { useRouter } from 'next/navigation'

export default function TokushoPage() {
  const router = useRouter()

  const items = [
    { label: '販売業者', value: 'Golf Link Hiroshima 運営事務局' },
    { label: '運営責任者', value: '澤田 朋治' },
    { label: '所在地', value: '広島県広島市（詳細住所はお問い合わせください）' },
    { label: 'メールアドレス', value: 'admin@golflink-hiroshima.com' },
    { label: 'ウェブサイト', value: 'https://golf-link-hiroshima.vercel.app' },
    { label: '販売価格', value: 'スタンダードプラン：¥490/月（税込）\nプレミアムプラン：¥990/月（税込）' },
    { label: '支払い方法', value: 'クレジットカード（Visa・Mastercard・JCB・American Express）' },
    { label: '支払い時期', value: '月次自動更新（登録日を基準に毎月）' },
    { label: 'サービス提供時期', value: '決済完了後、即時ご利用いただけます' },
    { label: 'キャンセル・解約', value: 'マイページ→サブスクリプション管理から月末までにお手続きください。解約後は翌月より課金が停止されます。' },
    { label: '返金ポリシー', value: '月途中の解約による日割り返金は行っておりません。決済完了後の返金は原則承っておりません。' },
    { label: '動作環境', value: 'iOS Safari・Android Chrome・PC各種モダンブラウザ' },
    { label: '個人情報の取扱い', value: 'プライバシーポリシーに準じます' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>特定商取引法に基づく表記</div>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 60px', overflowY: 'auto' }}>
        {items.map((item) => (
          <div key={item.label} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(13,61,43,.04)' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
