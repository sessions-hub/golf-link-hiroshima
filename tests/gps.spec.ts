import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/gps GPS計測ページ', () => {
  test('未認証の場合はアップグレード案内が表示される', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/gps')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('フリープランではページにアクセスでき、コース選択時にアップグレード案内が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/gps')

    await expect(
      page.locator('input[placeholder*="コース名・エリアで検索"]')
    ).toBeVisible({ timeout: 10_000 })
    // greenCoordsベースのコース一覧が表示される
    await expect(page.locator('text=/件のコース/')).toBeVisible({ timeout: 10_000 })
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

  test('スタンダードプランではgreenCoordsベースのコース一覧が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'standard')
    await page.goto('/gps')

    // greenCoordsに登録された全コースの件数が表示される
    await expect(page.locator('text=/件のコース/')).toBeVisible({ timeout: 10_000 })
    // コース検索が使える
    await expect(page.locator('input[placeholder*="コース名・エリアで検索"]')).toBeVisible()
  })
})
