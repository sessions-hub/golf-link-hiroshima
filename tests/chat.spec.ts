import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/chat チャットページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/chat')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでチャットリストページが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    // ヘッダーにロゴテキストが表示される
    await expect(page.getByText('GOLF LINK', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('チャットがない場合は空の状態メッセージが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    await expect(
      page.locator('text=チャットがまだありません')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=フレンドと')).toBeVisible()
  })

  test('空の状態からマッチングページへのボタンがある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    const button = page.locator('button', { hasText: 'マッチングを探す' })
    await expect(button).toBeVisible({ timeout: 10_000 })
  })

  test('マッチングを探すボタンで /match に遷移する', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    const button = page.locator('button', { hasText: 'マッチングを探す' })
    await button.waitFor({ timeout: 10_000 })
    await button.click()
    await page.waitForURL('**/match', { timeout: 5_000 })
    await expect(page).toHaveURL(/\/match/)
  })
})
