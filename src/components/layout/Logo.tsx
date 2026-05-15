'use client'

interface LogoProps {
  height?: number
  variant?: 'screen' | 'white'
}

export default function Logo({ height = 40, variant = 'screen' }: LogoProps) {
  const isWhite = variant === 'white'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* ロゴ画像 */}
      <img
        src={isWhite ? '/GL白抜きロゴ.png' : '/グリーン.png'}
        alt="GLH."
        style={{
          height: height,
          width: 'auto',
          objectFit: 'contain',
        }}
      />
      {/* サブテキスト */}
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
        GOLF LINK<br/>HIROSHIMA
      </div>
    </div>
  )
}
