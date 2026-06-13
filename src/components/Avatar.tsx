'use client'
import { defaultCharacterFor, getCharacter, type Gender } from '@/lib/avatars'

export function Avatar({
  size = 48, nickname = '', gender = 'male', avatarUrl = null, characterId = null, borderRadius = '50%',
}: {
  size?: number; nickname?: string; gender?: string | null;
  avatarUrl?: string | null; characterId?: string | null; borderRadius?: string | number;
}) {
  const safeGender: Gender = gender === 'female' ? 'female' : 'male'
  if (avatarUrl) {
    return (
      <div style={{ width:size, height:size, borderRadius, overflow:'hidden', flexShrink:0 }}>
        <img src={avatarUrl} alt={nickname} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      </div>
    )
  }
  const char = getCharacter(characterId) ?? defaultCharacterFor(safeGender)
  const initial = ([...nickname][0] ?? '?').toUpperCase()
  return (
    <div style={{ position:'relative', width:size, height:size, borderRadius,
      overflow:'hidden', background:char.bg, flexShrink:0 }}>
      <span style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        fontFamily:'"Noto Sans JP",sans-serif', fontWeight:900, lineHeight:.8,
        fontSize:size*1.25, color:char.ink, zIndex:1, whiteSpace:'nowrap', userSelect:'none',
        WebkitUserSelect:'none' }}>
        {initial}
      </span>
      <img src={char.src} alt="" style={{ position:'absolute', left:'50%', top:'54%',
        transform:'translate(-50%,-50%)', height:'98%', objectFit:'contain', zIndex:2 }} />
    </div>
  )
}
