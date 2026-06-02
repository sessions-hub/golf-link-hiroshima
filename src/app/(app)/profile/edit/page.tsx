'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { PageLoading } from '@/components/LoadingDots'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const HDCP_OPTIONS = [
  { label: '初心者', value: 36 },
  { label: '初級者', value: 28 },
  { label: '中級者', value: 18 },
  { label: '上級者', value: 8 },
]

const FREQ_OPTIONS = [
  { label: '週2回以上', value: 'weekly_2plus' },
  { label: '週1回', value: 'weekly_1' },
  { label: '月2〜3回', value: 'monthly_2_3' },
  { label: '月1回', value: 'monthly_1' },
  { label: 'たまに', value: 'rarely' },
]

const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const DAY_VALUES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export default function ProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [showCropModal, setShowCropModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [handicap, setHandicap] = useState(36)
  const [bestScore, setBestScore] = useState('')
  const [roundFreq, setRoundFreq] = useState('monthly_1')
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [area, setArea] = useState<string>('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setNickname(data.nickname ?? '')
      setAvatarUrl(data.avatar_url ?? null)
        setHandicap(data.handicap ?? 36)
        setBestScore(data.best_score?.toString() ?? '')
        setRoundFreq(data.round_freq ?? 'monthly_1')
        setPreferredDays(data.preferred_days ?? [])
        setArea(data.areas?.[0] ?? '')
        setBio(data.bio ?? '')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const toggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${user.id}/avatar_${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('user-photos')
        .upload(filePath, file, { contentType: file.type, upsert: true })

      if (!error) {
        const { data } = supabase.storage.from('user-photos').getPublicUrl(filePath)
        // キャッシュ回避のためタイムスタンプを付与
        setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
      } else {
        console.error('Upload error:', error)
        alert('アップロードに失敗しました: ' + error.message)
      }
    } catch (e) {
      console.error('Avatar upload error:', e)
    }
    setAvatarUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname,
        handicap,
        best_score: bestScore ? parseInt(bestScore) : null,
        round_freq: roundFreq,
        preferred_days: preferredDays,
        areas: area ? [area] : [],
        bio,
        avatar_url: avatarUrl,
      })
      .eq('user_id', user.id)

    setSaving(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/profile')
      }, 1200)
    }
  }

  if (loading) return <PageLoading />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* ヘッダー */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', paddingTop: 'calc(env(safe-area-inset-top) + 22px)', paddingBottom: '22px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.push('/profile')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surf)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>プロフィール編集</div>
      </div>

      {/* 成功メッセージ */}
      {success && (
        <div style={{ background: 'rgba(168,224,99,.15)', border: '1px solid var(--lime-bd)', margin: '12px 16px 0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--g2)', textAlign: 'center' }}>
          ✓ 保存しました！
        </div>
      )}

      {/* フォーム */}
      <div style={{ flex: 1, padding: '16px 22px 100px' }}>

        {/* アバター */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'var(--lime)', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : nickname?.[0] ?? '?'
            }
            {avatarUploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>...</div>
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--g3)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>タップして写真を変更</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              setCropSrc(reader.result as string)
              setShowCropModal(true)
            }
            reader.readAsDataURL(file)
          }} style={{ display: 'none' }} />

          {/* トリミングモーダル */}
          {showCropModal && cropSrc && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 16, textAlign: 'center' }}>写真をトリミング</div>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt="crop"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                    onLoad={(e) => {
                      const { width, height } = e.currentTarget
                      const c = centerCrop(
                        makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
                        width, height
                      )
                      setCrop(c)
                    }}
                  />
                </ReactCrop>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => { setShowCropModal(false); setCropSrc(null) }} style={{ flex: 1, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--mute)' }}>キャンセル</button>
                  <button onClick={async () => {
                    if (!imgRef.current || !crop) return
                    const canvas = document.createElement('canvas')
                    const size = 300
                    canvas.width = size
                    canvas.height = size
                    const ctx = canvas.getContext('2d')!
                    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                    ctx.drawImage(
                      imgRef.current,
                      (crop.x ?? 0) * scaleX,
                      (crop.y ?? 0) * scaleY,
                      (crop.width ?? 100) * scaleX,
                      (crop.height ?? 100) * scaleY,
                      0, 0, size, size
                    )
                    canvas.toBlob(async (blob) => {
                      if (!blob) return
                      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
                      setShowCropModal(false)
                      setCropSrc(null)
                      await handleAvatarUpload(file)
                    }, 'image/jpeg', 0.9)
                  }} style={{ flex: 1, background: 'var(--g1)', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white' }}>適用する</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ニックネーム */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ニックネーム</div>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          style={{ width: '100%', background: 'white', border: '1.5px solid var(--g3)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14, boxShadow: '0 0 0 3px rgba(46,125,85,.08)' }}
        />

        {/* ハンデキャップ */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ハンデキャップ</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {HDCP_OPTIONS.map((h) => (
            <button key={h.value} onClick={() => setHandicap(h.value)} style={{ flex: 1, background: handicap === h.value ? 'rgba(46,125,85,.1)' : 'var(--surf)', border: `1px solid ${handicap === h.value ? 'var(--g3)' : 'var(--line)'}`, borderRadius: 10, padding: '9px 4px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: handicap === h.value ? 'var(--g2)' : 'var(--txt)' }}>{h.label}</div>
            </button>
          ))}
        </div>

        {/* ベストスコア */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ベストスコア（任意）</div>
        <input
          value={bestScore}
          onChange={e => setBestScore(e.target.value)}
          type="number"
          placeholder="例: 92"
          style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', outline: 'none', marginBottom: 14 }}
        />

        {/* ラウンド頻度 */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ラウンド頻度</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {FREQ_OPTIONS.map((f) => (
            <button key={f.value} onClick={() => setRoundFreq(f.value)} style={{ background: roundFreq === f.value ? 'rgba(46,125,85,.1)' : 'white', border: `1.5px solid ${roundFreq === f.value ? 'var(--g3)' : 'var(--line)'}`, borderRadius: 8, padding: '11px 14px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: roundFreq === f.value ? 'var(--g2)' : 'var(--txt)', fontWeight: roundFreq === f.value ? 600 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* 活動エリア */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>主な活動エリア（1つ選択）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['広島/廿日市エリア', '広島北部エリア', '東広島/呉エリア', '竹原/三原/尾道エリア', '福山エリア'].map((a) => (
            <button key={a} onClick={() => setArea(a)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: `1px solid ${area === a ? 'var(--g3)' : 'var(--line)'}`, color: area === a ? 'var(--g2)' : 'var(--mid)', background: area === a ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: area === a ? 600 : 400 }}>{a}</button>
          ))}
        </div>

        {/* 希望曜日 */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>希望曜日</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {DAYS.map((day, i) => (
            <button key={day} onClick={() => toggleDay(DAY_VALUES[i])} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: `1px solid ${preferredDays.includes(DAY_VALUES[i]) ? 'var(--g3)' : 'var(--line)'}`, color: preferredDays.includes(DAY_VALUES[i]) ? 'var(--g2)' : 'var(--mid)', background: preferredDays.includes(DAY_VALUES[i]) ? 'rgba(46,125,85,.1)' : 'var(--surf)', fontWeight: preferredDays.includes(DAY_VALUES[i]) ? 600 : 400 }}>
              {day}
            </button>
          ))}
        </div>

        {/* 自己紹介 */}
        <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>自己紹介（任意）</div>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="ゴルフ歴や得意なことを教えてください"
          rows={4}
          style={{ width: '100%', background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--txt)', outline: 'none', resize: 'none', marginBottom: 24, fontFamily: 'var(--sans)' }}
        />

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', background: saving ? 'var(--mute)' : 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(168,224,99,.28)' }}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}
