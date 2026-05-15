import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島'
  const page = searchParams.get('page') ?? '1'

  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID

  const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&keyword=${encodeURIComponent(keyword)}&hits=10&page=${page}&sort=recommendRank`

  try {
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
