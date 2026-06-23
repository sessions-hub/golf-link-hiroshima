import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/home', '/lp'],
      disallow: [
        '/register',
        '/auth',
        '/api/',
        '/chat',
        '/profile',
        '/match',
        '/comp',
        '/score',
        '/gps',
        '/user',
        '/notifications',
        '/admin',
        '/join',
        '/level',
        '/course',
        '/subscription',
        '/legal',
      ],
    },
    sitemap: 'https://www.golflink-hiroshima.com/sitemap.xml',
  }
}
