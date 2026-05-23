import { NextRequest, NextResponse } from 'next/server'
import { COURSES } from '@/lib/courses'

// 広島県の広域キーワード：市名ベースで漏れを防ぐ
const FILTER_MAP: Record<string, { keywords: string[]; addressMatch: string }> = {
  '広島県': {
    // '廿日市'・'三次' はGORA側にヒットなし(404)のため除外
    keywords: [
      '広島', '呉', '福山', '尾道', '三原', '竹原',
      '庄原', '安芸高田', '神石', '世羅',
    ],
    addressMatch: '広島',
  },
  '山口県': { keywords: ['山口', '下関', '宇部', '周南', '岩国', '萩'], addressMatch: '山口' },
  '岡山県': { keywords: ['岡山', '倉敷', '津山', '備前'], addressMatch: '岡山' },
  '島根県': { keywords: ['島根', '松江', '出雲', '浜田', '益田'], addressMatch: '島根' },
}

const ORIGIN = 'https://golflink-hiroshima.com'

// キャッシュ（30分間）
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function buildGoraUrl(
  appId: string, affiliateId: string | undefined, accessKey: string | undefined,
  keyword: string, page: number
) {
  let url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623`
    + `?format=json&applicationId=${appId}&hits=30&page=${page}`
    + `&keyword=${encodeURIComponent(keyword)}`
  if (affiliateId) url += `&affiliateId=${affiliateId}`
  if (accessKey) url += `&accessKey=${accessKey}`
  return url
}

// 429のときは指数バックオフでリトライ
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { 'Referer': ORIGIN, 'Origin': ORIGIN },
      cache: 'no-store',
    })
    if (res.ok) return res.json()
    if (res.status === 429 && attempt < retries) {
      const wait = 1000 * 2 ** attempt // 1s → 2s → 4s
      console.log(`[GORA] 429 rate limit, retry ${attempt + 1}/${retries} after ${wait}ms`)
      await sleep(wait)
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
}

// キーワードの全ページを取得（最大100ページ）
async function fetchAllPages(
  appId: string, affiliateId: string | undefined, accessKey: string | undefined,
  keyword: string, addressMatch?: string
): Promise<any[]> {
  const allItems: any[] = []

  const firstData = await fetchWithRetry(buildGoraUrl(appId, affiliateId, accessKey, keyword, 1))
  const totalCount: number = firstData.count ?? 0
  const pageCount: number = Math.min(firstData.pageCount ?? 1, 100)
  console.log(`[GORA] keyword="${keyword}" total=${totalCount} pages=${pageCount}`)

  if (firstData.Items) allItems.push(...firstData.Items)

  for (let page = 2; page <= pageCount; page++) {
    await sleep(150)
    try {
      const data = await fetchWithRetry(buildGoraUrl(appId, affiliateId, accessKey, keyword, page))
      if (data.Items) allItems.push(...data.Items)
    } catch (e) {
      console.error(`[GORA] page ${page} failed for "${keyword}":`, e)
      break
    }
  }

  if (addressMatch) {
    return allItems.filter((item: any) => {
      const addr = item.Item?.address ?? ''
      return addr.includes(addressMatch) && !addr.includes('北海道')
    })
  }
  return allItems
}

// IDで重複除去
function dedup(items: any[]): any[] {
  const seen = new Set()
  return items.filter((item: any) => {
    const id = item.Item?.golfCourseId
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

// courses.ts との照合ログ
function logMatchRate(goraItems: any[], addressMatch: string) {
  const localCourses = COURSES.filter(c => c.address.includes(addressMatch))
  const goraNames = goraItems.map((item: any) => item.Item?.golfCourseName ?? '')

  const normalize = (s: string) =>
    s.replace(/\s+|　/g, '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    ).replace(/【.*?】/g, '')

  const matched: string[] = []
  const unmatched: string[] = []

  for (const local of localCourses) {
    const localNorm = normalize(local.venueName)
    const hit = goraNames.some(gn => {
      const gnNorm = normalize(gn)
      return gnNorm.includes(localNorm) || localNorm.includes(gnNorm)
    })
    if (hit) matched.push(local.venueName)
    else unmatched.push(local.venueName)
  }

  console.log(`[GORA] courses.ts照合: ${matched.length}/${localCourses.length} マッチ`)
  if (unmatched.length > 0) {
    console.log(`[GORA] 未マッチ(courses.ts側):`, unmatched)
  }
  const goraOnly = goraNames.filter(gn => {
    const gnNorm = normalize(gn)
    return !localCourses.some(lc => {
      const ln = normalize(lc.venueName)
      return gnNorm.includes(ln) || ln.includes(gnNorm)
    })
  })
  if (goraOnly.length > 0) {
    console.log(`[GORA] GORAのみ(courses.tsになし):`, goraOnly)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'

  const cached = cache.get(keyword)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) {
    return NextResponse.json({ error: 'RAKUTEN_APP_ID not set', Items: [] }, { status: 500 })
  }
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  const isTabFilter = Object.keys(FILTER_MAP).includes(keyword)
  const filter = FILTER_MAP[keyword]

  try {
    let allItems: any[] = []

    if (isTabFilter) {
      // 3件並列でキーワードを取得してマージ
      const batchSize = 3
      for (let i = 0; i < filter.keywords.length; i += batchSize) {
        const batch = filter.keywords.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(kw =>
            fetchAllPages(appId, affiliateId, accessKey, kw, filter.addressMatch)
              .catch(e => { console.error(`[GORA] キーワード失敗 kw="${kw}":`, e); return [] as any[] })
          )
        )
        allItems.push(...results.flat())
        if (i + batchSize < filter.keywords.length) await sleep(200)
      }
      allItems = dedup(allItems)
      console.log(`[GORA] キーワード検索マージ後: ${allItems.length}件`)

      if (keyword === '広島県') {
        logMatchRate(allItems, filter.addressMatch)
      }
    } else {
      allItems = await fetchAllPages(appId, affiliateId, accessKey, keyword)
      allItems = dedup(allItems.filter((item: any) => !item.Item?.address?.includes('北海道')))
    }

    const result = { Items: allItems, count: allItems.length }

    if (allItems.length > 0) {
      cache.set(keyword, { data: result, timestamp: Date.now() })
    }

    console.log(`[GORA] 最終結果: keyword=${keyword} count=${allItems.length}`)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('[GORA] API error:', error)
    if (cached) return NextResponse.json(cached.data)
    return NextResponse.json({ error: 'API error', Items: [] }, { status: 500 })
  }
}
