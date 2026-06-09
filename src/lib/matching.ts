// calc_match_score (Supabase) の TypeScript 実装
// 各項目の配点: 血液型25 + 干支20 + 年代20 + 性別10 + エリア15 + ハンデ10 + 頻度5 + 目的10 = max 115 → LEAST(100)

export const MATCH_PURPOSES = ['ラウンド仲間', 'コンペ仲間', 'SNS', 'チャット'] as const

// ⑧ 目的一致スコア (max 10)
export function calcPurposeScore(p1: string[], p2: string[]): number {
  const shared = p1.filter(p => (MATCH_PURPOSES as readonly string[]).includes(p) && p2.includes(p))
  return Math.min(10, shared.length * 5)
}

// ① 血液型相性 (max 25)
const BLOOD_TABLE: Record<string, Record<string, number>> = {
  A:  { A: 12, B:  5, O: 15, AB: 10 },
  B:  { A:  5, B: 12, O: 15, AB: 10 },
  O:  { A: 15, B: 15, O: 10, AB:  8 },
  AB: { A: 10, B: 10, O:  8, AB: 15 },
}

function calcBloodScore(b1: string, b2: string): number {
  const raw = BLOOD_TABLE[b1]?.[b2] ?? 10
  return raw * 25 / 15
}

// ② 干支相性（生年 % 12）(max 20)
function calcZodiacScore(birth1: string, birth2: string): number {
  const z1 = new Date(birth1).getFullYear() % 12
  const z2 = new Date(birth2).getFullYear() % 12
  const diff = Math.abs(z1 - z2)
  if (diff === 4 || diff === 8)  return 20
  if (diff === 1 || diff === 11) return 14
  if (diff === 0)                return 10
  if (diff === 6)                return 3
  return 7
}

// ③ 年代 (max 20)
function calcAgeScore(birth1: string, birth2: string): number {
  const year = new Date().getFullYear()
  const age1 = year - new Date(birth1).getFullYear()
  const age2 = year - new Date(birth2).getFullYear()
  const diff = Math.abs(Math.floor(age1 / 10) - Math.floor(age2 / 10))
  if (diff === 0) return 20
  if (diff === 1) return 12
  if (diff === 2) return 6
  return 2
}

// ④ 性別（異性+10、同性+5）(max 10)
function calcGenderScore(g1?: string | null, g2?: string | null): number {
  if (!g1 || !g2) return 5
  return g1 !== g2 ? 10 : 5
}

// ⑤ エリア (max 15)
function calcAreaScore(areas1?: string[], areas2?: string[]): number {
  if (!areas1?.length || !areas2?.length) return 5
  const overlap = areas1.filter(a => areas2.includes(a)).length
  return overlap > 0 ? 15 : 3
}

// ⑥ ハンデ差 (max 10)
function calcHandicapScore(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2)
  if (diff <= 5)  return 10
  if (diff <= 15) return 6
  if (diff <= 25) return 3
  return 1
}

// ⑦ ラウンド頻度 (max 5)
const FREQ_ORDER = ['weekly_2plus', 'weekly_1', 'monthly_2_3', 'monthly_1', 'rarely']

function calcFreqScore(f1?: string | null, f2?: string | null): number {
  const i1 = f1 ? FREQ_ORDER.indexOf(f1) : 2
  const i2 = f2 ? FREQ_ORDER.indexOf(f2) : 2
  const diff = Math.abs((i1 < 0 ? 2 : i1) - (i2 < 0 ? 2 : i2))
  if (diff === 0) return 5
  if (diff === 1) return 3
  return 1
}

export interface MatchInput {
  birth_date: string
  blood_type: string
  handicap: number
  round_freq?: string | null
  areas?: string[]
  gender?: string | null
  purposes?: string[]
}

export function calcMatchScore(me: MatchInput, other: MatchInput): number {
  const total =
    calcBloodScore(me.blood_type, other.blood_type) +     // max 25
    calcZodiacScore(me.birth_date, other.birth_date) +    // max 20
    calcAgeScore(me.birth_date, other.birth_date) +       // max 20
    calcGenderScore(me.gender, other.gender) +            // max 10
    calcAreaScore(me.areas, other.areas) +                // max 15
    calcHandicapScore(me.handicap, other.handicap) +      // max 10
    calcFreqScore(me.round_freq, other.round_freq) +      // max  5
    calcPurposeScore(me.purposes ?? [], other.purposes ?? []) // max 10

  return Math.min(100, Math.round(total * 10) / 10)
}
