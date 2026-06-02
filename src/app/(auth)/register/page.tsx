'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const HDCP_OPTIONS = [
  { label: '初心者', value: 36 },
  { label: '初級者', value: 28 },
  { label: '中級者', value: 18 },
  { label: '上級者', value: 8 },
]
const BLOOD_TYPES = ['A', 'B', 'O', 'AB']
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const DAY_VALUES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const AREAS = ['広島/廿日市エリア', '広島北部エリア', '東広島/呉エリア', '竹原/三原/尾道エリア', '福山エリア']
const PURPOSES = ['ラウンド仲間', 'コンペ仲間', '練習仲間', 'コーチ希望']

const GENDER_OPTIONS = [
  { label: '男性', value: 'male', icon: '♂' },
  { label: '女性', value: 'female', icon: '♀' },
  { label: 'その他', value: 'other', icon: '−' },
]

const STEP_LABELS = ['基本情報', 'ゴルフ情報', 'エリア設定']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')

  // Step 2
  const [gender, setGender] = useState('male')
  const [nickname, setNickname] = useState('')
  const [hdcp, setHdcp] = useState(18)
  const [bestScore, setBestScore] = useState('')
  const [bloodType, setBloodType] = useState('A')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // Step 3
  const [days, setDays] = useState<string[]>(['sat', 'sun'])
  const [area, setArea] = useState<string>('')
  const [purposes, setPurposes] = useState<string[]>(['ラウンド仲間'])

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || `${lastName}${firstName}`,
          birth_date: birthDate || '1990-01-01',
          blood_type: bloodType,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      let avatarUrl: string | null = null
      if (avatarFile) {
        const fileName = `${data.user.id}/avatar`
        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(fileName, avatarFile, { contentType: avatarFile.type, upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }
      await supabase.from('profiles').update({
        nickname: nickname || `${lastName}${firstName}`,
        birth_date: birthDate || '1990-01-01',
        blood_type: bloodType,
        handicap: hdcp,
        best_score: bestScore ? parseInt(bestScore) : null,
        preferred_days: days,
        gender,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }).eq('user_id', data.user.id)
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー（loginと同デザイン＋右上ステップドット） */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '22px', paddingRight: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/グリーン.png" alt="GLH." style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block' }} />
          <div style={{ borderLeft: '1px solid #111814', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111814', letterSpacing: '.2em', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>GOLF LINK</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111814', letterSpacing: '.2em', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>HIROSHIMA</div>
          </div>
        </div>
        {/* ステップドット */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i <= step ? 'var(--g2)' : 'var(--line)', transition: 'background .2s' }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'Inter', letterSpacing: '.05em' }}>
            STEP {step + 1} / 3 &nbsp;{STEP_LABELS[step]}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ margin: '10px 22px 0', background: 'rgba(200,60,60,.1)', border: '1px solid rgba(200,60,60,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c05050' }}>
          {error}
        </div>
      )}

      {/* Step 1: 基本情報 */}
      {step === 0 && (
        <div style={{ flex: 1, padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>アカウント作成</div>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 16, background: 'var(--surf)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--line)' }}>
            ※ 氏名・メールアドレス・生年月日は外部に公開されません
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['姓', lastName, setLastName], ['名', firstName, setFirstName]].map(([label, val, setter]) => (
              <div key={label as string} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label as string}</div>
                <input value={val as string} onChange={e => (setter as any)(e.target.value)} placeholder={label as string} style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none' }} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>メールアドレス</div>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="メールアドレス" style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14 }} />

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>パスワード</div>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="8文字以上" style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14 }} />

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>生年月日</div>
          <input value={birthDate} onChange={e => setBirthDate(e.target.value)} type="date" style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14 }} />

          <button onClick={() => setStep(1)} style={{ width: '100%', background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>次へ →</button>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--mute)', marginTop: 14 }}>
            すでにアカウントをお持ちの方は<span onClick={() => router.push('/login')} style={{ color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>　ログイン</span>
          </div>
        </div>
      )}

      {/* Step 2: ゴルフ情報 */}
      {step === 1 && (
        <div style={{ flex: 1, padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* アバター */}
          <div onClick={() => avatarRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18, cursor: 'pointer' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--lime)', overflow: 'hidden', border: avatarPreview ? '2px solid var(--g3)' : 'none' }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (nickname?.[0] || '?')
              }
            </div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>タップして写真を登録（任意）</div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ニックネーム</div>
          <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="ニックネーム" style={{ width: '100%', background: 'white', border: '1.5px solid var(--g3)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14, boxShadow: '0 0 0 3px rgba(46,125,85,.08)' }} />

          {/* 性別（step 1から移動） */}
          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>性別</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {GENDER_OPTIONS.map((g) => (
              <button key={g.value} onClick={() => setGender(g.value)} style={{ flex: 1, background: gender === g.value ? 'rgba(46,125,85,.1)' : 'var(--surf)', border: `1.5px solid ${gender === g.value ? 'var(--g3)' : 'var(--line)'}`, borderRadius: 10, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 18, marginBottom: 3, color: gender === g.value ? 'var(--g2)' : 'var(--mute)' }}>{g.icon}</div>
                <div style={{ fontSize: 11, fontWeight: gender === g.value ? 700 : 400, color: gender === g.value ? 'var(--g2)' : 'var(--mute)' }}>{g.label}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>血液型</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {BLOOD_TYPES.map((bt) => (
              <button key={bt} onClick={() => setBloodType(bt)} style={{ flex: 1, background: bloodType === bt ? 'rgba(46,125,85,.1)' : 'var(--surf)', border: `1.5px solid ${bloodType === bt ? 'var(--g3)' : 'var(--line)'}`, borderRadius: 10, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: bloodType === bt ? 'var(--g2)' : 'var(--txt)' }}>{bt}</div>
                <div style={{ fontSize: 9, color: bloodType === bt ? 'var(--g3)' : 'var(--mute)', marginTop: 2 }}>型</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ハンデキャップ</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {HDCP_OPTIONS.map((h) => (
              <button key={h.value} onClick={() => setHdcp(h.value)} style={{ flex: 1, background: hdcp === h.value ? 'rgba(46,125,85,.1)' : 'var(--surf)', border: `1px solid ${hdcp === h.value ? 'var(--g3)' : 'var(--line)'}`, borderRadius: 10, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: hdcp === h.value ? 700 : 400, color: hdcp === h.value ? 'var(--g2)' : 'var(--mute)' }}>{h.label}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ベストスコア（任意）</div>
          <input value={bestScore} onChange={e => setBestScore(e.target.value)} type="number" placeholder="例: 92" style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14 }} />

          <button onClick={() => setStep(2)} style={{ width: '100%', background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>次へ →</button>
        </div>
      )}

      {/* Step 3: エリア設定 */}
      {step === 2 && (
        <div style={{ flex: 1, padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>活動エリアと希望</div>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 18 }}>マッチング精度を上げるために設定してください</div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>主な活動エリア（1つ選択）</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(a)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: `1px solid ${area === a ? 'var(--g3)' : 'var(--line)'}`, color: area === a ? 'var(--g2)' : 'var(--mid)', background: area === a ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: area === a ? 600 : 400 }}>{a}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>希望曜日</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleItem(DAY_VALUES[i], days, setDays)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: `1px solid ${days.includes(DAY_VALUES[i]) ? 'var(--g3)' : 'var(--line)'}`, color: days.includes(DAY_VALUES[i]) ? 'var(--g2)' : 'var(--mid)', background: days.includes(DAY_VALUES[i]) ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: days.includes(DAY_VALUES[i]) ? 600 : 400 }}>{d}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>マッチングの目的</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 20 }}>
            {PURPOSES.map((p) => (
              <button key={p} onClick={() => toggleItem(p, purposes, setPurposes)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: `1px solid ${purposes.includes(p) ? 'var(--g3)' : 'var(--line)'}`, color: purposes.includes(p) ? 'var(--g2)' : 'var(--mid)', background: purposes.includes(p) ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: purposes.includes(p) ? 600 : 400 }}>{p}</button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center', marginBottom: 10, lineHeight: 1.7 }}>
            登録することで
            <a href="/legal/terms" style={{ color: 'var(--mute)', textDecoration: 'underline' }}>利用規約</a>・
            <a href="/legal/privacy" style={{ color: 'var(--mute)', textDecoration: 'underline' }}>プライバシーポリシー</a>
            に同意したものとみなします
          </p>
          <button onClick={handleRegister} disabled={loading} style={{ width: '100%', background: loading ? 'var(--mute)' : 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '登録中...' : '登録を完了する 🎉'}
          </button>
        </div>
      )}
    </div>
  )
}
