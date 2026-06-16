export type Gender = 'male' | 'female'

export interface AvatarCharacter {
  id: string
  name: string
  src: string
  minLevel: number
  gender: Gender
}

const GENDER_STYLE: Record<Gender, { bg: string; ink: string }> = {
  male:   { bg: 'radial-gradient(circle at 50% 32%,#f6f2e8,#dcd5c2)', ink: 'rgba(150,124,46,.30)' },
  female: { bg: 'radial-gradient(circle at 50% 32%,#fce4ee,#f6c9da)', ink: 'rgba(196,108,140,.30)' },
}

export function genderKey(g: string | null | undefined): Gender {
  return g === 'female' ? 'female' : 'male'
}

export function styleFor(g: string | null | undefined) {
  return GENDER_STYLE[genderKey(g)]
}

export const AVATAR_CHARACTERS: AvatarCharacter[] = [
  // PUBLIC (Lv1)
  { id: 'black-public',       gender: 'male',   minLevel: 1, name: 'PUBLIC',      src: '/avatars/bear-black.png' },
  { id: 'cream-public',       gender: 'female', minLevel: 1, name: 'PUBLIC',      src: '/avatars/bear-cream.png' },
  // MEMBER (Lv2)
  { id: 'black-member',       gender: 'male',   minLevel: 2, name: 'MEMBER',      src: '/avatars/bear-black-golf.png' },
  { id: 'ivory-member',       gender: 'female', minLevel: 2, name: 'MEMBER',      src: '/avatars/bear-ivory-golf.png' },
  // CLASSIC (Lv3 · 各2種)
  { id: 'black-classic-01',   gender: 'male',   minLevel: 3, name: 'CLASSIC 01',  src: '/avatars/classic-camo-black.png' },
  { id: 'black-classic-02',   gender: 'male',   minLevel: 3, name: 'CLASSIC 02',  src: '/avatars/classic-golf-black.png' },
  { id: 'ivory-classic-01',   gender: 'female', minLevel: 3, name: 'CLASSIC 01',  src: '/avatars/classic-camo-ivory.png' },
  { id: 'ivory-classic-02',   gender: 'female', minLevel: 3, name: 'CLASSIC 02',  src: '/avatars/classic-golf-ivory.png' },
  // CHAMPION (Lv4 · 各2種)
  { id: 'black-champion-01',  gender: 'male',   minLevel: 4, name: 'CHAMPION 01', src: '/avatars/champion-hoodie-black.png' },
  { id: 'black-champion-02',  gender: 'male',   minLevel: 4, name: 'CHAMPION 02', src: '/avatars/champion-pop-black.png' },
  { id: 'ivory-champion-01',  gender: 'female', minLevel: 4, name: 'CHAMPION 01', src: '/avatars/champion-hoodie-ivory.png' },
  { id: 'ivory-champion-02',  gender: 'female', minLevel: 4, name: 'CHAMPION 02', src: '/avatars/champion-pop-ivory.png' },
  // LEGEND (Lv5) — 01: 性別別スイング / 02: ゴールド素体(男女共通)
  { id: 'male-legend-01',   gender: 'male',   minLevel: 5, name: 'LEGEND 01', src: '/avatars/legend-male-01.png' },
  { id: 'female-legend-01', gender: 'female', minLevel: 5, name: 'LEGEND 01', src: '/avatars/legend-female-01.png' },
  { id: 'male-legend-02',   gender: 'male',   minLevel: 5, name: 'LEGEND 02', src: '/avatars/legend-gold.png' },
  { id: 'female-legend-02', gender: 'female', minLevel: 5, name: 'LEGEND 02', src: '/avatars/legend-gold.png' },
]

// 旧IDが DB に保存されている場合のフォールバック
const LEGACY_ID_MAP: Record<string, string> = {
  'bear-black':      'black-public',
  'bear-cream':      'cream-public',
  'bear-black-golf': 'black-member',
  'bear-ivory-golf': 'ivory-member',
  'black-classic':   'black-classic-02',
  'ivory-classic':   'ivory-classic-02',
  'black-legend':    'male-legend-02',
  'ivory-legend':    'female-legend-02',
}

export function charactersForGender(g: string | null | undefined): AvatarCharacter[] {
  return AVATAR_CHARACTERS.filter(c => c.gender === genderKey(g))
}

export function unlockedForGender(g: string | null | undefined, level: number): AvatarCharacter[] {
  return charactersForGender(g).filter(c => c.minLevel <= level)
}

export function lockedForGender(g: string | null | undefined, level: number): AvatarCharacter[] {
  return charactersForGender(g).filter(c => c.minLevel > level)
}

export function defaultCharacterFor(g: string | null | undefined): AvatarCharacter {
  const chars = charactersForGender(g)
  return chars.reduce((a, b) => a.minLevel <= b.minLevel ? a : b, chars[0]) ?? AVATAR_CHARACTERS[0]
}

export function getCharacter(id?: string | null): AvatarCharacter | null {
  if (!id) return null
  const resolvedId = LEGACY_ID_MAP[id] ?? id
  return AVATAR_CHARACTERS.find(c => c.id === resolvedId) ?? null
}
