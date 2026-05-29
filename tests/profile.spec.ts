import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests, MOCK_PROFILE } from './helpers/mock'

test.describe('/profile プロフィールページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/profile')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでプロフィールタブが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await expect(page.locator('button', { hasText: '👤 プロフィール' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=設定・メニュー')).toBeVisible()
  })

  test('プロフィールタブにユーザー名が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await expect(page.locator(`text=${MOCK_PROFILE.nickname}`)).toBeVisible({ timeout: 10_000 })
  })

  test('プロフィール編集ボタンがある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await expect(
      page.locator('button', { hasText: 'プロフィールを編集' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('設定タブにメニュー項目がある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await page.locator('button', { hasText: '設定・メニュー' }).click()

    await expect(page.locator('text=サブスクリプション管理')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=法的情報')).toBeVisible()
    await page.locator('text=法的情報').click()
    await expect(page.locator('text=利用規約')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('text=特定商取引法に基づく表記')).toBeVisible()
  })

  test('設定タブにログアウトボタンがある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await page.locator('button', { hasText: '設定・メニュー' }).click()
    await expect(page.locator('text=ログアウト')).toBeVisible({ timeout: 5_000 })
  })

  test('設定タブにサブスクリプション管理メニューが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/profile')

    await page.locator('button', { hasText: '設定・メニュー' }).click()
    await expect(
      page.locator('text=サブスクリプション管理')
    ).toBeVisible({ timeout: 5_000 })
  })
})
