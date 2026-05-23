import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/score スコアページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/score')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('フリープランではアップグレード案内が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/score')

    await expect(
      page.locator('text=スコア記録はスタンダードプラン以上')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: 'プランをアップグレード' })).toBeVisible()
  })

  test('スタンダードプランではスコア入力画面が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/score')

    // スコア入力タブが表示されるまで待機
    await expect(
      page.locator('text=スコア入力')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=履歴・統計')).toBeVisible()
  })

  test('スタンダードプランでは統計バナーが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/score')

    await expect(page.locator('text=MY GOLF STATS')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=BEST')).toBeVisible()
    await expect(page.locator('text=ROUNDS')).toBeVisible()
  })

  test('スタンダードプランではコース名入力欄がある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/score')

    await expect(
      page.locator('input[placeholder*="コース名で検索"]')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('スタンダードプランでは 18 ホール分の入力フィールドがある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/score')

    await expect(page.getByText('HOLE 1', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=HOLE 9')).toBeVisible()
    await expect(page.locator('text=HOLE 18')).toBeVisible()
  })

  test('履歴・統計タブに切り替えると空の状態が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/score')

    await page.locator('text=履歴・統計').waitFor({ timeout: 10_000 })
    await page.locator('text=履歴・統計').click()
    await expect(
      page.locator('text=まだスコアの記録がありません')
    ).toBeVisible({ timeout: 5_000 })
  })
})
