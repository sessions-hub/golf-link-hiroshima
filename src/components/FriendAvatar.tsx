'use client'
import { Avatar } from '@/components/Avatar'

interface FriendAvatarProps {
  avatarUrl: string | null
  nickname: string
  isFriend: boolean
  size: number
  gender?: string | null
  borderRadius?: string | number
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
  gender,
  borderRadius = '50%',
  border = 'none',
  fontSize,
  flexShrink,
  onClick,
}: FriendAvatarProps) {
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
      <div style={{ borderRadius, border, overflow: 'hidden', flexShrink: 0, lineHeight: 0 }}>
        <Avatar size={size} nickname={nickname} gender={gender} avatarUrl={avatarUrl} borderRadius={borderRadius} />
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
