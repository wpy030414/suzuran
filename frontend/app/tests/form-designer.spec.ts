import { test, expect } from '@playwright/test'

// 表单设计器：双击组件库添加字段（拖拽在 Playwright 里不稳定，走双击路径）+ 属性编辑 + 保存 + 持久化
test('表单设计器流程测试', async ({ page }) => {
  test.setTimeout(60000)
  page.on('console', msg => console.log(`[Browser] ${msg.text()}`))

  const suffix = Math.floor(Math.random() * 100000).toString()
  const appName = `设计器测试应用${suffix}`
  const packageName = `com.designer.test${suffix}`
  const formCode = `form_${suffix}`

  // 1. 登录
  await page.goto('http://localhost:5173/login')
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 })
  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByPlaceholder('请输入密码').fill('password123')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL('**/provider/dashboard', { timeout: 10000 })

  // 2. 创建应用
  await page.goto('http://localhost:5173/provider/apps')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: '创建应用' }).click()
  await page.waitForSelector('.v-dialog', { timeout: 5000 })
  await page.getByLabel('应用名称').fill(appName)
  await page.getByLabel('包名').fill(packageName)
  await page.locator('.v-dialog').getByRole('button', { name: '创建' }).click()
  await page.waitForTimeout(1500)

  // 3. 进入应用详情
  await page.getByText(appName, { exact: true }).click()
  await page.waitForURL('**/provider/apps/*', { timeout: 10000 })

  // 4. 新建表单 → 自动跳转设计器
  await page.getByRole('button', { name: '新建表单' }).click()
  await page.waitForSelector('.v-dialog', { timeout: 5000 })
  await page.getByLabel('表单名称').fill(`测试表单${suffix}`)
  await page.getByLabel('表单标识 (code)').fill(formCode)
  await page.locator('.v-dialog').getByRole('button', { name: '创建并设计' }).click()
  await page.waitForURL('**/provider/apps/*/forms/*', { timeout: 10000 })
  console.log('[Test] Entered form designer')

  // 5. 双击组件库添加字段（文本 + 多行文本），用 data-type 定位避免依赖 label 文本
  await page.locator('.palette-item[data-type="text"]').dblclick()
  await page.waitForTimeout(500)
  await page.locator('.palette-item[data-type="textarea"]').dblclick()
  await page.waitForTimeout(500)

  // 6. 验证画布有 2 个字段卡片
  await expect(page.locator('.canvas-field-item')).toHaveCount(2, { timeout: 5000 })
  console.log('[Test] Fields added via dblclick')

  // 7. 选中第一个字段，在属性面板改标题
  await page.locator('.canvas-field-item').first().click()
  await page.waitForTimeout(300)
  await page.getByLabel('标题').fill('客户姓名')
  await page.waitForTimeout(300)

  // 8. 保存
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('已保存')).toBeVisible({ timeout: 5000 })
  console.log('[Test] Form saved')

  // 9. 刷新重载，验证字段持久化
  await page.reload()
  await page.waitForURL('**/provider/apps/*/forms/*', { timeout: 10000 })
  await page.waitForTimeout(1200)
  await expect(page.locator('.canvas-field-item')).toHaveCount(2, { timeout: 5000 })
  await expect(page.locator('.canvas-field-item').first()).toContainText('客户姓名')
  console.log('✅ 表单设计器流程测试成功喵！')
})
