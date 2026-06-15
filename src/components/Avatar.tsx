'use client'
import { defaultCharacterFor, getCharacter, styleFor, type Gender } from '@/lib/avatars'

export function Avatar({
  size = 48, nickname = '', gender = 'male', avatarUrl = null, characterId = null,
}: {
  size?: number; nickname?: string; gender?: string | null;
  avatarUrl?: string | null; characterId?: string | null;
}) {
  const safeGender: Gender = gender === 'female' ? 'female' : 'male'
  const chosen = getCharacter(characterId)
  if (!chosen && avatarUrl) {
    return (
      <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flex:'none' }}>
        <img src={avatarUrl} alt={nickname} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      </div>
    )
  }
  const char = chosen ?? defaultCharacterFor(safeGender)
  const { bg, ink } = styleFor(safeGender)
  const initial = ([...nickname][0] ?? '?').toUpperCase()
  return (
    <div style={{ position:'relative', width:size, height:size, borderRadius:'50%',
      overflow:'hidden', background:bg, flex:'none' }}>
      <span style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        fontFamily:'"Noto Sans JP",sans-serif', fontWeight:900, lineHeight:.8,
        fontSize:size*1.25, color:ink, zIndex:1, whiteSpace:'nowrap', userSelect:'none',
        WebkitUserSelect:'none' }}>{initial}</span>
      <img src={char.src} alt="" style={{ position:'absolute', left:'50%', top:'50%',
        transform:'translate(-50%,-50%)', height:'90%', objectFit:'contain', zIndex:2 }} />
    </div>
  )
}
