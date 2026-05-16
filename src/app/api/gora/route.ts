import { NextRequest, NextResponse } from 'next/server'

const FILTER_MAP: Record<string, { keywords: string[]; addressMatch: string }> = {
  '広島県': { keywords: ['広島市', '三原', '尾道', '福山', '呉', '廿日市', '東広島', '竹原', '安芸', '府中'], addressMatch: '広島県' },
  '山口県': { keywords: ['山口', '下関', '宇部', '周南', '岩国'], addressMatch: '山口県' },
  '岡山県': { keywords: ['岡山', '倉敷', '津山', '玉野'], addressMatch: '岡山県' },
  '島根県': { keywords: ['島根', '松江', '出雲', '浜田'], addressMatch: '島根県' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const isTabFilter = Object.keys(FILTER_MAP).includes(keyword)
  const filter = FILTER_MAP[keyword]

  const fetchByKeyword = async (kw: string, page: number) => {
    const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(kw)}&hits=30&page=${page}`
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.golflink-hiroshima.com',
        'Origin': 'https://www.golflink-hiroshima.com',
      }
    })
    return res.json()
  }

  try {
    let allItems: any[] = []

    if (isTabFilter) {
      // 複数キーワードで検索して合算
      for (const kw of filter.keywords) {
        const data = await fetchByKeyword(kw, 1)
        if (data.Items) allItems = [...allItems, ...data.Items]
      }
      // 住所で広島県に絞り込み・重複除去
      allItems = allItems.filter((item: any) => {
        const addr = item.Item?.address ?? ''
        return addr.includes(filter.addressMatch)
      })
      // IDで重複除去
      const seen = new Set()
      allItems = allItems.filter((item: any) => {
        const id = item.Item?.golfCourseId
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    } else {
      // フリーワード検索
      const data = await fetchByKeyword(keyword, 1)
      if (data.Items) {
        allItems = data.Items.filter((item: any) => {
          const addr = item.Item?.address ?? ''
          return !addr.includes('北海道')
        })
      }
    }

    return NextResponse.json({ Items: allItems, count: allItems.length })
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
