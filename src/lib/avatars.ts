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
  { id: 'bear-black',      gender: 'male',   minLevel: 1, name: 'PUBLIC', src: '/avatars/bear-black.png' },
  { id: 'bear-cream',      gender: 'female', minLevel: 1, name: 'PUBLIC', src: '/avatars/bear-cream.png' },
  { id: 'bear-black-golf', gender: 'male',   minLevel: 2, name: 'MEMBER', src: '/avatars/bear-black-golf.png' },
  { id: 'bear-ivory-golf', gender: 'female', minLevel: 2, name: 'MEMBER', src: '/avatars/bear-ivory-golf.png' },
  // 今後の解放キャラ（Lv3 CLASSIC / Lv4 CHAMPION / Lv5 LEGEND）
  // 同レベル複数の場合は 'MEMBER 01', 'MEMBER 02' のように連番
]

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
  return id ? (AVATAR_CHARACTERS.find(c => c.id === id) ?? null) : null
}
