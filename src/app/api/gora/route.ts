import { NextRequest, NextResponse } from 'next/server'

const FILTER_MAP: Record<string, { keyword: string; addressMatch: string }> = {
  '広島県': { keyword: '広島', addressMatch: '広島県' },
  '山口県': { keyword: '山口', addressMatch: '山口県' },
  '岡山県': { keyword: '岡山', addressMatch: '岡山県' },
  '島根県': { keyword: '島根', addressMatch: '島根県' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const isTabFilter = Object.keys(FILTER_MAP).includes(keyword)
  const filter = FILTER_MAP[keyword]
  const searchKeyword = isTabFilter ? filter.keyword : keyword

  const fetchPage = async (p: number) => {
    const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(searchKeyword)}&hits=30&page=${p}`
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    return res.json()
  }

  try {
    const data = await fetchPage(1)
    if (!data.Items) return NextResponse.json(data)

    let allItems = [...data.Items]
    const total = data.count ?? 0

    if (total > 30) {
      const data2 = await fetchPage(2)
      if (data2.Items) allItems = [...allItems, ...data2.Items]
    }
    if (total > 60) {
      const data3 = await fetchPage(3)
      if (data3.Items) allItems = [...allItems, ...data3.Items]
    }
    if (total > 90) {
      const data4 = await fetchPage(4)
      if (data4.Items) allItems = [...allItems, ...data4.Items]
    }

    // 住所フィルタリング
    allItems = allItems.filter((item: any) => {
      const addr = item.Item?.address ?? ''
      if (isTabFilter) {
        return addr.includes(filter.addressMatch)
      }
      // フリーワードは北海道除外のみ
      return !addr.includes('北海道')
    })

    data.Items = allItems
    data.count = allItems.length
    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
