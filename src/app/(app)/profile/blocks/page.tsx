'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/LoadingDots'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

interface BlockEntry {
  blocked_id: string
  created_at: string
  profile: { user_id: string; nickname: string; avatar_url: string | null } | null
}

export default function BlockListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [blockList, setBlockList] = useState<BlockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })

      if (blocks && blocks.length > 0) {
        const ids = blocks.map((b: any) => b.blocked_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', ids)
        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) ?? [])
        setBlockList(blocks.map((b: any) => ({
          blocked_id: b.blocked_id,
          created_at: b.created_at,
          profile: profileMap.get(b.blocked_id) ?? null,
        })))
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleUnblock = async (blockedId: string) => {
    setUnblocking(blockedId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
    setBlockList(prev => prev.filter(b => b.blocked_id !== blockedId))
    setUnblocking(null)
  }

  if (loading) return <PageLoading />

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px', paddingLeft: '16px', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--g2)', fontSize: 13, fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          ブロックリスト
        </div>
      </div>

      <div style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {blockList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 6 }}>ブロック中のユーザーはいません</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>ユーザーをブロックするとここに表示されます</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em' }}>ブロック中 {blockList.length}人</div>
            {blockList.map((entry) => {
              const p = entry.profile
              const nickname = p?.nickname ?? '不明なユーザー'
              return (
                <div key={entry.blocked_id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: '14px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.04)' }}>
                  <div
                    onClick={() => router.push(`/user/${entry.blocked_id}`)}
                    style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--g1)', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}>
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : nickname[0]
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 3 }}>{nickname}</div>
                    <div style={{ fontSize: 10, color: 'var(--mute)' }}>
                      {new Date(entry.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}にブロック
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(entry.blocked_id)}
                    disabled={unblocking === entry.blocked_id}
                    style={{ background: 'none', border: '1px solid rgba(200,60,60,.35)', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#c05050', cursor: unblocking === entry.blocked_id ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: unblocking === entry.blocked_id ? .6 : 1 }}>
                    {unblocking === entry.blocked_id ? '解除中...' : 'ブロック解除'}
                  </button>
                </div>
              )
            })}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
