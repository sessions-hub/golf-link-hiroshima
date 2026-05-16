import { NextRequest, NextResponse } from 'next/server'

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

  const fetchPage = async (p: number) => {
    const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(keyword)}&prefectureId=${prefectureId}&hits=30&page=${p}`
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    return res.json()
  }

  try {
    // 1ページ目を取得
    const data = await fetchPage(Number(page))

    if (!data.Items) return NextResponse.json(data)

    // 総件数が30件以上なら2ページ目も取得
    const total = data.count ?? 0
    let allItems = [...data.Items]

    if (total > 30 && Number(page) === 1) {
      const data2 = await fetchPage(2)
      if (data2.Items) allItems = [...allItems, ...data2.Items]
    }

    if (total > 60 && Number(page) === 1) {
      const data3 = await fetchPage(3)
      if (data3.Items) allItems = [...allItems, ...data3.Items]
    }

    // 住所でフィルタリング
    const filtered = allItems.filter((item: any) => {
      const addr = item.Item?.address ?? ''
      if (addr.includes('北海道')) return false
      return addr.includes(addressKeyword)
    })

    data.Items = filtered
    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
