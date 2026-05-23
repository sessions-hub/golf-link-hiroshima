import { NextRequest, NextResponse } from 'next/server'
import { COURSES } from '@/lib/courses'

const FILTER_MAP: Record<string, { keywords: string[]; addressMatch: string }> = {
  '広島県': { keywords: ['広島', '呉市', '三次市', '庄原市', '郷原', '久井'], addressMatch: '広島' },
  '山口県': { keywords: ['山口', '下関', '宇部', '周南', '岩国', '萩'], addressMatch: '山口' },
  '岡山県': { keywords: ['岡山', '倉敷', '津山', '備前'], addressMatch: '岡山' },
  '島根県': { keywords: ['島根', '松江', '出雲', '浜田', '益田'], addressMatch: '島根' },
}

// キャッシュ（5分間）
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function buildGoraUrl(appId: string, affiliateId: string | undefined, accessKey: string | undefined, keyword: string, page: number) {
  let url = `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?format=json&applicationId=${appId}&hits=30&page=${page}&keyword=${encodeURIComponent(keyword)}`
  if (affiliateId) url += `&affiliateId=${affiliateId}`
  if (accessKey) url += `&accessKey=${accessKey}`
  return url
}

async function fetchPage(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'Referer': 'https://www.golflink-hiroshima.com',
      'Origin': 'https://www.golflink-hiroshima.com',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 全ページを取得する（最大100ページ）
async function fetchAllPages(
  appId: string, affiliateId: string | undefined, accessKey: string | undefined,
  keyword: string, addressMatch?: string
): Promise<any[]> {
  const allItems: any[] = []

  // 1ページ目を取得してtotalページ数を確認
  const firstData = await fetchPage(buildGoraUrl(appId, affiliateId, accessKey, keyword, 1))
  const totalCount: number = firstData.count ?? 0
  const pageCount: number = Math.min(firstData.pageCount ?? 1, 100)

  console.log(`[GORA] keyword="${keyword}" total=${totalCount} pages=${pageCount}`)

  if (firstData.Items) allItems.push(...firstData.Items)

  // 残りのページを順次取得
  for (let page = 2; page <= pageCount; page++) {
    await sleep(300)
    try {
      const data = await fetchPage(buildGoraUrl(appId, affiliateId, accessKey, keyword, page))
      if (data.Items) allItems.push(...data.Items)
    } catch (e) {
      console.error(`[GORA] page ${page} failed for "${keyword}":`, e)
      break
    }
  }

  // 住所フィルター（指定がある場合）
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

// courses.ts との照合（広島県のみ）
function logMatchRate(goraItems: any[], addressMatch: string) {
  const localCourses = COURSES.filter(c => c.address.includes(addressMatch))
  const goraNames = goraItems.map((item: any) => item.Item?.golfCourseName ?? '')

  const matched: string[] = []
  const unmatched: string[] = []

  for (const local of localCourses) {
    // コース名の部分一致で照合（空白・全角半角の揺れを考慮）
    const normalize = (s: string) => s.replace(/\s+/g, '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    )
    const localNorm = normalize(local.venueName)
    const hit = goraNames.some(gn => {
      const gnNorm = normalize(gn)
      return gnNorm.includes(localNorm) || localNorm.includes(gnNorm)
    })
    if (hit) matched.push(local.venueName)
    else unmatched.push(local.venueName)
  }

  console.log(`[GORA] courses.ts照合: ${matched.length}/${localCourses.length} マッチ`)
  if (unmatched.length > 0) console.log(`[GORA] 未マッチ(courses.ts側):`, unmatched)

  return { matched: matched.length, total: localCourses.length }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? '広島県'

  // キャッシュチェック
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
      // 方法A: 都道府県キーワードで全ページ取得
      let methodAItems: any[] = []
      try {
        methodAItems = await fetchAllPages(appId, affiliateId, accessKey, keyword, filter.addressMatch)
        console.log(`[GORA] 方法A(都道府県): ${methodAItems.length}件`)
      } catch (e) {
        console.error('[GORA] 方法A失敗:', e)
      }

      // 方法B: 個別キーワードで全ページ取得
      let methodBItems: any[] = []
      for (const kw of filter.keywords) {
        try {
          const items = await fetchAllPages(appId, affiliateId, accessKey, kw, filter.addressMatch)
          methodBItems = [...methodBItems, ...items]
          await sleep(300)
        } catch (e) {
          console.error(`[GORA] 方法B失敗 keyword=${kw}:`, e)
        }
      }
      methodBItems = dedup(methodBItems)
      console.log(`[GORA] 方法B(複数KW): ${methodBItems.length}件`)

      // 多い方を採用し、両方をマージして重複除去
      const merged = dedup([...methodAItems, ...methodBItems])
      allItems = merged
      console.log(`[GORA] マージ後: ${allItems.length}件 (A:${methodAItems.length} B:${methodBItems.length})`)

      // courses.ts との照合ログ（広島県のみ）
      if (keyword === '広島県') {
        logMatchRate(allItems, filter.addressMatch)
      }
    } else {
      // 通常キーワード検索（全ページ取得）
      allItems = await fetchAllPages(appId, affiliateId, accessKey, keyword)
      allItems = dedup(allItems.filter((item: any) => !item.Item?.address?.includes('北海道')))
    }

    const result = { Items: allItems, count: allItems.length }

    if (allItems.length > 0) {
      cache.set(keyword, { data: result, timestamp: Date.now() })
    }

    console.log(`[GORA] 最終結果: keyword=${keyword} count=${allItems.length}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GORA] API error:', error)
    if (cached) return NextResponse.json(cached.data)
    return NextResponse.json({ error: 'API error', Items: [] }, { status: 500 })
  }
}
