'use client'
import { Avatar } from '@/components/Avatar'
import { unlockedForGender, lockedForGender, defaultCharacterFor, type Gender } from '@/lib/avatars'

export function AvatarPicker({
  nickname, gender, avatarUrl, avatarCharacterId, level, onSelectCharacter, onSelectPhoto, onUpload,
}: {
  nickname: string; gender: Gender; avatarUrl: string | null; avatarCharacterId: string | null; level: number;
  onSelectCharacter: (id: string) => void;
  onSelectPhoto: () => void;
  onUpload: () => void;
}) {
  const selectedKey = avatarCharacterId ?? (avatarUrl ? 'photo' : defaultCharacterFor(gender).id)
  const unlocked = unlockedForGender(gender, level)
  const locked = lockedForGender(gender, level)
  const ring = (sel: boolean): React.CSSProperties => ({
    borderRadius: '50%',
    padding: 0,
    boxShadow: sel ? '0 0 0 2px #fff,0 0 0 4px #c9a227' : 'none',
    display: 'inline-block',
  })
  return (
    <div style={{ padding: '8px 4px' }}>
      <button onClick={onUpload} style={{ width:'100%', border:'1px solid rgba(201,162,39,.4)', background:'transparent', color:'#c9a227', padding:'11px 0', borderRadius:12, marginBottom:18, fontSize:14, fontWeight:600, cursor:'pointer' }}>＋ 写真をアップロード</button>
      <div style={{ fontSize:11, color:'#8a8a82', letterSpacing:'.1em', marginBottom:12 }}>選べるアバター</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px 10px' }}>
        {avatarUrl && (
          <button onClick={onSelectPhoto} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer' }}>
            <span style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', display:'block', ...ring(selectedKey==='photo') }}>
              <img src={avatarUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </span>
            <span style={{ fontSize:10, color:'#333' }}>写真</span>
          </button>
        )}
        {unlocked.map(c => (
          <button key={c.id} onClick={() => onSelectCharacter(c.id)} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer' }}>
            <span style={ring(selectedKey===c.id)}>
              <Avatar size={72} nickname={nickname} gender={gender} avatarUrl={null} characterId={c.id} />
            </span>
            <span style={{ fontSize:10, color:'#333' }}>{c.name}</span>
          </button>
        ))}
        {locked.map(c => (
          <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:.5 }}>
            <span style={{ position:'relative', width:72, height:72, borderRadius:'50%', overflow:'hidden', filter:'grayscale(.6) brightness(.6)', display:'block' }}>
              <Avatar size={72} nickname="?" gender={c.gender} avatarUrl={null} characterId={c.id} />
              <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔒</span>
            </span>
            <span style={{ fontSize:9, color:'#c9a227' }}>Lv.{c.minLevel} で解放</span>
          </div>
        ))}
      </div>
    </div>
  )
}
