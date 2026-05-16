import { NextRequest, NextResponse } from 'next/server'

const PREFECTURE_CODES: Record<string, string> = {
  '広島県': '34',
  '廿日市市': '34',
  '東広島市': '34',
  '福山市': '34',
  '山口県': '35',
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
        if (keyword === '山口県') return addr.includes('山口県')
        if (keyword === '廿日市市') return addr.includes('廿日市')
        if (keyword === '東広島市') return addr.includes('東広島')
        if (keyword === '福山市') return addr.includes('福山')
        if (keyword === '広島県') return addr.includes('広島県')
        // フリーワード検索の場合
        return addr.includes('広島県') || addr.includes('山口県')
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
