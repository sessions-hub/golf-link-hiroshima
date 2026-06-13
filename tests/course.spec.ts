import { test, expect } from '@playwright/test'
import { mockAuthenticatedUser, blockSupabaseRequests } from './helpers/mock'

test.describe('/course コース・コンペページ', () => {
  test('未認証の場合 /login にリダイレクトされる', async ({ page }) => {
    await blockSupabaseRequests(page)
    await page.goto('/course')
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('認証済みでコンペ・ラウンド募集タブと予約タブが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(page.locator('button', { hasText: 'コンペ・ラウンド募集' })).toBeVisible({ timeout: 10_000 })
    // 予約タブのみ（ボトムナビの「募集・予約」と区別するため正規表現で完全一致）
    await expect(page.locator('button', { hasText: /^予約$/ })).toBeVisible()
  })

  test('予約タブにコース検索入力欄がある', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await page.locator('button', { hasText: /^予約$/ }).click()
    await expect(
      page.locator('input[placeholder*="コース名・エリアで検索"]')
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '検索' })).toBeVisible()
  })

  test('予約タブにエリアフィルターが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await page.locator('button', { hasText: /^予約$/ }).click()
    await expect(page.locator('button', { hasText: '広島県' })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: '山口県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '岡山県' })).toBeVisible()
    await expect(page.locator('button', { hasText: '島根県' })).toBeVisible()
  })

  test('コンペ・ラウンド募集タブがデフォルトで表示され空の状態が表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(
      page.locator('text=募集中のコンペはありません')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('コンペタブの空の状態にサブテキストが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'free')
    await page.goto('/course')

    await expect(
      page.locator('text=新しいコンペが募集されるとここに表示されます')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('エグゼクティブプランではコンペ主催ボタンとラウンド募集ボタンが表示される', async ({ page }) => {
    await mockAuthenticatedUser(page, 'executive')
    await page.goto('/course')

    await expect(
      page.locator('button', { hasText: 'コンペを主催' })
    ).toBeVisible({ timeout: 10_000 })
    // 「＋ ラウンド募集」ボタンを完全一致で取得（タブ・フィルターとの混同を防ぐ）
    await expect(
      page.locator('button', { hasText: /^＋ ラウンド募集$/ })
    ).toBeVisible({ timeout: 10_000 })
  })
})
