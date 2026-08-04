import { test, expect } from '@playwright/test'
import { bootstrapAuthedSession } from './helpers/webauthn'

// OAuth-only 平台：密码登录已移除。用 WebAuthn 虚拟认证器以 provider
// 身份登录，验证服务商能访问组织管理设置页面（不被 403）。
test('服务商访问组织管理设置页面（WebAuthn 全真登录）', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`))
  page.on('response', response => {
    if (response.status() === 403) {
      console.log(`[Test] 403错误: ${response.url()}`)
    }
  })

  const auth = await bootstrapAuthedSession(page)

  // 导航到组织管理页面
  await page.goto('/provider/orgs')
  await page.waitForTimeout(2000)

  // 查看组织列表（seed 数据含演示服务商、演示租户）
  const orgRows = page.locator('tbody tr')
  const orgCount = await orgRows.count()
  console.log(`[Test] 找到 ${orgCount} 个组织`)
  expect(orgCount).toBeGreaterThan(0)

  // 直接导航到组织详情页面（超级管理员 org_id=1）
  await page.goto('/provider/orgs/1')
  await page.waitForTimeout(2000)

  // 检查当前 URL 没有被重定向到 forbidden/login
  const orgDetailUrl = page.url()
  console.log(`[Test] 组织详情页面URL: ${orgDetailUrl}`)
  expect(orgDetailUrl).toContain('/provider/orgs/1')

  // 检查是否有 403 或禁止访问文本
  const hasForbiddenText = await page.getByText('403').isVisible().catch(() => false) ||
                           await page.getByText('禁止访问').isVisible().catch(() => false) ||
                           await page.getByText('forbidden').isVisible().catch(() => false)
  expect(hasForbiddenText).toBe(false)

  await auth.remove()
  console.log('[Test] ✅ 组织管理设置页面访问正常喵！')
})
