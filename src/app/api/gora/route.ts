import { NextRequest, NextResponse } from 'next/server'

// キーワードと住所フィルターのマッピング
const FILTER_MAP: Record<string, { prefectureId: string; addressKeyword: string }> = {
  '広島':   { prefectureId: '34', addressKeyword: '広島' },
  '広島市': { prefectureId: '34', addressKeyword: '広島市' },
  '廿日市': { prefectureId: '34', addressKeyword: '廿日市' },
  '東広島': { prefectureId: '34', addressKeyword: '東広島' },
  '三原':   { prefectureId: '34', addressKeyword: '三原' },
  '福山':   { prefectureId: '34', addressKeyword: '福山' },
  '山口':   { prefectureId: '35', addressKeyword: '山口' },
  '岡山':   { prefectureId: '33', addressKeyword: '岡山' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島'
  const page = searchParams.get('page') ?? '1'

  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const filter = FILTER_MAP[keyword]
  const prefectureId = filter?.prefectureId ?? '34'
  const addressKeyword = filter?.addressKeyword ?? keyword

  // hitsを30に増やして全コース取得
  const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(keyword)}&prefectureId=${prefectureId}&hits=30&page=${page}`

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    const data = await res.json()

    // 住所でフィルタリング（北海道の北広島など除外）
    if (data.Items) {
      data.Items = data.Items.filter((item: any) => {
        const addr = item.Item?.address ?? ''
        // 北海道除外
        if (addr.includes('北海道')) return false
        return addr.includes(addressKeyword)
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
