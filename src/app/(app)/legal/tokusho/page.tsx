'use client'
import { useRouter } from 'next/navigation'

const ITEMS = [
  {
    label: '販売業者',
    value: 'Golf Link Hiroshima 運営事務局',
  },
  {
    label: '運営責任者',
    value: '澤田 朋治',
  },
  {
    label: '所在地',
    value: '広島県広島市\n（詳細はメールにてお問い合わせください）',
  },
  {
    label: '電話番号',
    value: 'メールにてお問い合わせください\n（開示請求には誠実に対応します）',
  },
  {
    label: 'メールアドレス',
    value: 'info@golflink-hiroshima.com\n受付時間：平日10:00〜18:00（土日祝・年末年始を除く）',
  },
  {
    label: 'ウェブサイト',
    value: 'https://golf-link-hiroshima.vercel.app',
  },
  {
    label: '販売サービス',
    value: 'ゴルファー向けSNS・マッチング・コンペ管理・GPS計測サービス「GLH.」の有料プラン',
  },
  {
    label: '販売価格',
    value: 'スタンダードプラン：490円／月（税込）\nプレミアムプラン：990円／月（税込）\n※フリープランは無料でご利用いただけます',
  },
  {
    label: '支払い方法',
    value: 'クレジットカード決済\n（Visa・Mastercard・JCB・American Express）\n※Stripe Inc.の決済システムを利用しています',
  },
  {
    label: '支払い時期',
    value: '月次自動更新\n登録日を基準に毎月同日に自動決済されます',
  },
  {
    label: 'サービス提供時期',
    value: '決済完了後、即時ご利用いただけます',
  },
  {
    label: '契約期間',
    value: '月単位（1か月ごとの自動更新）',
  },
  {
    label: '解約方法',
    value: 'アプリ内「マイページ」→「サブスクリプション管理」から手続きできます。当月末までに手続きを完了してください。解約後は翌月より課金が停止されます。',
  },
  {
    label: '返金ポリシー',
    value: '月途中での解約・プランダウングレードによる日割り返金は行っておりません。\n決済完了後の返金は、当社の都合によるサービス終了・重大な契約違反の場合を除き、原則承っておりません。\nご不明な点はお問い合わせください。',
  },
  {
    label: '動作環境',
    value: 'iOS Safari（最新版推奨）\nAndroid Chrome（最新版推奨）\nPC各種モダンブラウザ',
  },
  {
    label: '個人情報の取扱い',
    value: 'プライバシーポリシーに準じます\nhttps://golf-link-hiroshima.vercel.app/legal/privacy',
  },
]

export default function TokushoPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>特定商取引法に基づく表記</div>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 60px', overflowY: 'auto' }}>
        <p style={{ fontSize: 11, color: 'var(--mute)', padding: '0 2px 12px', lineHeight: 1.7 }}>
          特定商取引に関する法律第11条に基づき、以下の通り表記します。
        </p>

        {ITEMS.map((item) => (
          <div key={item.label} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(13,61,43,.04)' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{item.value}</div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0f7f0', borderRadius: 10, border: '1px solid rgba(13,61,43,.1)' }}>
          <div style={{ fontSize: 11, color: 'var(--g1)', lineHeight: 1.8 }}>
            ご不明な点はお気軽にお問い合わせください。{'\n'}
            <strong>info@golflink-hiroshima.com</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
