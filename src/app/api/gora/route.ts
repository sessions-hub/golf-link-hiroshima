import { NextRequest, NextResponse } from 'next/server'

const FILTER_MAP: Record<string, { keywords: string[]; addressMatch: string }> = {
  '広島県': { keywords: ['広島', '呉市', '三次市', '庄原市', '郷原', '久井'], addressMatch: '広島' },
  '山口県': { keywords: ['山口', '下関', '宇部', '周南', '岩国', '萩'], addressMatch: '山口' },
  '岡山県': { keywords: ['岡山', '倉敷', '津山', '備前'], addressMatch: '岡山' },
  '島根県': { keywords: ['島根', '松江', '出雲', '浜田', '益田'], addressMatch: '島根' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY

  const isTabFilter = Object.keys(FILTER_MAP).includes(keyword)
  const filter = FILTER_MAP[keyword]

  const fetchByKeyword = async (kw: string) => {
    const url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&affiliateId=${affiliateId}&accessKey=${accessKey}&keyword=${encodeURIComponent(kw)}&hits=30&page=1`
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
      // 複数キーワードで並列検索
      const results = await Promise.all(filter.keywords.map(kw => fetchByKeyword(kw)))
      for (const data of results) {
        if (data.Items) allItems = [...allItems, ...data.Items]
      }

      // 住所フィルター（北海道除外 + 対象県のみ）
      allItems = allItems.filter((item: any) => {
        const addr = item.Item?.address ?? ''
        if (addr.includes('北海道')) return false
        return addr.includes(filter.addressMatch)
      })

      // 重複除去
      const seen = new Set()
      allItems = allItems.filter((item: any) => {
        const id = item.Item?.golfCourseId
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    } else {
      // フリーワード検索
      const data = await fetchByKeyword(keyword)
      if (data.Items) {
        allItems = data.Items.filter((item: any) => {
          return !item.Item?.address?.includes('北海道')
        })
      }
    }

    console.log(`GORA result: keyword=${keyword}, count=${allItems.length}`)
    return NextResponse.json({ Items: allItems, count: allItems.length })
  } catch (error) {
    console.error('Rakuten GORA API error:', error)
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
