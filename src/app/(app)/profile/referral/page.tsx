'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'

export default function ReferralPage() {
  const router = useRouter()
  const supabase = createClient()
  const [inviteCode, setInviteCode] = useState('')
  const [freeMonths, setFreeMonths] = useState(0)
  const [referrals, setReferrals] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('invite_code, free_months_earned')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setInviteCode(profile.invite_code ?? '')
        setFreeMonths(profile.free_months_earned ?? 0)
      }

      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (refs && refs.length > 0) {
        const referredIds = refs.map((r: any) => r.referred_id)
        const { data: refProfiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url, gender')
          .in('user_id', referredIds)
        const profileMap: Record<string, any> = {}
        if (refProfiles) refProfiles.forEach(p => { profileMap[p.user_id] = p })
        setReferrals(refs.map((r: any) => ({ ...r, profile: profileMap[r.referred_id] })))
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'GLH. ゴルフコミュニティ',
      text: `招待コード【${inviteCode}】を使って登録すると1ヶ月無料！`,
      url: `https://golflink-hiroshima.com/register?invite=${inviteCode}`,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--mute)' }}>読み込み中...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: 14, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div onClick={() => router.back()} style={{ cursor: 'pointer', color: 'var(--g2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            友達を招待する
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ① プログラムカード */}
        <div style={{ background: 'linear-gradient(135deg, #0d3d2b, #1a4a2a)', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,224,99,.15) 0%, transparent 70%)' }} />

          <div style={{ fontSize: 10, color: 'rgba(168,224,99,.7)', letterSpacing: '.12em', fontFamily: 'Inter', marginBottom: 14 }}>REFERRAL PROGRAM</div>

          {/* 招待人数・無料月 */}
          <div style={{ display: 'flex', marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 4 }}>{referrals.length}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em' }}>INVITED</div>
              <div style={{ fontSize: 8, color: 'rgba(168,224,99,.6)', marginTop: 2, fontWeight: 600 }}>招待した人数</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 4 }}>{freeMonths}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em' }}>FREE MONTHS</div>
              <div style={{ fontSize: 8, color: 'rgba(168,224,99,.6)', marginTop: 2, fontWeight: 600 }}>無料月プール</div>
            </div>
          </div>

          {/* 無料月バナー */}
          {freeMonths > 0 && (
            <div style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', textAlign: 'center', marginBottom: 4 }}>
                🎁 プレミアム{freeMonths}ヶ月分の無料特典あり
              </div>
              <div style={{ fontSize: 11, color: 'rgba(74,222,128,.8)', lineHeight: 1.5, textAlign: 'center' }}>
                プレミアムプランに申し込むと、プール分をまとめて無料トライアル期間として自動適用されます。（例：3ヶ月プール → 90日間無料）
              </div>
            </div>
          )}
          {freeMonths > 0 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', lineHeight: 1.5, marginBottom: 14, paddingLeft: 2 }}>
              ※ トライアル期間終了後は自動的に通常料金（¥490/月）が課金されます。解約はいつでも可能です。
            </div>
          )}

          {/* 招待コード */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>あなたの招待コード</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: '12px 16px', fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '.08em' }}>
                {inviteCode || '—'}
              </div>
              <button
                onClick={handleCopy}
                style={{ background: copied ? '#4ade80' : 'rgba(255,255,255,.15)', border: 'none', borderRadius: 10, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: copied ? '#0d3d2b' : 'white', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s' }}
              >
                {copied ? '✓ コピー済' : 'コピー'}
              </button>
            </div>
          </div>

          {/* シェアボタン */}
          <button
            onClick={handleShare}
            style={{ width: '100%', background: '#4ade80', color: '#0d3d2b', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            友達に招待リンクを送る
          </button>
        </div>

        {/* ② 特典説明カード */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 12 }}>招待特典について</div>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <span style={{
              fontSize: 16, fontWeight: 800, color: 'var(--txt)', whiteSpace: 'nowrap',
              background: 'linear-gradient(transparent 55%, #ffe14d 55%)',
              boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
              padding: '0 2px',
            }}>
              プレミアム30日無料×招待人数
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0d3d2b, #1a4a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>招待した方</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.5 }}>友達が登録するたびに1ヶ月分をプール。プレミアムプランに申し込む際に、プール分をまとめて無料トライアル期間として自動適用されます。</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--surf)', paddingTop: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0d3d2b, #1a4a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>招待された方</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.5 }}>招待コードで登録すると1ヶ月分をプール。プレミアムプランに申し込む際に1ヶ月間の無料トライアルが自動適用されます。</div>
              </div>
            </div>
          </div>
        </div>

        {/* ③ 招待履歴 */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--line)', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 12 }}>招待履歴</div>
          {referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだ招待した友達がいません</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {referrals.map((r: any) => {
                const dateStr = r.created_at
                  ? new Date(r.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                  : ''
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={40} nickname={r.profile?.nickname ?? '?'} gender={r.profile?.gender} avatarUrl={r.profile?.avatar_url ?? null} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{r.profile?.nickname ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{dateStr}に登録</div>
                    </div>
                    <div style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                      +1ヶ月
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
