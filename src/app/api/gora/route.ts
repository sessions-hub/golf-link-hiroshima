import { NextRequest, NextResponse } from 'next/server'

const FILTER_MAP: Record<string, { prefectureId: string }> = {
  '広島県': { prefectureId: '34' },
  '山口県': { prefectureId: '35' },
  '岡山県': { prefectureId: '33' },
  '島根県': { prefectureId: '32' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const isTabFilter = Object.keys(FILTER_MAP).includes(keyword)
  const filter = FILTER_MAP[keyword]

  const fetchPage = async (p: number) => {
    let url = ''
    if (isTabFilter) {
      // 県タブの場合はprefectureIdで検索
      url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&prefectureId=${filter.prefectureId}&hits=30&page=${p}`
    } else {
      // フリーワード検索
      url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(keyword)}&hits=30&page=${p}`
    }
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

    data.Items = allItems
    return NextResponse.json(data)
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
