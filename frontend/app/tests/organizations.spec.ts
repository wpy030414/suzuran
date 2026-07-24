import { test, expect } from '@playwright/test'

test('组织管理 CRUD 测试', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`))
  // 自动接受删除确认框（window.confirm）
  page.on('dialog', d => d.accept())

  const uniqueSuffix = Math.floor(Math.random() * 100000).toString()
  const orgName = `auto测试组织${uniqueSuffix}`
  const orgDesc = `自动化测试描述${uniqueSuffix}`
  const editedDesc = `已编辑描述${uniqueSuffix}`

  // 1. 登录
  await page.goto('http://localhost:5173/login')
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 })
  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByPlaceholder('请输入密码').fill('password123')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL('**/provider/dashboard', { timeout: 10000 })

  // 2. 导航到组织管理
  await page.goto('http://localhost:5173/provider/orgs')
  await page.waitForTimeout(1200)
  await expect(page.locator('h1.text-h4')).toHaveText('组织管理')

  // 侧边栏高亮：组织管理应 active、仪表盘不应 active（路由前缀误判回归）
  const navOrgs = page.locator('.v-list-item').filter({ hasText: '组织管理' })
  const navDashboard = page.locator('.v-list-item').filter({ hasText: '仪表盘' })
  await expect(navOrgs).toHaveClass(/v-list-item--active/)
  await expect(navDashboard).not.toHaveClass(/v-list-item--active/)

  // 3. 当前所属组织（演示服务商）的删除按钮应禁用，且有「当前」标识
  const currentRow = page.locator('tr').filter({ hasText: '演示服务商' })
  await expect(currentRow).toBeVisible()
  await expect(currentRow.locator('.v-chip', { hasText: '当前' })).toBeVisible()
  await expect(currentRow.getByRole('button', { name: '删除' })).toBeDisabled()

  // 4. 创建组织
  await page.getByRole('button', { name: '创建组织' }).click()
  await page.waitForSelector('.v-dialog', { timeout: 5000 })
  await page.getByLabel('组织名称').fill(orgName)
  await page.getByLabel('描述').fill(orgDesc)
  await page.locator('.v-dialog').getByRole('button', { name: '创建' }).click()
  await page.waitForTimeout(1200)

  // 验证创建成功
  const createdRow = page.locator('tr').filter({ hasText: orgName })
  await expect(createdRow).toBeVisible({ timeout: 5000 })
  await expect(createdRow).toContainText(orgDesc)

  // 5. 编辑组织（改描述）
  await createdRow.getByRole('button', { name: '编辑' }).click()
  await page.waitForSelector('.v-dialog', { timeout: 5000 })
  await page.getByLabel('描述').fill(editedDesc)
  await page.locator('.v-dialog').getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(1200)

  // 验证描述已更新
  await expect(page.locator('tr').filter({ hasText: orgName })).toContainText(editedDesc)

  // 6. 删除组织
  await page.locator('tr').filter({ hasText: orgName }).getByRole('button', { name: '删除' }).click()
  await page.waitForTimeout(1200)
  await expect(page.locator('tr').filter({ hasText: orgName })).toHaveCount(0)

  console.log('✅ 组织管理 CRUD 测试成功喵！')
})
