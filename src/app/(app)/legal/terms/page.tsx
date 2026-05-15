'use client'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', padding: '44px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>利用規約</div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 60px', overflowY: 'auto', lineHeight: 1.9, fontSize: 13, color: 'var(--txt)' }}>
        <p style={{ color: 'var(--mute)', fontSize: 11, marginBottom: 24 }}>最終更新日：2026年5月12日</p>

        {[
          {
            title: '第1条（適用）',
            content: 'この利用規約（以下「本規約」）は、Golf Link Hiroshima（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスをご利用ください。'
          },
          {
            title: '第2条（登録）',
            content: '本サービスの利用には会員登録が必要です。登録の際は正確な情報を入力してください。虚偽の情報による登録は禁止します。18歳未満の方は保護者の同意を得た上でご利用ください。'
          },
          {
            title: '第3条（禁止事項）',
            content: '以下の行為を禁止します。\n①法令または公序良俗に違反する行為\n②他のユーザーへの嫌がらせ・誹謗中傷\n③虚偽の情報の登録・投稿\n④本サービスの運営を妨害する行為\n⑤他のユーザーの個人情報の不正取得\n⑥商業目的の勧誘・広告活動\n⑦マルチ商法・ネットワークビジネスへの勧誘\n⑧性的なコンテンツの投稿・送信\n⑨その他、運営が不適切と判断する行為'
          },
          {
            title: '第4条（サービスの提供・変更・停止）',
            content: '本サービスは予告なく内容の変更・追加・削除を行う場合があります。また、システムメンテナンスや障害等により、一時的にサービスを停止する場合があります。'
          },
          {
            title: '第5条（有料サービス）',
            content: '本サービスには無料プランと有料プラン（スタンダード・プレミアム）があります。有料プランの料金は各プランページに記載の通りです。支払いはクレジットカードにて月次で自動更新されます。解約はマイページより月末までに手続きを行ってください。'
          },
          {
            title: '第6条（退会・アカウント削除）',
            content: 'ユーザーはいつでも退会することができます。退会後はアカウント情報・投稿データが削除されます。有料プランをご利用中の場合は、退会前に解約手続きをお願いします。'
          },
          {
            title: '第7条（免責事項）',
            content: '本サービスはユーザー同士のマッチングプラットフォームです。ユーザー間のトラブルについて、本サービスは一切の責任を負いません。実際のゴルフラウンドやオフラインでの交流は、ユーザー自身の責任において行ってください。'
          },
          {
            title: '第8条（準拠法・管轄裁判所）',
            content: '本規約は日本法に準拠します。本サービスに関する紛争については、広島地方裁判所を第一審の専属的合意管轄裁判所とします。'
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g1)', marginBottom: 8 }}>{section.title}</div>
            <div style={{ whiteSpace: 'pre-line', color: 'var(--txt)' }}>{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
