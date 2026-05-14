'use client'
import { useRouter } from 'next/navigation'

export default function LPPage() {
  const router = useRouter()

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Inter', sans-serif", background: '#fff', color: '#0D2B1F', overflowX: 'hidden' }}>

      {/* ナビ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(13,61,43,.96)', backdropFilter: 'blur(8px)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <img src="/GL白抜きロゴ.png" alt="GLH." style={{ height: 36, width: 'auto', mixBlendMode: 'screen' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => router.push('/login')} style={{ background: 'none', border: '1px solid rgba(168,224,99,.4)', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: 'rgba(168,224,99,.9)', cursor: 'pointer' }}>ログイン</button>
          <button onClick={() => router.push('/register')} style={{ background: '#A8E063', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#0D3D2B', cursor: 'pointer' }}>無料で始める</button>
        </div>
      </nav>

      {/* ヒーロー */}
      <section style={{ background: 'linear-gradient(160deg, #0D3D2B 0%, #1A5C40 60%, #2E7D55 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,224,99,.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,224,99,.08) 0%, transparent 70%)' }} />

        <div style={{ fontSize: 11, color: 'rgba(168,224,99,.7)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 16 }}>Golf Link Hiroshima</div>
        <img src="/GL白抜きロゴ.png" alt="GLH." style={{ height: 80, width: 'auto', mixBlendMode: 'screen', marginBottom: 24 }} />
        <h1 style={{ fontSize: 'clamp(32px, 8vw, 56px)', fontWeight: 700, color: '#A8E063', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 12 }}>
          Connecting Golfers
        </h1>
        <p style={{ fontSize: 'clamp(15px, 3vw, 19px)', color: 'rgba(255,255,255,.8)', marginBottom: 8, lineHeight: 1.7 }}>
          広島のゴルファーをつなぐコミュニティアプリ
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 44, lineHeight: 1.7 }}>
          血液型・星座相性でマッチング。ラウンド仲間を見つけよう。
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => router.push('/register')} style={{ background: '#A8E063', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, color: '#0D3D2B', cursor: 'pointer', boxShadow: '0 8px 24px rgba(168,224,99,.3)' }}>
            無料で始める →
          </button>
          <button onClick={() => router.push('/login')} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '14px 32px', fontSize: 15, color: 'white', cursor: 'pointer' }}>
            ログイン
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.12em' }}>SCROLL</div>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(180deg, rgba(168,224,99,.5), transparent)' }} />
        </div>
      </section>

      {/* 特徴4つ */}
      <section style={{ padding: '80px 24px', background: '#F5FAF7' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 10, color: '#8AADA0', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#0D3D2B' }}>GLH.でできること</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
            {[
              { icon: '⛳', title: 'ゴルファーマッチング', desc: 'ハンデ・エリア・ラウンド頻度で相性の良いゴルファーを検索。血液型・星座フィルターで絞り込み。', color: '#EBF4EF' },
              { icon: '📍', title: 'GPS距離計測', desc: 'コースでリアルタイムにグリーンまでの距離を計測。推奨クラブも自動表示。', color: '#E8F4FF' },
              { icon: '🏆', title: 'コンペ・予約', desc: 'GLH.主催のコンペに参加・主催が可能。ゴルフ場の予約も一括管理。', color: '#FFF8E8' },
              { icon: '📸', title: 'SNSタイムライン', desc: 'ラウンドの写真やスコアを投稿。仲間の投稿にいいねやコメントができるSNS機能。', color: '#F2EBF8' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'white', borderRadius: 16, padding: '26px 22px', border: '1px solid #D4E8DC', boxShadow: '0 2px 12px rgba(13,61,43,.06)' }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D3D2B', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: '#5A7A6A', lineHeight: 1.8 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 相性診断 */}
      <section style={{ padding: '80px 24px', background: '#0D3D2B' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(168,224,99,.6)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10 }}>Compatibility</div>
          <h2 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: 'white', marginBottom: 16 }}>
            血液型 × 星座で<br/>相性診断マッチング
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.8, marginBottom: 40 }}>
            ゴルフのスキルだけでなく、血液型と星座の相性も考慮した独自のマッチングアルゴリズム。相性◎のゴルファーと出会えます。
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {['A型', 'B型', 'O型', 'AB型'].map((b) => (
              <div key={b} style={{ background: 'rgba(168,224,99,.12)', border: '1px solid rgba(168,224,99,.25)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, color: '#A8E063' }}>{b}</div>
            ))}
          </div>
          <div style={{ fontSize: 22, color: 'rgba(168,224,99,.3)', margin: '12px 0' }}>×</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['♈牡羊', '♉牡牛', '♊双子', '♋蟹', '♌獅子', '♍乙女', '♎天秤', '♏蠍', '♐射手', '♑山羊', '♒水瓶', '♓魚'].map((z) => (
              <div key={z} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{z}</div>
            ))}
          </div>
          <div style={{ marginTop: 40, background: 'rgba(168,224,99,.08)', border: '1px solid rgba(168,224,99,.2)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: 'rgba(168,224,99,.7)', marginBottom: 8 }}>相性スコア例</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[{ label: '◎ 超相性', color: '#A8E063' }, { label: '○ 相性良好', color: '#C5F08A' }, { label: '△ 普通', color: 'rgba(255,255,255,.4)' }].map((s) => (
                <div key={s.label} style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SNS機能 */}
      <section style={{ padding: '80px 24px', background: '#F5FAF7' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 10, color: '#8AADA0', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10 }}>Community</div>
            <h2 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#0D3D2B', marginBottom: 12 }}>ゴルファーのSNSコミュニティ</h2>
            <p style={{ fontSize: 13, color: '#8AADA0', lineHeight: 1.8 }}>ラウンドの写真やスコアをシェアして、仲間とつながろう。</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: '📸', title: '写真投稿', desc: 'ラウンドの写真をタイムラインに投稿。思い出をシェアしよう。' },
              { icon: '❤️', title: 'いいね・コメント', desc: '仲間の投稿にいいねやコメントでリアクション。' },
              { icon: '👤', title: '個人プロフィール', desc: '自分だけのゴルファープロフィールページを作成。' },
              { icon: '💬', title: 'リアルタイムチャット', desc: 'マッチングした相手とメッセージのやりとりができます。' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'white', borderRadius: 14, padding: '22px 20px', border: '1px solid #D4E8DC', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0D3D2B', marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#5A7A6A', lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 10, color: '#8AADA0', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#0D3D2B' }}>料金プラン</h2>
            <p style={{ fontSize: 13, color: '#8AADA0', marginTop: 8 }}>いつでもキャンセル可能。まずは無料からお試しください。</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
            {[
              { name: '無料', price: '¥0', period: '/月', features: ['プロフィール作成', 'ゴルファー検索（閲覧）', 'コンペ閲覧', 'タイムライン閲覧'], cta: '無料で始める', recommended: false, dark: false },
              { name: 'スタンダード', price: '¥490', period: '/月', features: ['マッチング・メッセージ', 'GPS距離計測', 'コンペ参加', 'コース予約', 'SNS投稿・いいね'], cta: '申し込む', recommended: false, dark: false },
              { name: 'プレミアム', price: '¥990', period: '/月', features: ['スタンダード全機能', '相性診断フィルター', 'コンペ主催', 'レッスン予約', 'プロフィール優先表示'], cta: '申し込む', recommended: true, dark: true },
            ].map((plan) => (
              <div key={plan.name} style={{ background: plan.dark ? '#0D3D2B' : 'white', borderRadius: 16, padding: '28px 22px', border: plan.recommended ? '2px solid rgba(168,224,99,.5)' : '1px solid #D4E8DC', position: 'relative', boxShadow: plan.recommended ? '0 12px 32px rgba(13,61,43,.2)' : '0 2px 12px rgba(13,61,43,.06)' }}>
                {plan.recommended && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#A8E063', color: '#0D3D2B', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>おすすめ</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: plan.dark ? 'rgba(255,255,255,.6)' : '#5A7A6A', marginBottom: 6 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 20 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: plan.dark ? '#A8E063' : '#1A5C40', fontFamily: 'Inter' }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: plan.dark ? 'rgba(255,255,255,.4)' : '#8AADA0' }}>{plan.period}</span>
                </div>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: plan.dark ? 'rgba(168,224,99,.2)' : '#EBF4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={plan.dark ? '#A8E063' : '#2E7D55'} strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                    <span style={{ fontSize: 12, color: plan.dark ? 'rgba(255,255,255,.75)' : '#5A7A6A' }}>{f}</span>
                  </div>
                ))}
                <button onClick={() => router.push('/register')} style={{ width: '100%', background: plan.dark ? '#A8E063' : '#0D3D2B', color: plan.dark ? '#0D3D2B' : 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 20 }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #0D3D2B, #1A5C40)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 700, color: 'white', marginBottom: 12 }}>
            さあ、ゴルフ仲間を<br/>見つけよう
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.8, marginBottom: 36 }}>
            広島のゴルファーがあなたを待っています。<br/>無料登録で今すぐ始められます。
          </p>
          <button onClick={() => router.push('/register')} style={{ background: '#A8E063', border: 'none', borderRadius: 10, padding: '16px 40px', fontSize: 16, fontWeight: 700, color: '#0D3D2B', cursor: 'pointer', boxShadow: '0 8px 24px rgba(168,224,99,.3)' }}>
            無料で始める →
          </button>
        </div>
      </section>

      {/* フッター */}
      <footer style={{ background: '#070f07', padding: '32px 24px', textAlign: 'center' }}>
        <img src="/GL白抜きロゴ.png" alt="GLH." style={{ height: 32, width: 'auto', mixBlendMode: 'screen', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: '利用規約', path: '/legal/terms' },
            { label: 'プライバシーポリシー', path: '/legal/privacy' },
            { label: '特定商取引法', path: '/legal/tokusho' },
          ].map((link) => (
            <a key={link.label} href={link.path} style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>{link.label}</a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>© 2026 Golf Link Hiroshima. All rights reserved.</div>
      </footer>

    </div>
  )
}
