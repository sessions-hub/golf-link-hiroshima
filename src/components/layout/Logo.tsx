'use client'

interface LogoProps {
  height?: number
  variant?: 'screen' | 'white'
}

export default function Logo({ height = 36, variant = 'screen' }: LogoProps) {
  const isWhite = variant === 'white'
  return (
    <img
      src={isWhite ? '/GL白抜きロゴ.png' : '/グリーン.png'}
      alt="Golf Link Hiroshima"
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  )
}
