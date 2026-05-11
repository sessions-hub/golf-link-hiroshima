'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = ['基本情報', 'ゴルフ情報', 'エリア設定']
const HDCP_OPTIONS = [
  { label: '初心者', value: '36+' },
  { label: '初級', value: '25〜35' },
  { label: '中級', value: '13〜24' },
  { label: '上級', value: '〜12' },
]
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const AREAS = ['広島市内', '廿日市・宮島', '東広島', '福山', '山口・周南']
const PURPOSES = ['ラウンド仲間', 'コンペ仲間', '練習仲間', 'コーチ希望']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [hdcp, setHdcp] = useState('13〜24')
  const [days, setDays] = useState<string[]>(['土', '日'])
  const [areas, setAreas] = useState<string[]>(['広島市内'])
  const [purposes, setPurposes] = useState<string[]>(['ラウンド仲間'])

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', display: 'flex', flexDirection: 'column' }}>

      {/* グリーンヘッダー */}
      <div style={{ background: 'var(--g1)', padding: '52px 22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 700, color: 'var(--lime)', letterSpacing: '-0.02em' }}>GLH.</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(168,224,99,.6)', fontFamily: 'Inter', letterSpacing: '.1em' }}>STEP {step + 1} / 3</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{STEPS[step]}</div>
        </div>
      </div>

      {/* プログレスバー */}
      <div style={{ padding: '10px 20px 12px', background: 'var(--off)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--g2)' : 'var(--line)' }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--mute)' }}>ステップ {step + 1} / 3 — {STEPS[step]}</div>
      </div>

      {/* Step 1: 基本情報 */}
      {step === 0 && (
        <div style={{ flex: 1, padding: '4px 22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)', marginBottom: 16 }}>アカウント作成</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['姓', '名'].map((label) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)' }}>{label === '姓' ? '田中' : '太郎'}</div>
              </div>
            ))}
          </div>

          {[
            { label: 'メールアドレス', placeholder: 'メールアドレスを入力' },
            { label: 'パスワード', placeholder: '8文字以上' },
            { label: '生年月日', placeholder: '1985 / 01 / 15' },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
              <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--mute)', marginBottom: 14 }}>{f.placeholder}</div>
            </div>
          ))}

          <button onClick={() => setStep(1)} style={{ width: '100%', background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
            次へ →
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--mute)', marginTop: 14 }}>
            すでにアカウントをお持ちの方は
            <span onClick={() => router.push('/login')} style={{ color: 'var(--g2)', fontWeight: 600, cursor: 'pointer' }}>　ログイン</span>
          </div>
        </div>
      )}

      {/* Step 2: ゴルフ情報 */}
      {step === 1 && (
        <div style={{ flex: 1, padding: '4px 22px 24px', display: 'flex', flexDirection: 'column' }}>
          {/* アバター */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--lime)' }}>田</div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>タップして写真を変更</div>
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ニックネーム</div>
          <div style={{ background: 'white', border: '1.5px solid var(--g3)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', marginBottom: 14, boxShadow: '0 0 0 3px rgba(46,125,85,.08)' }}>タロウ</div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>ハンデキャップ</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {HDCP_OPTIONS.map((h) => (
              <button key={h.value} onClick={() => setHdcp(h.value)} style={{
                flex: 1, background: hdcp === h.value ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                border: `1px solid ${hdcp === h.value ? 'var(--g3)' : 'var(--line)'}`,
                borderRadius: 10, padding: '9px 4px', textAlign: 'center', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 10, color: hdcp === h.value ? 'var(--g2)' : 'var(--mute)' }}>{h.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: hdcp === h.value ? 'var(--g2)' : 'var(--txt)', marginTop: 2 }}>{h.value}</div>
              </button>
            ))}
          </div>

          {[
            { label: 'ラウンド頻度', value: '月2〜3回' },
            { label: 'ベストスコア（任意）', value: '92' },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
              <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', marginBottom: 14 }}>{f.value}</div>
            </div>
          ))}

          <button onClick={() => setStep(2)} style={{ width: '100%', background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
            次へ →
          </button>
        </div>
      )}

      {/* Step 3: エリア設定 */}
      {step === 2 && (
        <div style={{ flex: 1, padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>活動エリアと希望</div>
          <div style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 18 }}>マッチング精度を上げるために設定してください</div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>居住エリア</div>
          <div style={{ background: 'white', border: '1.5px solid var(--g3)', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: 'var(--txt)', marginBottom: 14, boxShadow: '0 0 0 3px rgba(46,125,85,.08)' }}>広島市 南区</div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>よく行くエリア</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {AREAS.map((a) => (
              <button key={a} onClick={() => toggleItem(a, areas, setAreas)} style={{
                padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                border: `1px solid ${areas.includes(a) ? 'var(--g3)' : 'var(--line)'}`,
                color: areas.includes(a) ? 'var(--g2)' : 'var(--mid)',
                background: areas.includes(a) ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                fontWeight: areas.includes(a) ? 600 : 400,
              }}>{a}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>希望曜日</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => toggleItem(d, days, setDays)} style={{
                padding: '3px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                border: `1px solid ${days.includes(d) ? 'var(--g3)' : 'var(--line)'}`,
                color: days.includes(d) ? 'var(--g2)' : 'var(--mid)',
                background: days.includes(d) ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                fontWeight: days.includes(d) ? 600 : 400,
              }}>{d}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>マッチングの目的</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 20 }}>
            {PURPOSES.map((p) => (
              <button key={p} onClick={() => toggleItem(p, purposes, setPurposes)} style={{
                padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                border: `1px solid ${purposes.includes(p) ? 'var(--g3)' : 'var(--line)'}`,
                color: purposes.includes(p) ? 'var(--g2)' : 'var(--mid)',
                background: purposes.includes(p) ? 'rgba(46,125,85,.1)' : 'var(--surf)',
                fontWeight: purposes.includes(p) ? 600 : 400,
              }}>{p}</button>
            ))}
          </div>

          <button onClick={() => router.push('/home')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--g1)', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            登録を完了する 🎉
          </button>
        </div>
      )}
    </div>
  )
}
