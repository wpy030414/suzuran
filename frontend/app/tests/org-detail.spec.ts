import { test, expect } from '@playwright/test'
import { bootstrapAuthedSession } from './helpers/webauthn'

// OAuth-only 平台：密码登录已移除。本测试用 WebAuthn 虚拟认证器以
// provider 身份登录，验证组织详情页（部门树 + 成员管理）渲染。
// 原密码登录闭环（Part B）随密码登录一并移除。
test('组织详情页：部门树 + 成员管理（WebAuthn 全真登录）', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`))
  page.on('dialog', d => d.accept())

  // provider 登录
  const auth = await bootstrapAuthedSession(page)

  // 进入「演示租户」(org 2) 详情页
  await page.goto('/provider/orgs/2')
  await expect(page.locator('.text-h5').filter({ hasText: '演示租户' })).toBeVisible({ timeout: 10000 })

  // 部门 Tab（默认）：树形结构渲染（根部门存在即可，seed 数据含「根部门」）
  await expect(page.getByText('根部门', { exact: true })).toBeVisible({ timeout: 10000 })

  // 切到「成员」Tab，验证成员列表渲染
  await page.locator('.v-tab').filter({ hasText: '成员' }).click()
  // seed 数据中 org 2 绑定了「租户管理员」，列表应非空
  const memberRows = page.locator('tbody tr')
  await expect(memberRows.first()).toBeVisible({ timeout: 10000 })

  await auth.remove()
  console.log('✅ 组织详情页 部门树 + 成员管理 测试成功喵！')
})
