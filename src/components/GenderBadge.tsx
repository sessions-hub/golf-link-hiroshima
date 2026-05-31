type Props = {
  gender: string | null | undefined
  size?: number
}

export default function GenderBadge({ gender, size = 14 }: Props) {
  if (!gender) return null
  const bg = gender === 'male' ? '#3b82f6' : gender === 'female' ? '#ec4899' : '#9ca3af'
  const r = Math.round(size * 0.214)
  const s = Math.round(size * 0.571)
  return (
    <span style={{ width: size, height: size, borderRadius: r, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {gender === 'male' && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><line x1="14.5" y1="9.5" x2="21" y2="3"/><polyline points="16,3 21,3 21,8"/></svg>}
      {gender === 'female' && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="19" x2="15" y2="19"/></svg>}
      {gender === 'other' && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>}
    </span>
  )
}
