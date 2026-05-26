import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/level レベルガイドページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/level')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでレベルガイドが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    await expect(page.locator('text=レベルガイド')).toBeVisible({ timeout: 10_000 })
  })

  test('現在のレベルカードが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    await expect(page.locator('text=本日 +').first()).toBeVisible({ timeout: 10_000 })
  })

  test('全レベル一覧が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    await expect(page.locator('text=全レベル')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=PUBLIC').first()).toBeVisible()
    await expect(page.locator('text=MEMBER').first()).toBeVisible()
    await expect(page.locator('text=CLASSIC').first()).toBeVisible()
    await expect(page.locator('text=CHAMPION').first()).toBeVisible()
    await expect(page.locator('text=LEGEND').first()).toBeVisible()
  })

  test('ポイント獲得方法一覧が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    await expect(page.locator('text=ポイント獲得方法')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=毎日ログイン')).toBeVisible()
    await expect(page.locator('text=投稿する')).toBeVisible()
    await expect(page.locator('text=スコアを記録する')).toBeVisible()
    await expect(page.locator('text=コンペを主催する')).toBeVisible()
  })

  test('戻るボタンが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    await expect(page.locator('text=レベルガイド').first()).toBeVisible({ timeout: 10_000 })
    const backBtn = page.locator('button').first()
    await expect(backBtn).toBeVisible()
  })

  test('ボトムナビゲーションが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/level')

    const nav = page.locator('nav, [style*="position: fixed"][style*="bottom"]')
    await expect(nav.first()).toBeVisible({ timeout: 10_000 })
  })
})
