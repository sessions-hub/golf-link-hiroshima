import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/course コース・コンペページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/course')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでゴルフ場予約タブとコンペタブが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(page.locator('button', { hasText: 'ゴルフ場予約' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: /^コンペ$/ })).toBeVisible()
  })

  test('ゴルフ場予約タブにコース検索入力欄がある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(
      page.locator('input[placeholder*="コース名・エリアで検索"]')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '検索' })).toBeVisible()
  })

  test('ゴルフ場予約タブにエリアフィルターが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(page.locator('button', { hasText: '広島県' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '山口県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '岡山県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '島根県' })).toBeVisible()
  })

  test('コンペタブに切り替えると空の状態が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await page.locator('button', { hasText: /^コンペ$/ }).click()
    await expect(
      page.locator('text=コンペがまだありません')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('フリープランのコンペタブにプレミアムへの誘導がある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await page.locator('button', { hasText: /^コンペ$/ }).click()
    await expect(
      page.locator('button', { hasText: 'プレミアムに申し込む' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('エグゼクティブプランではコンペ主催ボタンがヘッダーに表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'executive')
    await page.goto('/course')

    // コンペタブへ移動
    await page.locator('button', { hasText: /^コンペ$/ }).click()
    await expect(
      page.locator('button', { hasText: '主催する' })
    ).toBeVisible({ timeout: 10_000 })
  })
})
