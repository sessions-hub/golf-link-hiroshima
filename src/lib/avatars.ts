export type Gender = 'male' | 'female'

export interface AvatarCharacter {
  id: string
  name: string
  src: string
  bg: string
  ink: string
  minLevel: number
  gender: Gender
}

export const AVATAR_CHARACTERS: AvatarCharacter[] = [
  { id: 'bear-black', name: 'クラシック（ブラック）', src: '/avatars/bear-black.png',
    gender: 'male', minLevel: 1,
    bg: 'radial-gradient(circle at 50% 32%,#fcfbf7,#ece7d8)', ink: 'rgba(150,124,46,.26)' },
  { id: 'bear-cream', name: 'クラシック（アイボリー）', src: '/avatars/bear-cream.png',
    gender: 'female', minLevel: 1,
    bg: 'radial-gradient(circle at 50% 32%,#fdf1f6,#f8dbe7)', ink: 'rgba(196,120,150,.26)' },
  { id: 'bear-black-golf', name: 'ゴルファー（ブラック）', src: '/avatars/bear-black-golf.png',
    gender: 'male', minLevel: 2,
    bg: 'radial-gradient(circle at 50% 32%,#f4eed7,#d9c79a)', ink: 'rgba(150,118,36,.36)' },
  { id: 'bear-ivory-golf', name: 'ゴルファー（アイボリー）', src: '/avatars/bear-ivory-golf.png',
    gender: 'female', minLevel: 2,
    bg: 'radial-gradient(circle at 50% 32%,#fbd2e0,#f0a6c0)', ink: 'rgba(190,76,118,.36)' },
  // 今後の解放キャラ用雛形（Lv3=セージ/モーヴ、Lv4=ユーカリ/ラベンダー、Lv5=シャンパンゴールド共通）
  // { id:'bear-black-lv3', gender:'male', minLevel:3, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 32%,#e2ecdc,#b8cfa6)', ink:'rgba(82,114,66,.36)' },
  // { id:'bear-cream-lv3', gender:'female', minLevel:3, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 32%,#efd5ef,#d2a4d8)', ink:'rgba(150,86,165,.36)' },
  // { id:'bear-black-lv4', gender:'male', minLevel:4, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 32%,#dde9e6,#b2c8c0)', ink:'rgba(56,102,92,.36)' },
  // { id:'bear-cream-lv4', gender:'female', minLevel:4, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 32%,#ece6f6,#d3c9ec)', ink:'rgba(118,104,170,.36)' },
  // { id:'bear-black-lv5', gender:'male', minLevel:5, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 30%,#fbf1cf,#e4cd83)', ink:'rgba(140,108,30,.42)' },
  // { id:'bear-cream-lv5', gender:'female', minLevel:5, name:'…', src:'/avatars/….png',
  //   bg:'radial-gradient(circle at 50% 30%,#fbf1cf,#e4cd83)', ink:'rgba(140,108,30,.42)' },
]

export function genderKey(g: string | null | undefined): Gender {
  return g === 'female' ? 'female' : 'male'
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
  return id ? (AVATAR_CHARACTERS.find(c => c.id === id) ?? null) : null
}
