export const MATCH_PURPOSES = ['ラウンド仲間', 'コンペ仲間', 'SNS', 'チャット'] as const

export function calcPurposeScore(p1: string[], p2: string[]): number {
  const shared = p1.filter(p => (MATCH_PURPOSES as readonly string[]).includes(p) && p2.includes(p))
  return Math.min(10, shared.length * 5)
}

export interface MatchInput {
  handicap: number
  preferred_days: string[]
  area_id?: string | null
  areas?: string[]
  birth_date: string
  blood_type: string
  purposes?: string[]
}

function calcHandicapScore(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2)
  if (diff <= 5)  return 25
  if (diff <= 10) return 20
  if (diff <= 20) return 10
  return 5
}

function calcDayScore(days1: string[], days2: string[]): number {
  const shared = days1.filter(d => days2.includes(d)).length
  return Math.min(20, shared * 7)
}

function calcAreaScore(a1: MatchInput, a2: MatchInput): number {
  const areas1 = a1.areas?.length ? a1.areas : (a1.area_id ? [a1.area_id] : [])
  const areas2 = a2.areas?.length ? a2.areas : (a2.area_id ? [a2.area_id] : [])
  return areas1.some(a => areas2.includes(a)) ? 25 : 0
}

function calcAgeScore(birth1: string, birth2: string): number {
  const decade = (b: string) =>
    Math.floor((new Date().getFullYear() - new Date(b).getFullYear()) / 10)
  const diff = Math.abs(decade(birth1) - decade(birth2))
  if (diff === 0) return 10
  if (diff === 1) return 5
  return 0
}

const BLOOD_COMPAT: Record<string, Record<string, number>> = {
  A:  { A: 10, B: 5,  O: 10, AB: 7 },
  B:  { A: 5,  B: 10, O: 10, AB: 7 },
  O:  { A: 10, B: 10, O: 7,  AB: 5 },
  AB: { A: 7,  B: 7,  O: 5,  AB: 10 },
}

function calcBloodScore(b1: string, b2: string): number {
  return BLOOD_COMPAT[b1]?.[b2] ?? 5
}

export function calcMatchScore(me: MatchInput, other: MatchInput): number {
  const total =
    calcPurposeScore(me.purposes ?? [], other.purposes ?? []) +
    calcHandicapScore(me.handicap, other.handicap) +
    calcDayScore(me.preferred_days, other.preferred_days) +
    calcAreaScore(me, other) +
    calcAgeScore(me.birth_date, other.birth_date) +
    calcBloodScore(me.blood_type, other.blood_type)

  return Math.min(100, total)
}
