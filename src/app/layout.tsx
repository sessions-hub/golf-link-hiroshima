import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Golf Link Hiroshima | Connecting Golfers',
  description: '広島のゴルファーをつなぐコミュニティアプリ。血液型・星座相性でマッチング。ラウンド仲間を見つけよう。',
  manifest: '/manifest.json',
  metadataBase: new URL('https://golflink-hiroshima.com'),
  openGraph: {
    title: 'Golf Link Hiroshima | Connecting Golfers',
    description: '広島のゴルファーをつなぐコミュニティアプリ。血液型・星座相性でマッチング。',
    url: 'https://golflink-hiroshima.com',
    siteName: 'Golf Link Hiroshima',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Golf Link Hiroshima | Connecting Golfers',
    description: '広島のゴルファーをつなぐコミュニティアプリ。血液型・星座相性でマッチング。',
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
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
