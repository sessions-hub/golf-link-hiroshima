import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Golf Link Hiroshima｜広島のゴルファーをつなぐコミュニティアプリ',
  description: '地元のゴルファーが集まり、繋がり、盛り上がる！星座や血液型など独自アルゴリズムで相性診断もある【ゴルファー検索】をはじめ、【ゴルフ場予約】【コンペ・ラウンド募集】【メッセージ】【SNS】【スコア記録】【GPS距離計測】などほぼ無料で利用可能！',
  manifest: '/manifest.json',
  metadataBase: new URL('https://golflink-hiroshima.com'),
  openGraph: {
    title: 'Golf Link Hiroshima｜広島のゴルファーをつなぐコミュニティアプリ',
    description: '地元のゴルファーが集まり、繋がり、盛り上がる！星座や血液型など独自アルゴリズムで相性診断もある【ゴルファー検索】をはじめ、【ゴルフ場予約】【コンペ・ラウンド募集】【メッセージ】【SNS】【スコア記録】【GPS距離計測】などほぼ無料で利用可能！',
    url: 'https://golflink-hiroshima.com',
    siteName: 'Golf Link Hiroshima',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: '/glh-ogp.png', width: 1200, height: 628, alt: 'Golf Link Hiroshima' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Golf Link Hiroshima｜広島のゴルファーをつなぐコミュニティアプリ',
    description: '地元のゴルファーが集まり、繋がり、盛り上がる！星座や血液型など独自アルゴリズムで相性診断もある【ゴルファー検索】をはじめ、【ゴルフ場予約】【コンペ・ラウンド募集】【メッセージ】【SNS】【スコア記録】【GPS距離計測】などほぼ無料で利用可能！',
    images: ['/glh-ogp.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GLH.',
  },
  icons: {
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    icon: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
  },
  keywords: ['ゴルフ', '広島', 'マッチング', 'ゴルファー', 'ラウンド', 'Golf Link Hiroshima', 'GLH'],
}

export const viewport: Viewport = {
  themeColor: '#0D3D2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Noto+Sans+JP:wght@300;400;500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-H13EV2CLXB" />
        <script dangerouslySetInnerHTML={{ __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-H13EV2CLXB');
`}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
