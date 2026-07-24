import { test, expect } from '@playwright/test'

test('应用管理流程测试', async ({ page }) => {
  // 监听控制台日志
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`)
  })

  // 用唯一名称避免重复运行时的 strict mode 冲突
  const uniqueSuffix = Math.floor(Math.random() * 100000).toString()
  const appName = `测试应用${uniqueSuffix}`
  const packageName = `com.test.demo${uniqueSuffix}`

  // 1. 登录
  await page.goto('http://localhost:5173/login')
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 })
  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByPlaceholder('请输入密码').fill('password123')
  await page.getByRole('button', { name: '登录' }).click()

  // 等待跳转到 provider 页面
  await page.waitForURL('**/provider/dashboard', { timeout: 10000 })
  console.log('[Test] Logged in, at provider dashboard')

  // 2. 导航到应用管理页面
  await page.goto('http://localhost:5173/provider/apps')
  await page.waitForTimeout(1500)

  // 侧边栏高亮回归：在「应用管理」页，仪表盘不应高亮、应用管理应高亮
  // （修路由前缀误判 bug：原先 /provider 是 /provider/apps 前缀，导致仪表盘一直 active）
  const navDashboard = page.locator('.v-list-item').filter({ hasText: '仪表盘' })
  const navApps = page.locator('.v-list-item').filter({ hasText: '应用管理' })
  await expect(navDashboard).not.toHaveClass(/v-list-item--active/)
  await expect(navApps).toHaveClass(/v-list-item--active/)

  // 验证页面标题已从「应用设计」改为「应用管理」
  await expect(page.locator('h1.text-h4')).toHaveText('应用管理')

  // 3. 点击创建应用按钮
  await page.getByRole('button', { name: '创建应用' }).click()

  // 4. 填写创建应用表单
  await page.waitForSelector('.v-dialog', { timeout: 5000 })
  await page.getByLabel('应用名称').fill(appName)
  await page.getByLabel('包名').fill(packageName)
  await page.getByLabel('描述').fill('Playwright 测试创建的应用')

  // 5. 点击创建按钮
  await page.locator('.v-dialog').getByRole('button', { name: '创建' }).click()
  await page.waitForTimeout(1500)

  // 6. 验证应用已创建（精确匹配，避免与其它应用名部分重合）
  await expect(page.getByText(appName, { exact: true })).toBeVisible({ timeout: 5000 })
  await expect(page.getByText(packageName, { exact: true })).toBeVisible({ timeout: 5000 })

  // 回归防护：有应用后，空状态提示「还没有应用」必须消失
  await expect(page.getByText('还没有应用')).not.toBeVisible({ timeout: 5000 })

  console.log('[Test] Application created successfully!')

  // 7. 验证版本号格式（应该匹配 yy.M.d+Hmm-meta，如 26.7.24+1626-hf7z）
  // 限定到刚创建的那张卡片，避免与其它应用卡片竞争或残留数据干扰
  const createdCard = page.locator('.app-card').filter({ hasText: appName })
  const versionRegex = /\d{1,2}\.\d{1,2}\.\d{1,2}\+\d{1,4}-[a-z0-9]+/
  await expect(createdCard.getByText(versionRegex)).toBeVisible({ timeout: 10000 })

  // 7.5 验证卡片只有「分叉/分发/删除」三个按钮，旧的「复制/更新版本」已移除
  await expect(createdCard.getByRole('button', { name: '分叉' })).toBeVisible()
  await expect(createdCard.getByRole('button', { name: '分发' })).toBeVisible()
  await expect(createdCard.getByRole('button', { name: '删除' })).toBeVisible()
  await expect(createdCard.getByRole('button', { name: '复制' })).toHaveCount(0)
  await expect(createdCard.getByRole('button', { name: '更新版本' })).toHaveCount(0)

  // 8. 进入应用详情页，验证表单/视图 Tab（此时仅一张卡片，点击无歧义）
  await createdCard.click()
  await page.waitForURL('**/provider/apps/*', { timeout: 10000 })
  // 先等应用头部名称出现，确认详情页数据已加载
  await expect(page.getByRole('heading', { name: appName }).or(page.locator('.text-h5').filter({ hasText: appName }))).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('tab', { name: /表单/ })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('tab', { name: /视图/ })).toBeVisible({ timeout: 10000 })

  // 9. 返回应用管理列表，测试「分叉」：应产生同包名新版本（版本第 5 段 meta 变化）
  await page.goto('http://localhost:5173/provider/apps')
  await page.waitForTimeout(1500)

  // 分叉前记录当前版本号
  const cardBeforeFork = page.locator('.app-card').filter({ hasText: appName }).first()
  const versionBefore = await cardBeforeFork.getByText(versionRegex).first().innerText()

  // 点击分叉
  await cardBeforeFork.getByRole('button', { name: '分叉' }).click()
  await page.waitForTimeout(1500)

  // 分叉后：同包名分组应显示「2 个版本」，且出现两个版本号不同的卡片
  // 限定到「本测试 packageName 所在的分组表头」，避免与历史遗留的其它 2 版本分组冲突（strict mode）
  const myHeader = page.locator('.d-flex.align-center.mb-2').filter({ hasText: packageName })
  await expect(myHeader.locator('.v-chip', { hasText: '个版本' })).toHaveText('2 个版本', { timeout: 10000 })
  const versionCards = page.locator('.app-card').filter({ hasText: appName })
  await expect(versionCards).toHaveCount(2, { timeout: 10000 })

  // 新版本号应与旧版本号不同（meta 段变化）
  const allVersions = (await page.locator('.app-card').filter({ hasText: appName }).getByText(versionRegex).allInnerTexts()).map(s => s.trim())
  console.log(`[Test] Versions after fork: ${allVersions.join(', ')} (before: ${versionBefore.trim()})`)
  const distinctVersions = new Set(allVersions.map(v => v.trim()))
  expect(distinctVersions.size).toBe(2)

  console.log('✅ 应用管理流程测试成功喵！')
})
