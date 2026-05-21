import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/gps GPS計測ページ', () => {
  test('未認証の場合はアップグレード案内が表示される', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/gps')
    await expect(
      page.locator('text=GPS計測はスタンダードプラン以上')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('フリープランではアップグレード案内が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/gps')

    await expect(
      page.locator('text=GPS計測はスタンダードプラン以上')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: 'プランをアップグレード' })).toBeVisible()
  })

  test('スタンダードプランではコース検索画面が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/gps')

    await expect(
      page.locator('input[placeholder*="コース名・エリアで検索"]')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('スタンダードプランでは GPS 状態インジケーターがある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/gps')

    // GPS取得中 or GPS未取得 のいずれかが表示される
    const gpsStatus = page.locator('text=/GPS/')
    await expect(gpsStatus.first()).toBeVisible({ timeout: 10_000 })
  })

  test('スタンダードプランではエリアフィルターボタンが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/gps')

    await expect(page.locator('button', { hasText: '広島県' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '山口県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '岡山県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '島根県' })).toBeVisible()
  })
})
