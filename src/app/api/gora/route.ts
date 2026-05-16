import { NextRequest, NextResponse } from 'next/server'

const PREFECTURE_CODES: Record<string, string> = {
  '広島': '34',
  '廿日市': '34',
  '東広島': '34',
  '福山': '34',
  '山口': '35',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島'
  const page = searchParams.get('page') ?? '1'
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  const prefectureId = PREFECTURE_CODES[keyword] ?? '34'

  const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(keyword)}&prefectureId=${prefectureId}&hits=30&page=${page}`

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    const data = await res.json()

    // 広島県フィルター
    if (data.Items) {
      data.Items = data.Items.filter((item: any) => {
        const addr = item.Item?.address ?? ''
        if (keyword === '山口') return addr.includes('山口県')
        return addr.includes('広島県')
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
