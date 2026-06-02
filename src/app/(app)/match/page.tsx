'use client'
import { Icons } from '@/components/icons'
import { SectionLoading } from '@/components/LoadingDots'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canSeeInterest, type Plan } from '@/lib/plan'
import { addPoints } from '@/lib/points'
import { getZodiacSign, getZodiacCompat, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'
import { FriendAvatar } from '@/components/FriendAvatar'
import GenderBadge from '@/components/GenderBadge'

interface MatchProfile {
  user_id: string
  nickname: string
  birth_date: string
  blood_type: string
  handicap: number
  best_score: number | null
  round_freq: string
  area_id: string | null
  preferred_days: string[]
  bio: string | null
  avatar_url: string | null
  plan: string
  match_score: number
  gender?: string
  areas?: string[]
}

const DUMMY_INTEREST = [
  { id: 'a', name: '田中　○○', area: '広島・廿日市', hdcp: 15 },
  { id: 'b', name: '山田　○○', area: '東広島・呉', hdcp: 28 },
  { id: 'c', name: '鈴木　○○', area: '福山', hdcp: 5 },
]

const AREA_LABELS: Record<string, string> = {
  '広島/廿日市エリア': '広島・廿日市',
  '広島北部エリア': '広島北',
  '東広島/呉エリア': '東広島・呉',
  '竹原/三原/尾道エリア': '尾道エリア',
  '福山エリア': '福山',
}

const LEVEL_LABEL = (hdcp: number) => {
  if (hdcp >= 30) return { label: '初心者', color: '#4a90d9' }
  if (hdcp >= 20) return { label: '中級者', color: '#3a7a3a' }
  return { label: '上級者', color: '#c07020' }
}

const AGE_DECADE = (birthDate: string) => {
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear()
  if (age < 20) return '10代'
  if (age < 30) return '20代'
  if (age < 40) return '30代'
  if (age < 50) return '40代'
  if (age < 60) return '50代'
  return '60代以上'
}

const AVATAR_COLORS = [
  { bg: '#E8F0F8', text: '#3a6aaa' }, { bg: '#F2EBF8', text: '#7a50aa' },
  { bg: '#EBF5EB', text: '#3a7a3a' }, { bg: '#FFF5E8', text: '#c07020' },
  { bg: '#F8EBF0', text: '#aa3a6a' },
]

const BLOOD_COMPAT: Record<string, Record<string, string>> = {
  A: { A: '◎', B: '△', O: '◎', AB: '○' },
  B: { A: '△', B: '◎', O: '◎', AB: '○' },
  O: { A: '◎', B: '◎', O: '○', AB: '△' },
  AB: { A: '○', B: '○', O: '△', AB: '◎' },
}

const FILTERS = ['全員', '男性', '女性', '初心者', '初級者', '中級者', '上級者', '広島/廿日市', '広島北部', '東広島/呉', '竹原/三原/尾道', '福山', '相性診断', 'お気に入り']

const getHdcpLabel = (handicap: number) => {
  if (handicap >= 30) return '初心者'
  if (handicap >= 19) return '初級者'
  if (handicap >= 9) return '中級者'
  return '上級者'
}


const getPlanBadge = (plan: Plan) => {
  if (plan === 'executive') return { label: 'EXECUTIVE', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
  if (plan === 'premium') return { label: 'PREMIUM', bg: 'linear-gradient(135deg, var(--g2), var(--g3))', color: 'white' }
  return { label: 'FREE', bg: 'var(--surf)', color: 'var(--mute)' }
}

export default function MatchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'golfer' | 'interest'>('golfer')
  const [matches, setMatches] = useState<MatchProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [filters, setFilters] = useState<string[]>(['全員'])
  const [myProfile, setMyProfile] = useState<{ blood_type: string; birth_date: string } | null>(null)
  const [myId, setMyId] = useState('')
  const [chatLoading, setChatLoading] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [interestSubTab, setInterestSubTab] = useState<'footprint' | 'favorited' | 'favoriting'>('footprint')
  const [footprints, setFootprints] = useState<any[]>([])
  const [favoritedBy, setFavoritedBy] = useState<any[]>([])
  const [favoritingList, setFavoritingList] = useState<any[]>([])
  const [favoritedByIds, setFavoritedByIds] = useState<Set<string>>(new Set())
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('tab') === 'interest') setActiveTab('interest')
    const sub = p.get('sub')
    if (sub === 'favorited' || sub === 'favoriting') setInterestSubTab(sub)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data: me } = await supabase
        .from('profiles')
        .select('blood_type, birth_date')
        .eq('user_id', user.id)
        .single()
      if (me) setMyProfile(me)

      // マッチング一覧
      const { data, error } = await supabase.rpc('get_matches_with_score', {
        p_user_id: user.id, p_limit: 20, p_offset: 0, p_min_score: 0,
      })
      if (!error) setMatches(data ?? [])

      // お気に入り・ブロック一覧
      const [{ data: favData }, { data: favMeData }, { data: iBlockData }, { data: blockedByData }] = await Promise.all([
        supabase.from('favorites').select('target_id').eq('user_id', user.id),
        supabase.from('favorites').select('user_id').eq('target_id', user.id),
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.from('blocks').select('blocker_id').eq('blocked_id', user.id),
      ])
      if (favData) setFavorites(new Set(favData.map(f => f.target_id)))
      if (favData && favMeData) {
        const favMeSet = new Set(favMeData.map(f => f.user_id))
        setFriendIds(new Set(favData.filter(f => favMeSet.has(f.target_id)).map(f => f.target_id)))
      }
      setBlockedUserIds(new Set([
        ...(iBlockData?.map((b: any) => b.blocked_id) ?? []),
        ...(blockedByData?.map((b: any) => b.blocker_id) ?? []),
      ]))

      const plan = await getUserPlan()
      setUserPlan(plan)

      if (canSeeInterest(plan)) {
        // 足跡（自分のページを見た人）— 2ステップで確実に取得
        const { data: fpRaw } = await supabase
          .from('footprints')
          .select('user_id, created_at')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (fpRaw && fpRaw.length > 0) {
          const visitorIds = [...new Set(fpRaw.map((f: any) => f.user_id))]
          const { data: fpProfiles } = await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url, gender, blood_type, birth_date, areas')
            .in('user_id', visitorIds)
          const pm = new Map(fpProfiles?.map((p: any) => [p.user_id, p]) ?? [])
          setFootprints(fpRaw.map((f: any) => ({ ...f, profiles: pm.get(f.user_id) ?? null })))
        }

        // お気に入りされた — 2ステップ
        const { data: fbRaw } = await supabase
          .from('favorites')
          .select('user_id, created_at')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (fbRaw && fbRaw.length > 0) {
          const fbIds = fbRaw.map((f: any) => f.user_id)
          const { data: fbProfiles } = await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url, gender, blood_type, birth_date, areas')
            .in('user_id', fbIds)
          const pm = new Map(fbProfiles?.map((p: any) => [p.user_id, p]) ?? [])
          const enriched = fbRaw.map((f: any) => ({ ...f, profiles: pm.get(f.user_id) ?? null }))
          setFavoritedBy(enriched)
          setFavoritedByIds(new Set(fbRaw.map((f: any) => f.user_id)))
        }

        // お気に入りした — 2ステップ
        const { data: myFavIds } = await supabase
          .from('favorites')
          .select('target_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (myFavIds && myFavIds.length > 0) {
          const ids = myFavIds.map((f: any) => f.target_id)
          const { data: favProfiles } = await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url, gender, blood_type, birth_date, areas')
            .in('user_id', ids)
          const pm = new Map(favProfiles?.map((p: any) => [p.user_id, p]) ?? [])
          setFavoritingList(myFavIds.map((f: any) => ({ ...f, profiles: pm.get(f.target_id) ?? null })))
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'たった今'
    if (min < 60) return `${min}分前`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}時間前`
    const day = Math.floor(hr / 24)
    if (day === 1) return '昨日'
    return `${day}日前`
  }

  // プロフィールを見た時に足跡を記録
  const recordFootprint = async (targetId: string) => {
    if (!myId || myId === targetId) return
    await supabase.from('footprints').insert({
      user_id: myId,
      target_id: targetId,
    })
  }

  // お気に入りトグル
  const toggleFavorite = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!myId) return
    const isFav = favorites.has(targetId)
    const newFavs = new Set(favorites)

    if (isFav) {
      newFavs.delete(targetId)
      await supabase.from('favorites').delete()
        .eq('user_id', myId).eq('target_id', targetId)
    } else {
      newFavs.add(targetId)
      await supabase.from('favorites').insert({
        user_id: myId,
        target_id: targetId,
      })
      const favKey = `ptsf_${myId}_${targetId}`
      if (!localStorage.getItem(favKey)) {
        addPoints(supabase, myId, 5)
        const { data: reverse } = await supabase.from('favorites')
          .select('id').eq('user_id', targetId).eq('target_id', myId).maybeSingle()
        if (reverse) {
          addPoints(supabase, myId, 20)
          addPoints(supabase, targetId, 20)
        }
        localStorage.setItem(favKey, '1')
      }
    }
    setFavorites(newFavs)
  }

  const handleChat = async (otherUserId: string) => {
    if (!myId) return
    setChatLoading(otherUserId)
    await recordFootprint(otherUserId)

    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${myId})`)
      .single()

    if (existing) { router.push(`/chat/${existing.id}`); return }

    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({ user1_id: myId, user2_id: otherUserId })
      .select('id')
      .single()

    if (newRoom) {
      router.push(`/chat/${newRoom.id}`)
    }
    setChatLoading(null)
  }

  const toggleFilter = (f: string) => {
    if (f === '全員') { setFilters(['全員']); return }
    setFilters(prev => {
      const next = prev.filter(x => x !== '全員')
      if (next.includes(f)) {
        const removed = next.filter(x => x !== f)
        return removed.length === 0 ? ['全員'] : removed
      }
      return [...next, f]
    })
  }

  const CATEGORY_GENDER = ['男性', '女性']
  const CATEGORY_HDCP = ['初心者', '初級者', '中級者', '上級者']
  const CATEGORY_AREA = ['広島/廿日市', '広島北部', '東広島/呉', '竹原/三原/尾道', '福山']
  const CATEGORY_SPECIAL = ['相性診断', 'お気に入り']

  const matchSingle = (f: string, m: MatchProfile): boolean => {
    if (f === '男性') return m.gender === 'male'
    if (f === '女性') return m.gender === 'female'
    if (f === '初心者') return m.handicap >= 30
    if (f === '初級者') return m.handicap >= 19 && m.handicap < 30
    if (f === '中級者') return m.handicap >= 9 && m.handicap < 19
    if (f === '上級者') return m.handicap < 9
    if (f === '広島/廿日市') return m.areas?.includes('広島/廿日市エリア') ?? false
    if (f === '広島北部') return m.areas?.includes('広島北部エリア') ?? false
    if (f === '東広島/呉') return m.areas?.includes('東広島/呉エリア') ?? false
    if (f === '竹原/三原/尾道') return m.areas?.includes('竹原/三原/尾道エリア') ?? false
    if (f === '福山') return m.areas?.includes('福山エリア') ?? false
    if (f === 'お気に入り') return favorites.has(m.user_id)
    if (f === '相性診断') {
      if (!myProfile || !m.blood_type || !m.birth_date) return false
      const bloodOk = BLOOD_COMPAT[myProfile.blood_type]?.[m.blood_type] !== '△'
      const mySign = getZodiacSign(myProfile.birth_date)
      const otherSign = getZodiacSign(m.birth_date)
      const zodiacOk = getZodiacCompat(mySign, otherSign) !== '△'
      return bloodOk && zodiacOk
    }
    return true
  }

  const filteredMatches = matches.filter(m => {
    if (blockedUserIds.has(m.user_id)) return false
    if (filters.includes('全員')) return true
    // 同カテゴリはOR、カテゴリ間はAND
    const cats = [CATEGORY_GENDER, CATEGORY_HDCP, CATEGORY_AREA, CATEGORY_SPECIAL]
    return cats.every(cat => {
      const active = filters.filter(f => cat.includes(f))
      return active.length === 0 || active.some(f => matchSingle(f, m))
    })
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo variant="screen" />
        {(() => { const b = getPlanBadge(userPlan); return <span style={{ background: b.bg, color: b.color, borderRadius: 5, padding: '3px 9px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>{b.label}</span> })()}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white' }}>
        {(['golfer', 'interest'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {tab === 'golfer' ? Icons.users(14, 'currentColor') : Icons.heart(14, 'currentColor')}
              {tab === 'golfer' ? 'ゴルファーを探す' : '気になる'}
            </span>
          </button>
        ))}
      </div>
      </div>

      {activeTab === 'golfer' && (
        <>
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <button key={f} onClick={() => toggleFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${f === '相性診断' ? 'rgba(168,224,99,.5)' : f === 'お気に入り' ? 'rgba(200,60,100,.3)' : filters.includes(f) ? 'var(--g3)' : 'var(--line)'}`,
                  color: filters.includes(f) ? (f === 'お気に入り' ? '#c05080' : 'var(--g2)') : 'var(--mid)',
                  background: f === '相性診断' ? filters.includes(f) ? 'rgba(168,224,99,.2)' : 'rgba(168,224,99,.08)' : f === 'お気に入り' ? filters.includes(f) ? 'rgba(200,60,100,.12)' : 'rgba(200,60,100,.05)' : filters.includes(f) ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                  fontWeight: filters.includes(f) ? 600 : 400,
                }}>{f}</button>
              ))}
            </div>
          </div>

          {filters.includes('相性診断') && myProfile && (
            <div style={{ margin: '8px 16px 0', background: 'linear-gradient(135deg,var(--g1),var(--g2))', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(168,224,99,.2)' }}>
              <div style={{ fontSize: 10, color: 'rgba(168,224,99,.7)', letterSpacing: '.1em', marginBottom: 4 }}>あなたの相性データ</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--lime)' }}>{myProfile.blood_type}型</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>血液型</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.15)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lime)' }}>{ZODIAC_NAMES_JP[getZodiacSign(myProfile.birth_date)]}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>星座</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.15)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}>血液型・星座ともに相性◎○のゴルファーを表示中</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ paddingBottom: 90 }}>
            <div style={{ height: 8 }} />
            {loading && <SectionLoading text="マッチングを検索中" />}
            {!loading && filteredMatches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {filters.includes('お気に入り') ? '❤️' : '⛳'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>
                  {filters.includes('お気に入り') ? 'お気に入りがまだいません' : filters.includes('相性診断') ? '相性の良いゴルファーがまだいません' : 'まだゴルファーがいません'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>
                  {filters.includes('お気に入り') ? 'ゴルファーカードの♡をタップして\nお気に入り登録しましょう' : '友達を招待してフレンドを探しましょう！'}
                </div>
              </div>
            )}
            {!loading && filteredMatches.map((m, i) => {
              const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const bloodCompat = myProfile ? BLOOD_COMPAT[myProfile.blood_type]?.[m.blood_type] : null
              const zodiacCompat = myProfile && m.birth_date
                ? getZodiacCompat(getZodiacSign(myProfile.birth_date), getZodiacSign(m.birth_date))
                : null
              const otherZodiac = m.birth_date ? ZODIAC_NAMES_JP[getZodiacSign(m.birth_date)] : null
              const isFav = favorites.has(m.user_id)

              return (
                <div key={m.user_id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: `1px solid ${isFav ? 'rgba(200,60,100,.2)' : 'var(--line)'}`, padding: 14, boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                    <FriendAvatar
                      avatarUrl={m.avatar_url}
                      nickname={m.nickname}
                      isFriend={friendIds.has(m.user_id)}
                      size={46}
                      borderRadius={10}
                      bg={avatarColor.bg}
                      textColor={avatarColor.text}
                      onClick={() => router.push(`/user/${m.user_id}`)}
                    />
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/user/${m.user_id}`)}>
                      <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        {m.plan === 'executive' && <span style={{ color: '#f59e0b' }}>{Icons.crown(13, '#f59e0b')}</span>}
                        {m.nickname}
                        {m.gender && (
                          <span style={{ width: 14, height: 14, borderRadius: 3, background: m.gender === 'male' ? '#3b82f6' : m.gender === 'female' ? '#ec4899' : '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {m.gender === 'male' && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><line x1="14.5" y1="9.5" x2="21" y2="3"/><polyline points="16,3 21,3 21,8"/></svg>}
                            {m.gender === 'female' && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="19" x2="15" y2="19"/></svg>}
                            {m.gender === 'other' && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>}
                          </span>
                        )}
                      </div>
                      {m.areas && m.areas.length > 0 && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5 }}>{AREA_LABELS[m.areas[0]] ?? m.areas[0]}</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.blood_type && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{m.blood_type}型 {bloodCompat ?? ''}</span>}
                        {otherZodiac && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{otherZodiac} {zodiacCompat ?? ''}</span>}
                        {m.handicap != null && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{getHdcpLabel(m.handicap)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* お気に入りボタン */}
                        <button onClick={(e) => toggleFavorite(m.user_id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: isFav ? '#e05070' : 'var(--pale)', padding: '2px 4px', lineHeight: 1 }}>
                          {isFav ? Icons.heart(16, '#e05070', true) : Icons.heart(16, 'var(--mute)')}
                        </button>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: 'var(--g2)', lineHeight: 1 }}>{Math.round(m.match_score)}<span style={{ fontSize: 11 }}>%</span></div>
                          <div style={{ fontSize: 8, color: 'var(--mute)' }}>マッチ度</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleChat(m.user_id)}
                        disabled={chatLoading === m.user_id}
                        style={{ background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: chatLoading === m.user_id ? 0.6 : 1 }}>
                        {chatLoading === m.user_id ? '...' : '💬 チャット'}
                      </button>

                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'interest' && (
        <div style={{ paddingBottom: 90 }}>
          {!canSeeInterest(userPlan) ? (
            /* フリープラン：エグゼクティブ誘導 */
            <div style={{ position: 'relative' }}>
              {/* ぼかしダミーカード */}
              <div style={{ filter: 'blur(4px)', pointerEvents: 'none', padding: '8px 0' }}>
                {DUMMY_INTEREST.map((d) => (
                  <div key={d.id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, display: 'flex', gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--g1)', flexShrink: 0 }}>{d.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 4 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>{d.area}</div>
                      <div style={{ fontSize: 10, color: 'var(--mute)' }}>HC {d.hdcp}</div>
                    </div>
                    <div style={{ background: 'var(--g1)', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, alignSelf: 'center' }}>💬 チャット</div>
                  </div>
                ))}
              </div>
              {/* 誘導バナー */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                <div style={{ background: 'var(--g1)', borderRadius: 18, padding: '22px 20px', textAlign: 'center', width: '100%', boxShadow: '0 8px 28px rgba(13,61,43,.35)' }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>👑</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 8 }}>気になるを見るには</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.8, marginBottom: 16 }}>
                    あなたのプロフィールを見た人<br />お気に入りに追加した人・された人を<br />確認できます
                  </div>
                  <button onClick={() => router.push('/subscription')} style={{ background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    プレミアム以上にアップグレード →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* エグゼクティブプラン */
            <>
              {/* サブタブ */}
              <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                {([
                  { key: 'footprint', label: '足跡' },
                  { key: 'favorited', label: 'お気に入りされた' },
                  { key: 'favoriting', label: 'お気に入りした' },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setInterestSubTab(key)} style={{ flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: interestSubTab === key ? 700 : 500, color: interestSubTab === key ? 'var(--g2)' : 'var(--mute)', background: 'none', border: 'none', borderBottom: interestSubTab === key ? '2px solid var(--g2)' : '2px solid transparent', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* 足跡タブ */}
              {interestSubTab === 'footprint' && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '6px 16px 10px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em' }}>最近あなたのプロフィールを見た人</div>
                  {footprints.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>👣</div>
                      <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだ足跡がありません</div>
                    </div>
                  )}
                  {footprints.map((fp: any, i) => {
                    const p = fp.profiles
                    if (!p) return null
                    return (
                      <div key={`${fp.user_id}-${i}`} onClick={() => router.push(`/user/${p.user_id}?from=footprint`)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.04)', cursor: 'pointer' }}>
                        <FriendAvatar
                          avatarUrl={p.avatar_url}
                          nickname={p.nickname}
                          isFriend={friendIds.has(p.user_id)}
                          size={46}
                          borderRadius={10}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{p.nickname}</span>
                            <GenderBadge gender={p.gender} size={14} />
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {p.blood_type && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{p.blood_type}型</span>}
                            {p.birth_date && ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)]}</span>}
                            {p.areas?.[0] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{AREA_LABELS[p.areas[0]] ?? p.areas[0]}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>{timeAgo(fp.created_at)}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleChat(p.user_id) }} disabled={chatLoading === p.user_id} style={{ background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: chatLoading === p.user_id ? 0.6 : 1 }}>
                          {chatLoading === p.user_id ? '...' : '💬'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* お気に入りされたタブ */}
              {interestSubTab === 'favorited' && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '6px 16px 10px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em' }}>あなたをお気に入りした人</div>
                  {favoritedBy.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>❤️</div>
                      <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだお気に入りされていません</div>
                    </div>
                  )}
                  {favoritedBy.map((fb: any, i) => {
                    const p = fb.profiles
                    if (!p) return null
                    const isMutual = favorites.has(p.user_id)
                    return (
                      <div key={`${fb.user_id}-${i}`} onClick={() => router.push(`/user/${p.user_id}?from=favorited`)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: `1px solid ${isMutual ? 'rgba(22,101,52,.25)' : 'var(--line)'}`, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.04)', cursor: 'pointer' }}>
                        <FriendAvatar
                          avatarUrl={p.avatar_url}
                          nickname={p.nickname}
                          isFriend={friendIds.has(p.user_id)}
                          size={46}
                          borderRadius={10}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{p.nickname}</span>
                            <GenderBadge gender={p.gender} size={14} />
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {p.blood_type && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{p.blood_type}型</span>}
                            {p.birth_date && ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)]}</span>}
                            {p.areas?.[0] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{AREA_LABELS[p.areas[0]] ?? p.areas[0]}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>{timeAgo(fb.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.user_id, e) }} style={{ background: 'none', border: `1px solid ${isMutual ? 'rgba(224,80,112,.4)' : 'var(--line)'}`, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isMutual ? Icons.heart(15, '#e05070', true) : Icons.heart(15, 'var(--mute)')}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleChat(p.user_id) }} disabled={chatLoading === p.user_id} style={{ background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 7, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: chatLoading === p.user_id ? 0.6 : 1 }}>
                            {chatLoading === p.user_id ? '...' : '💬'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* お気に入りしたタブ */}
              {interestSubTab === 'favoriting' && (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '6px 16px 10px', fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em' }}>あなたがお気に入りした人</div>
                  {favoritingList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>❤️</div>
                      <div style={{ fontSize: 13, color: 'var(--mute)' }}>まだお気に入りしていません</div>
                    </div>
                  )}
                  {favoritingList.map((fl: any, i) => {
                    const p = fl.profiles
                    if (!p) return null
                    const isMutual = favoritedByIds.has(p.user_id)
                    return (
                      <div key={`${fl.target_id}-${i}`} onClick={() => router.push(`/user/${p.user_id}?from=favoriting`)} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: `1px solid ${isMutual ? 'rgba(22,101,52,.25)' : 'var(--line)'}`, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 8px rgba(13,61,43,.04)', cursor: 'pointer' }}>
                        <FriendAvatar
                          avatarUrl={p.avatar_url}
                          nickname={p.nickname}
                          isFriend={friendIds.has(p.user_id)}
                          size={46}
                          borderRadius={10}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{p.nickname}</span>
                            <GenderBadge gender={p.gender} size={14} />
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {p.blood_type && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{p.blood_type}型</span>}
                            {p.birth_date && ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{ZODIAC_NAMES_JP[getZodiacSign(p.birth_date)]}</span>}
                            {p.areas?.[0] && <span style={{ fontSize: 10, color: 'var(--mid)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', background: 'var(--surf)' }}>{AREA_LABELS[p.areas[0]] ?? p.areas[0]}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 4 }}>{timeAgo(fl.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.user_id, e) }} style={{ background: 'none', border: '1px solid rgba(224,80,112,.4)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {Icons.heart(15, '#e05070', true)}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleChat(p.user_id) }} disabled={chatLoading === p.user_id} style={{ background: 'var(--g1)', color: 'var(--lime)', border: 'none', borderRadius: 7, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: chatLoading === p.user_id ? 0.6 : 1 }}>
                            {chatLoading === p.user_id ? '...' : '💬'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
