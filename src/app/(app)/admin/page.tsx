'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_EMAIL = 'info@sessions-inc.jp'

type RefRow = { ref_source: string | null; count: number; paid_count: number }

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RefRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [paidCount, setPaidCount] = useState(0)
  const [referralCount, setReferralCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ALLOWED_EMAIL) {
        router.replace('/home')
        return
      }
      setAuthorized(true)

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('ref_source, user_id')

      const { data: subscriptionUsers } = await supabase
        .from('subscriptions')
        .select('user_id, plan')

      const paidUserIds = new Set(subscriptionUsers?.map(s => s.user_id) ?? [])

      if (profileRows) {
        setTotalCount(profileRows.length)
        const counts: Record<string, number> = {}
        for (const row of profileRows) {
          const key = row.ref_source ?? '__null__'
          counts[key] = (counts[key] ?? 0) + 1
        }
        const sorted = Object.entries(counts)
          .map(([key, count]) => {
            const usersInGroup = profileRows
              .filter(p => (p.ref_source ?? '__null__') === key)
              .map(p => p.user_id)
            const paidInGroup = usersInGroup.filter(id => paidUserIds.has(id)).length
            return {
              ref_source: key === '__null__' ? null : key,
              count,
              paid_count: paidInGroup,
            }
          })
          .sort((a, b) => b.count - a.count)
        setRows(sorted)
      }

      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
      setPaidCount(subCount ?? 0)

      const { count: refCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
      setReferralCount(refCount ?? 0)

      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off)' }}>
        <div style={{ fontSize: 13, color: 'var(--mute)' }}>読み込み中...</div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>管理画面</div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px 60px' }}>
        {/* サマリーカード */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[
            { label: '合計登録数', value: totalCount },
            { label: '有料プラン加入', value: paidCount },
            { label: '招待コード経由', value: referralCount },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px 16px', boxShadow: '0 1px 4px rgba(13,61,43,.05)' }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.1em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--g1)', fontFamily: 'Inter' }}>{value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* 流入元一覧 */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mute)', letterSpacing: '.1em', marginBottom: 10 }}>流入元別 登録数</div>
        {rows.map(({ ref_source, count, paid_count }) => (
          <div key={ref_source ?? 'null'} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(13,61,43,.04)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                {ref_source ?? '直接登録（なし）'}
              </div>
              {ref_source?.startsWith('nfc_') && (
                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>NFCカード</div>
              )}
              {ref_source === 'lp' && (
                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>ランディングページ</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g1)', fontFamily: 'Inter' }}>{count}人</div>
              <div style={{ fontSize: 10, color: 'var(--g2)', marginTop: 2 }}>有料: {paid_count}人</div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--mute)', fontSize: 13, padding: '40px 0' }}>データなし</div>
        )}

        {/* 招待コード統計 */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mute)', letterSpacing: '.1em', marginBottom: 10, marginTop: 24 }}>招待コード統計</div>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid var(--line)', padding: '14px 16px', boxShadow: '0 1px 4px rgba(13,61,43,.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--txt)' }}>招待コード経由の登録</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g1)', fontFamily: 'Inter' }}>{referralCount}人</div>
          </div>
        </div>
      </div>
    </div>
  )
}
