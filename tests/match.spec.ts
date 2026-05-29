import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/match マッチングページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/match')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでゴルファータブが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/match')

    await expect(page.locator('text=ゴルファーを探す')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=気になる')).toBeVisible()
  })

  test('フィルターチップが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/match')

    await expect(page.locator('button', { hasText: '全員' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '男性' })).toBeVisible()
    await expect(page.locator('button', { hasText: '女性' })).toBeVisible()
    await expect(page.locator('button', { hasText: '相性診断' })).toBeVisible()
  })

  test('「全員」フィルターが初期選択状態になっている', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/match')

    // ゴルファーがいない場合は空状態メッセージが表示される
    await expect(
      page.locator('text=まだゴルファーがいません')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('気になるタブに切り替えるとエグゼクティブ誘導バナーが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/match')

    await page.locator('button', { hasText: '気になる' }).click()

    // フリープランではエグゼクティブ誘導バナーが表示される
    await expect(page.locator('text=気になるを見るには')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=エグゼクティブにアップグレード')).toBeVisible()
  })

  test('お気に入りフィルターでお気に入りがない場合のメッセージが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/match')

    await page.locator('button', { hasText: 'お気に入り' }).click()
    await expect(
      page.locator('text=お気に入りがまだいません')
    ).toBeVisible({ timeout: 5_000 })
  })
})
