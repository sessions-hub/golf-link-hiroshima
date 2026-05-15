'use client'

interface LogoProps {
  height?: number
  variant?: 'screen' | 'white'
}

export default function Logo({ height = 64, variant = 'screen' }: LogoProps) {
  const isWhite = variant === 'white'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <img
        src={isWhite ? '/GL白抜きロゴ.png' : '/グリーン.png'}
        alt="GLH."
        style={{
          height: height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      <div style={{
        borderLeft: `1px solid ${isWhite ? 'rgba(255,255,255,.25)' : '#dde8dd'}`,
        paddingLeft: 12,
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        gap: 4,
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: isWhite ? 'rgba(255,255,255,.8)' : '#111814',
          letterSpacing: '.2em',
          textTransform: 'uppercase' as const,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1,
        }}>GOLF LINK</div>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: isWhite ? 'rgba(255,255,255,.8)' : '#111814',
          letterSpacing: '.2em',
          textTransform: 'uppercase' as const,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1,
        }}>HIROSHIMA</div>
      </div>
    </div>
  )
}
