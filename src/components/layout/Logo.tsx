'use client'

interface LogoProps {
  height?: number
  variant?: 'screen' | 'white'
}

export default function Logo({ variant = 'screen' }: LogoProps) {
  const isWhite = variant === 'white'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 22,
        fontWeight: 800,
        color: isWhite ? 'white' : '#111814',
        letterSpacing: '-.04em',
      }}>
        GLH.
      </div>
      <div style={{
        fontSize: 8,
        fontWeight: 600,
        color: isWhite ? 'rgba(255,255,255,.7)' : '#111814',
        letterSpacing: '.18em',
        textTransform: 'uppercase' as const,
        borderLeft: `1px solid ${isWhite ? 'rgba(255,255,255,.25)' : '#dde8dd'}`,
        paddingLeft: 10,
        lineHeight: 1.4,
      }}>
        GOLF LINK HIROSHIMA
      </div>
    </div>
  )
}
