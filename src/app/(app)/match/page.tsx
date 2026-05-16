'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserPlan, canCreateChat, type Plan } from '@/lib/plan'
import { getZodiacSign, getZodiacCompat, ZODIAC_NAMES_JP } from '@/lib/zodiac'
import BottomNav from '@/components/layout/BottomNav'
import Logo from '@/components/layout/Logo'

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
}

const LESSONS = [
  { id: 1, name: '中村 浩二 プロ', desc: 'ドライバー · アプローチ改善専門', price: 8000, rating: 4.9, reviews: 128, initial: '中', color: '#0D3D2B', textColor: '#A8E063', badge: '空きあり', badgeColor: '#EBF4EF', badgeText: '#2E7D55' },
  { id: 2, name: '田中 ゴルフアカデミー', desc: '初心者〜中級者 · 少人数制', price: 5500, rating: 4.6, reviews: 89, initial: '田', color: '#EBF4EF', textColor: '#1A5C40', badge: '体験あり', badgeColor: '#EBF4EF', badgeText: '#8AADA0' },
  { id: 3, name: '小林 美香 プロ', desc: 'スコアアップ · メンタル強化', price: 9500, rating: 4.8, reviews: 56, initial: '小', color: '#F2EBF8', textColor: '#7a50aa', badge: '人気', badgeColor: '#A8E063', badgeText: '#0D3D2B' },
]

const FREQ_LABELS: Record<string, string> = {
  weekly_2plus: '週2回以上', weekly_1: '週1回', monthly_2_3: '月2〜3回', monthly_1: '月1回', rarely: 'たまに',
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

const FILTERS = ['全員', '男性', '女性', '初心者', '上級者', '週末希望', '⭐相性診断', '❤️ お気に入り']

export default function MatchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'golfer' | 'lesson'>('golfer')
  const [matches, setMatches] = useState<MatchProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<Plan>('free')
  const [filter, setFilter] = useState('全員')
  const [myProfile, setMyProfile] = useState<{ blood_type: string; birth_date: string } | null>(null)
  const [myId, setMyId] = useState('')
  const [chatLoading, setChatLoading] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [activeTab2, setActiveTab2] = useState<'list' | 'footprint'>('list')

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

      // お気に入り一覧
      const { data: favData } = await supabase
        .from('favorites')
        .select('target_id')
        .eq('user_id', user.id)
      if (favData) setFavorites(new Set(favData.map(f => f.target_id)))

      // 足跡を記録
      await supabase.from('footprints').insert({
        user_id: user.id,
        target_id: user.id,
      }).then(() => {})

      const plan = await getUserPlan()
    setUserPlan(plan)
    setLoading(false)
    }
    fetchData()
  }, [])

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

    if (newRoom) router.push(`/chat/${newRoom.id}`)
    setChatLoading(null)
  }

  const filteredMatches = matches.filter(m => {
    if (filter === '全員') return true
    if (filter === '男性') return m.gender === 'male'
    if (filter === '女性') return m.gender === 'female'
    if (filter === '初心者') return m.handicap >= 30
    if (filter === '上級者') return m.handicap < 13
    if (filter === '週末希望') return m.preferred_days?.includes('sat') || m.preferred_days?.includes('sun')
    if (filter === '❤️ お気に入り') return favorites.has(m.user_id)
    if (filter === '⭐相性診断') {
      if (!myProfile || !m.blood_type || !m.birth_date) return false
      const bloodOk = BLOOD_COMPAT[myProfile.blood_type]?.[m.blood_type] !== '△'
      const mySign = getZodiacSign(myProfile.birth_date)
      const otherSign = getZodiacSign(m.birth_date)
      const zodiacOk = getZodiacCompat(mySign, otherSign) !== '△'
      return bloodOk && zodiacOk
    }
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo variant="screen" />
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'rgba(168,224,99,.8)', letterSpacing: '.08em' }}>広島市</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'white', flexShrink: 0 }}>
        {(['golfer', 'lesson'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, color: activeTab === tab ? 'var(--g2)' : 'var(--mute)', fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab === 'golfer' ? '⛳ ゴルファーを探す' : '📚 レッスン'}
          </button>
        ))}
      </div>

      {activeTab === 'golfer' && (
        <>
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${f === '⭐相性診断' ? 'rgba(168,224,99,.5)' : f === '❤️ お気に入り' ? 'rgba(200,60,100,.3)' : filter === f ? 'var(--g3)' : 'var(--line)'}`,
                  color: filter === f ? (f === '❤️ お気に入り' ? '#c05080' : 'var(--g2)') : 'var(--mid)',
                  background: f === '⭐相性診断' ? filter === f ? 'rgba(168,224,99,.2)' : 'rgba(168,224,99,.08)' : f === '❤️ お気に入り' ? filter === f ? 'rgba(200,60,100,.12)' : 'rgba(200,60,100,.05)' : filter === f ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                  fontWeight: filter === f ? 600 : 400,
                }}>{f}</button>
              ))}
            </div>
          </div>

          {filter === '⭐相性診断' && myProfile && (
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

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            <div style={{ height: 8 }} />
            {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mute)', fontSize: 13 }}>マッチングを検索中...</div>}
            {!loading && filteredMatches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {filter === '❤️ お気に入り' ? '❤️' : '⛳'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600, marginBottom: 6 }}>
                  {filter === '❤️ お気に入り' ? 'お気に入りがまだいません' : filter === '⭐相性診断' ? '相性の良いゴルファーがまだいません' : 'まだゴルファーがいません'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>
                  {filter === '❤️ お気に入り' ? 'ゴルファーカードの♡をタップして\nお気に入り登録しましょう' : '友達を招待してマッチングを始めましょう！'}
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
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: avatarColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: avatarColor.text, flexShrink: 0 }}>
                        {m.nickname?.[0] ?? '?'}
                      </div>
                      {/* 性別バッジ */}
                      {m.gender && (
                        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: m.gender === 'male' ? '#4a90d9' : m.gender === 'female' ? '#e06090' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', border: '1.5px solid white' }}>
                          {m.gender === 'male' ? '♂' : m.gender === 'female' ? '♀' : '⚧'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: 'var(--txt)', fontWeight: 600 }}>
                        {m.nickname}
                        {m.birth_date && <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400, marginLeft: 6 }}>{new Date().getFullYear() - new Date(m.birth_date).getFullYear()}歳</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>Hdcp {m.handicap} · {FREQ_LABELS[m.round_freq] ?? m.round_freq}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.blood_type && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>血液型 {m.blood_type}型 {bloodCompat ?? ''}</span>}
                        {otherZodiac && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>{otherZodiac} {zodiacCompat ?? ''}</span>}
                        {(m.preferred_days?.includes('sat') || m.preferred_days?.includes('sun')) && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)' }}>週末希望</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* お気に入りボタン */}
                        <button onClick={(e) => toggleFavorite(m.user_id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: isFav ? '#e05070' : 'var(--pale)', padding: '2px 4px', lineHeight: 1 }}>
                          {isFav ? '❤️' : '♡'}
                        </button>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: 'var(--g2)', lineHeight: 1 }}>{Math.round(m.match_score)}<span style={{ fontSize: 11 }}>%</span></div>
                          <div style={{ fontSize: 8, color: 'var(--mute)' }}>マッチ度</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!canCreateChat(userPlan)) {
                            alert('チャットの新規作成はスタンダードプラン以上が必要です\nプランのアップグレードはマイページから')
                            return
                          }
                          handleChat(m.user_id)
                        }}
                        disabled={chatLoading === m.user_id}
                        style={{ background: canCreateChat(userPlan) ? 'var(--g1)' : 'var(--mute)', color: 'var(--lime)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: chatLoading === m.user_id ? 0.6 : 1 }}>
                        {chatLoading === m.user_id ? '...' : canCreateChat(userPlan) ? '💬 チャット' : '💬 🔒'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'lesson' && (
        <>
          <div style={{ background: 'white', padding: '8px 16px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['プロ個人', 'スクール', 'オンライン', '初心者向け'].map((f) => (
                <button key={f} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--line)', color: 'var(--mid)', background: 'var(--surf)', cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            <div style={{ height: 8 }} />
            {LESSONS.map((l) => (
              <div key={l.id} style={{ margin: '0 16px 10px', background: 'white', borderRadius: 12, border: '1px solid var(--line)', padding: 14, display: 'flex', gap: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,61,43,.05)' }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: l.textColor, flexShrink: 0 }}>{l.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{l.desc}</div>
                  <div style={{ fontSize: 11, color: '#A8E063', marginTop: 3 }}>{'★'.repeat(Math.floor(l.rating))} <span style={{ color: 'var(--mute)', fontSize: 10 }}>{l.rating}（{l.reviews}件）</span></div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 7, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: 'var(--g2)' }}>¥{l.price.toLocaleString()}/h</span>
                    <span style={{ background: l.badgeColor, color: l.badgeText, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{l.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
