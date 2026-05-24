'use client'

interface FriendAvatarProps {
  avatarUrl: string | null
  nickname: string
  isFriend: boolean
  size: number
  borderRadius?: string | number
  bg?: string
  textColor?: string
  border?: string
  fontSize?: number
  flexShrink?: number
  onClick?: () => void
}

export function FriendAvatar({
  avatarUrl,
  nickname,
  isFriend,
  size,
  borderRadius = '50%',
  bg = 'var(--surf)',
  textColor = 'var(--g1)',
  border = 'none',
  fontSize,
  flexShrink,
  onClick,
}: FriendAvatarProps) {
  const fs = fontSize ?? Math.round(size * 0.36)
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius,
        background: bg,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fs,
        fontWeight: 700,
        color: textColor,
        overflow: 'hidden',
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : nickname?.[0] ?? '?'
        }
      </div>
      {isFriend && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--g2)',
          border: '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )}
    </div>
  )
}
