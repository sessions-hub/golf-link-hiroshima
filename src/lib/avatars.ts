export type Gender = 'male' | 'female'
export interface AvatarCharacter {
  id: string
  name: string
  src: string
  bg: string
  ink: string
  minLevel: number
  gender?: Gender
}
export const AVATAR_CHARACTERS: AvatarCharacter[] = [
  { id:'bear-black', name:'ブラックベア', src:'/avatars/bear-black.png',
    bg:'radial-gradient(circle at 50% 32%,#f6f2e8,#dcd5c2)', ink:'rgba(150,124,46,.30)', minLevel:0, gender:'male' },
  { id:'bear-cream', name:'クリームベア', src:'/avatars/bear-cream.png',
    bg:'radial-gradient(circle at 50% 32%,#fce4ee,#f6c9da)', ink:'rgba(196,108,140,.30)', minLevel:0, gender:'female' },
]
export function defaultCharacterFor(gender: Gender): AvatarCharacter {
  return AVATAR_CHARACTERS.find(c => c.gender === gender) ?? AVATAR_CHARACTERS[0]
}
export function getCharacter(id?: string | null): AvatarCharacter | null {
  return id ? (AVATAR_CHARACTERS.find(c => c.id === id) ?? null) : null
}
export function unlockedCharacters(level: number) { return AVATAR_CHARACTERS.filter(c => c.minLevel <= level) }
export function lockedCharacters(level: number)   { return AVATAR_CHARACTERS.filter(c => c.minLevel >  level) }
