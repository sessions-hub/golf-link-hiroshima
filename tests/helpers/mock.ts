import { Page, BrowserContext } from '@playwright/test'

export const SUPABASE_URL = 'https://lewtmveztwjouppewdeo.supabase.co'

// @supabase/ssr が document.cookie に書き込む際のキー名
const AUTH_COOKIE_NAME = 'sb-lewtmveztwjouppewdeo-auth-token'

export const MOCK_USER_ID = 'test-user-00000000'

export const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const MOCK_PROFILE = {
  user_id: MOCK_USER_ID,
  nickname: 'テスター',
  handicap: 20,
  best_score: 90,
  avatar_url: null,
  plan: 'free',
  areas: ['広島/廿日市エリア'],
  area_id: null,
  birth_date: '1990-06-15',
  blood_type: 'A',
  bio: 'テスト用プロフィール',
  gender: 'male',
  created_at: '2024-01-01T00:00:00.000Z',
  preferred_days: ['sat', 'sun'],
  round_freq: 'monthly',
}

const MOCK_SESSION = {
  access_token: 'fake.jwt.token',
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  expires_at: 9_999_999_999,
  token_type: 'bearer',
  user: MOCK_USER,
}

// JSON を base64url エンコードして @supabase/ssr 形式のクッキー値を生成
function buildSessionCookieValue(session: object): string {
  const json = JSON.stringify(session)
  const b64 = Buffer.from(json).toString('base64url')
  return `base64-${b64}`
}

// ブラウザコンテキストに認証セッションのクッキーを注入する
async function injectAuthCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: buildSessionCookieValue(MOCK_SESSION),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

// 認証済みユーザーとして全 Supabase API をモックする
export async function mockAuthenticatedUser(
  page: Page,
  plan: 'free' | 'premium' | 'executive' = 'free'
) {
  await injectAuthCookie(page.context())

  // 認証エンドポイント (getUser が JWT 検証のために呼ぶ)
  await page.route(`${SUPABASE_URL}/auth/v1/user`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    })
  })

  // 全 REST API 一括モック
  await page.route(`${SUPABASE_URL}/rest/v1/**`, route => {
    const url = route.request().url()
    const accept = route.request().headers()['accept'] ?? ''
    const isSingle = accept.includes('pgrst.object')
    const method = route.request().method()

    // 書き込みリクエスト (INSERT/UPDATE/DELETE) は成功を返す
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      return route.fulfill({
        status: method === 'POST' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? {} : []),
      })
    }

    // profiles テーブル
    if (url.includes('/profiles')) {
      const profileForPlan = { ...MOCK_PROFILE, plan }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? profileForPlan : [profileForPlan]),
      })
    }

    // subscriptions テーブル (プラン判定)
    if (url.includes('/subscriptions')) {
      if (plan !== 'free') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user_id: MOCK_USER_ID, plan }),
        })
      }
      return route.fulfill({
        status: 406,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        }),
      })
    }

    // その他テーブル: 空配列 or Not Found
    if (isSingle) {
      return route.fulfill({
        status: 406,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // 楽天 GORA API (Next.js API Route)
  await page.route('**/api/gora**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ Items: [] }),
    })
  })
}

// 未認証状態: Supabase への接続を全てブロックする
export async function blockSupabaseRequests(page: Page) {
  await page.route(`${SUPABASE_URL}/**`, route => route.abort())
}
