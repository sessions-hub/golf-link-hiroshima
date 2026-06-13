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
      page.locator('text=まだトークがありません')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=気になるゴルファーにメッセージを送ってみましょう')).toBeVisible()
  })

  test('空の状態にクリームベアのマスコットが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    await expect(
      page.locator('img[src="/avatars/bear-black.png"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('個人タブが表示されている', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/chat')

    await expect(
      page.locator('text=まだトークがありません')
    ).toBeVisible({ timeout: 10_000 })
  })
})
