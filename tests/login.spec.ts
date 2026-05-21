import { test, expect } from '@playwright/test'

test.describe('ログインページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('GLH. ブランドとタイトルが表示される', async ({ page }) => {
    await expect(page.getByText('GOLF LINK', { exact: true })).toBeVisible()
    await expect(page.getByText('HIROSHIMA', { exact: true })).toBeVisible()
    // ログインの見出し (h1 相当の要素)
    await expect(page.locator('text=ログイン').first()).toBeVisible()
  })

  test('メールアドレスとパスワードの入力欄がある', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('ログインボタンと Google ログインボタンがある', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'ログイン' }).first()).toBeVisible()
    await expect(page.locator('text=Googleでログイン')).toBeVisible()
  })

  test('新規登録リンクがある', async ({ page }) => {
    await expect(page.locator('text=新規登録')).toBeVisible()
  })

  test('パスワードを忘れた方へのリンクがある', async ({ page }) => {
    await expect(page.locator('text=パスワードを忘れた方はこちら')).toBeVisible()
  })
})
