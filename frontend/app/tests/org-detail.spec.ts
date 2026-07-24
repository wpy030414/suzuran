import { test, expect } from '@playwright/test'

// 验证「组织管理升级」端到端：组织详情页（部门树 + 成员）+ 新成员登录 sha256 闭环
// 前置数据（curl 已注入）：org 2「演示租户」下有部门树 研发中心→前端组，成员含「测试新人」(13900001111 / Pass1234)
test('组织详情页：部门树 + 成员管理 + 新成员 sha256 登录闭环', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`))
  page.on('dialog', d => d.accept())

  // ===== Part A: provider 登录 → 进入组织详情页 =====
  await page.goto('http://localhost:5173/login')
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 })
  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByPlaceholder('请输入密码').fill('password123')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL('**/provider/dashboard', { timeout: 10000 })

  // 进入「演示租户」(org 2) 详情页
  await page.goto('http://localhost:5173/provider/orgs/2')
  await expect(page.locator('.text-h5').filter({ hasText: '演示租户' })).toBeVisible({ timeout: 10000 })

  // 部门 Tab（默认）：完整树形 研发中心 → 前端组（DepartmentTreeNode 默认展开）
  await expect(page.getByText('研发中心', { exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('前端组', { exact: true })).toBeVisible({ timeout: 10000 })

  // 切到「成员」Tab，验证成员列表渲染
  await page.locator('.v-tab').filter({ hasText: '成员' }).click()
  await expect(page.getByText('测试新人', { exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('13900001111')).toBeVisible({ timeout: 10000 })

  // ===== Part B: 新成员登录验证 sha256 哈希闭环 =====
  await page.evaluate(() => { localStorage.clear() })
  await page.goto('http://localhost:5173/login')
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 })

  // 错误密码 → 登录被拒，仍留在 /login（证明密码校验生效，非放行）
  await page.getByPlaceholder('请输入手机号').fill('13900001111')
  await page.getByPlaceholder('请输入密码').fill('wrongpwd')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForTimeout(2500)
  await expect(page).toHaveURL(/\/login/)

  // 正确密码 Pass1234 → 登录成功离开 /login（后端 sha256 验证通过 → 进系统页）
  // 显式重填 phone+password，规避 vite HMR 重载把表单重置为默认值的风险
  await page.getByPlaceholder('请输入手机号').fill('13900001111')
  await page.getByPlaceholder('请输入密码').fill('Pass1234')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 })

  console.log('✅ 组织详情页 + 新成员 sha256 登录闭环 测试成功喵！')
})
