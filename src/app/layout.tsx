import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ゴルフリンク広島（Golf Link Hiroshima）| アプリで広島のゴルフ仲間とつながろう',
  description: 'ゴルフリンク広島（Golf Link Hiroshima / GLH）は、広島でゴルフ仲間とつながるコミュニティアプリ。フレンド検索・チャット・ラウンド募集・スコア管理・GPS距離計測まで基本機能は無料。広島のゴルファー同士でつながろう。',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.golflink-hiroshima.com'),
  openGraph: {
    title: 'ゴルフリンク広島（Golf Link Hiroshima）| アプリで広島のゴルフ仲間とつながろう',
    description: 'ゴルフリンク広島（Golf Link Hiroshima / GLH）は、広島でゴルフ仲間とつながるコミュニティアプリ。フレンド検索・チャット・ラウンド募集・スコア管理・GPS距離計測まで基本機能は無料。広島のゴルファー同士でつながろう。',
    url: 'https://www.golflink-hiroshima.com/home',
    siteName: 'Golf Link Hiroshima',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: '/glh-ogp.png', width: 1200, height: 628, alt: 'Golf Link Hiroshima' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ゴルフリンク広島（Golf Link Hiroshima）| アプリで広島のゴルフ仲間とつながろう',
    description: 'ゴルフリンク広島（Golf Link Hiroshima / GLH）は、広島でゴルフ仲間とつながるコミュニティアプリ。フレンド検索・チャット・ラウンド募集・スコア管理・GPS距離計測まで基本機能は無料。広島のゴルファー同士でつながろう。',
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
  keywords: ['ゴルフリンク広島', 'Golf Link Hiroshima', 'GLH', '広島 ゴルフ', '広島 ゴルフ 仲間', 'ゴルフ コミュニティ', 'ゴルフ マッチング', '広島 ラウンド 募集', 'ゴルフ アプリ', 'ゴルフ 仲間 探す'],
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
