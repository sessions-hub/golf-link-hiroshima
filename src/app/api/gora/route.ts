import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島'
  const page = searchParams.get('page') ?? '1'

  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(keyword)}&hits=10&page=${page}`

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
