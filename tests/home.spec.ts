import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/home ホームページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/home')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでホームタブのコンテンツが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/home')

    // ページ上部のタブが表示される
    await expect(page.getByRole('button', { name: 'タイムライン' })).toBeVisible({ timeout: 10_000 })
  })

  test('ホームタブにマッチングカードが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/home')

    // マッチングカード
    await expect(page.locator('text=フレンドを探す')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=マッチングを見る')).toBeVisible()
  })

  test('ホームタブにスコアと GPS カードが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/home')

    await expect(page.locator('text=スコア記録')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=GPS計測')).toBeVisible()
  })

  test('タイムラインタブに切り替えると検索バーが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/home')

    // タイムラインタブをクリック
    await page.locator('button', { hasText: 'タイムライン' }).click()
    await expect(
      page.locator('input[placeholder*="投稿・ユーザーを検索"]')
    ).toBeVisible({ timeout: 5_000 })
  })

  test('ボトムナビゲーションが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/home')

    // BottomNav はすべてのページで共通
    const nav = page.locator('nav, [class*="bottom"], [style*="position: fixed"][style*="bottom"]')
    await expect(nav.first()).toBeVisible({ timeout: 10_000 })
  })
})
