import { test, expect } from '@playwright/test'
import { bootstrapAuthedSession } from './helpers/webauthn'

// 在全新浏览器上下文（无缓存）中，用 WebAuthn 虚拟认证器以 provider
// 身份登录，验证组织详情页可正常访问（403 回归）。
test('服务商访问组织设置页 - 全新上下文无缓存（WebAuthn 全真登录）', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('response', response => {
    if (response.status() === 403) {
      console.log(`[Test] 403错误: ${response.url()}`)
    }
  })

  const auth = await bootstrapAuthedSession(page)

  await page.goto('/provider/orgs')
  await page.waitForTimeout(2000)

  const orgRows = page.locator('tbody tr')
  const orgCount = await orgRows.count()
  console.log(`[Test] 找到 ${orgCount} 个组织`)
  expect(orgCount).toBeGreaterThan(0)

  // 导航到组织详情页
  await page.goto('/provider/orgs/1')
  await page.waitForTimeout(2000)

  const detailUrl = page.url()
  console.log(`[Test] 组织详情页面URL: ${detailUrl}`)
  expect(detailUrl).toContain('/provider/orgs/1')

  const hasForbiddenText = await page.getByText('403').isVisible().catch(() => false) ||
                           await page.getByText('禁止访问').isVisible().catch(() => false) ||
                           await page.getByText('forbidden').isVisible().catch(() => false)
  expect(hasForbiddenText).toBe(false)

  await auth.remove()
  await context.close()
  console.log('[Test] ✅ 组织详情页面访问正常喵！')
})
