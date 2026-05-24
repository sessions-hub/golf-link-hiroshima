'use client'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  {
    title: '第1条（事業者情報）',
    content: `Golf Link Hiroshima（運営責任者：Tomoharu Sawada、以下「当社」）は、ユーザーの個人情報を適切に保護することを重要な責務と考え、個人情報の保護に関する法律（個人情報保護法）および関連法令を遵守します。\n\nウェブサイト：https://golflink-hiroshima.com`,
  },
  {
    title: '第2条（取得する個人情報）',
    content: `当社は以下の個人情報を取得します。

【アカウント情報】
・メールアドレス、パスワード（ハッシュ化して保存）

【プロフィール情報】
・ニックネーム、ハンディキャップ、ベストスコア
・居住エリア、性別、生年月日、血液型
・自己紹介文（任意）、ラウンド頻度、希望曜日
・プロフィール写真（任意）

【利用状況・行動情報】
・投稿・コメント・いいね・お気に入りの内容
・チャットメッセージの内容
・スコア記録（コース名・ホールスコア等）
・コンペ参加履歴
・他ユーザーへの足跡（訪問履歴）

【位置情報】
・GPS距離計測機能使用時の位置情報（端末上でのみ処理し、サーバーへは送信しません）

【デバイス情報】
・プッシュ通知用のデバイストークン

【決済関連】
・決済情報はStripe Inc.が管理します。当社はカード番号等の決済情報を保持しません。`,
  },
  {
    title: '第3条（個人情報の利用目的）',
    content: `取得した個人情報は以下の目的で利用します。
①本サービスの提供（ユーザー認証・機能提供・プロフィール表示）
②ユーザー同士のマッチングおよびコミュニケーション機能の提供
③プッシュ通知・メール等によるサービスに関する情報提供
④有料プランの決済処理・サブスクリプション管理
⑤カスタマーサポート対応
⑥サービスの改善・新機能開発のための統計分析（個人を特定しない形で利用）
⑦不正利用の検知・防止
⑧法令に基づく対応`,
  },
  {
    title: '第4条（第三者への提供）',
    content: `当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
①ユーザーの同意がある場合
②法令に基づく場合（裁判所・捜査機関等からの要請）
③人命・財産の保護のために緊急に必要な場合
④合併・事業譲渡等により事業を承継する場合`,
  },
  {
    title: '第5条（外部サービスへの情報提供）',
    content: `本サービスは以下の外部サービスを利用しており、各サービスのプライバシーポリシーに基づいて情報が処理されます。

【Supabase Inc.】
用途：データベース・認証・ファイルストレージ
対象：アカウント情報・プロフィール・投稿・メッセージ等
所在：米国（Standard Contractual Clausesに基づく国際移転）

【Stripe Inc.】
用途：決済処理・サブスクリプション管理
対象：メールアドレス・お支払い情報
所在：米国

【楽天GORA（楽天グループ株式会社）】
用途：ゴルフ場・予約情報の検索表示（楽天GORA API）
対象：検索クエリ（個人を特定する情報は含みません）`,
  },
  {
    title: '第6条（個人情報の保管・管理）',
    content: `1. 当社は個人情報への不正アクセス・紛失・破損・改ざん・漏洩を防止するため、適切なセキュリティ措置を講じます。
2. 個人情報は利用目的の達成に必要な期間保管し、退会後は合理的な期間内に削除します。ただし、法令により保存が義務付けられる情報はその期間保管します。
3. チャットメッセージ等の通信内容は、サービス提供に必要な範囲で保管します。`,
  },
  {
    title: '第7条（未成年者の個人情報）',
    content: `18歳未満のユーザーが本サービスを利用する場合、保護者の同意の上でのご利用をお願いします。当社は未成年者の個人情報について保護者からの開示・削除請求に対応します。`,
  },
  {
    title: '第8条（Cookieおよびアクセス解析）',
    content: `本サービスはセッション管理のためCookieを使用します。Cookieの無効化はブラウザ設定で行えますが、一部機能が利用できなくなる場合があります。`,
  },
  {
    title: '第9条（個人情報の開示・訂正・削除）',
    content: `ユーザーは以下の権利を有します。
①保有する個人情報の開示請求
②不正確な個人情報の訂正・追加・削除請求
③利用目的の範囲を超えた利用・第三者提供の停止請求

請求はアプリ内の「プロフィール編集」「退会する」または下記お問い合わせ先へご連絡ください。本人確認の上、合理的な期間内に対応します。`,
  },
  {
    title: '第10条（プライバシーポリシーの変更）',
    content: `当社は法令の改正やサービス内容の変更等に伴い、本ポリシーを改定することがあります。重要な変更はアプリ内またはメールにて通知します。`,
  },
  {
    title: '第11条（お問い合わせ）',
    content: `個人情報の取扱いに関するご質問・ご相談は下記までお問い合わせください。

Golf Link Hiroshima
運営責任者：Tomoharu Sawada
所在地：Hiroshima City, Hiroshima Prefecture, Japan
ウェブサイト：https://golflink-hiroshima.com
受付時間：平日10:00〜18:00（土日祝・年末年始を除く）`,
  },
]

const CONTACT_SECTION_TITLE = '第11条（お問い合わせ）'

export default function PrivacyPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>プライバシーポリシー</div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 60px', overflowY: 'auto', lineHeight: 1.9, fontSize: 13, color: 'var(--txt)' }}>
        <p style={{ color: 'var(--mute)', fontSize: 11, marginBottom: 24 }}>最終更新日：2026年5月24日</p>

        {SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g1)', marginBottom: 8 }}>{section.title}</div>
            <div style={{ whiteSpace: 'pre-line', color: 'var(--txt)' }}>{section.content}</div>
            {section.title === CONTACT_SECTION_TITLE && (
              <a
                href="mailto:info@golflink-hiroshima.com"
                style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--g2)', textDecoration: 'none', wordBreak: 'break-all' }}
              >
                info@golflink-hiroshima.com
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
