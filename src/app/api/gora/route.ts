import { NextRequest, NextResponse } from 'next/server'

const FILTER_MAP: Record<string, { keyword: string; addressMatch: string; excludes: string[] }> = {
  '広島県': { keyword: '広島', addressMatch: '広島', excludes: ['北海道'] },
  '山口県': { keyword: '山口', addressMatch: '山口', excludes: ['北海道'] },
  '岡山県': { keyword: '岡山', addressMatch: '岡山', excludes: ['北海道'] },
  '島根県': { keyword: '島根', addressMatch: '島根', excludes: ['北海道'] },
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
    // 全ページ並列取得
    const data1 = await fetchPage(1)
    if (!data1.Items) return NextResponse.json(data1)

    const total = data1.count ?? 0
    console.log(`GORA API: keyword=${searchKeyword}, total=${total}, page1items=${data1.Items?.length}`)
    let allItems = [...data1.Items]

    // 並列で残りページ取得
    const pagePromises = []
    if (total > 30) pagePromises.push(fetchPage(2))
    if (total > 60) pagePromises.push(fetchPage(3))
    if (total > 90) pagePromises.push(fetchPage(4))
    if (total > 120) pagePromises.push(fetchPage(5))

    const results = await Promise.all(pagePromises)
    for (const r of results) {
      if (r.Items) allItems = [...allItems, ...r.Items]
    }

    // フィルタリング
    allItems = allItems.filter((item: any) => {
      const addr = item.Item?.address ?? ''
      // 除外ワードをチェック
      if (isTabFilter) {
        for (const ex of filter.excludes) {
          if (addr.includes(ex)) return false
        }
        return addr.includes(filter.addressMatch)
      }
      return !addr.includes('北海道')
    })

    // 重複除去
    const seen = new Set()
    allItems = allItems.filter((item: any) => {
      const id = item.Item?.golfCourseId
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    return NextResponse.json({ Items: allItems, count: allItems.length })
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
