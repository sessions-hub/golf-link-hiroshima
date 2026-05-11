'use client'

type LogoProps = {
  variant: 'screen' | 'multiply'
  height?: number
}

export default function Logo({ variant, height = 52 }: LogoProps) {
  const src = variant === 'screen' ? '/GL白抜きロゴ.png' : '/グリーン.png'

  return (
    <img
      src={src}
      alt="GLH."
      style={{
        height: height,
        width: 'auto',
        mixBlendMode: variant === 'screen' ? 'screen' : 'multiply',
      }}
    />
  )
}
