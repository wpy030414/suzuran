import { test, expect } from '@playwright/test'
import { bootstrapAuthedSession } from './helpers/webauthn'

// OAuth-only platform: password login is gone. This test drives a real
// WebAuthn ceremony via a Playwright virtual authenticator against the
// seeded provider user (admin@example.com), then asserts the dashboard.
test.describe('服务商仪表盘（WebAuthn 全真登录）', () => {
  test('仪表盘数据显示验证', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      consoleLogs.push(msg.text())
      console.log(`[Browser] ${msg.text()}`)
    })

    // Bootstrap: enable virtual authenticator → register passkey → log in.
    // This leaves the browser authenticated as the provider.
    const auth = await bootstrapAuthedSession(page)

    // Navigate to the provider dashboard.
    await page.goto('/provider/dashboard')
    await page.waitForTimeout(2000)

    // 验证标题显示"仪表盘"而非"服务商仪表盘"
    console.log('[Test] 验证仪表盘标题...')
    const titleElement = page.locator('h1.text-h4')
    const titleText = await titleElement.textContent()
    console.log(`[Test] 标题内容: ${titleText}`)
    expect(titleText).toBe('仪表盘')

    // 验证系统监控卡片存在
    console.log('[Test] 验证系统监控卡片...')
    const memorySection = page.locator('text=内存使用')
    const diskSection = page.locator('text=磁盘使用')
    const dbSection = page.locator('text=数据库连接')

    await expect(memorySection).toBeVisible()
    await expect(diskSection).toBeVisible()
    await expect(dbSection).toBeVisible()

    // 验证进度条存在
    console.log('[Test] 验证进度条...')
    const progressBar = page.getByRole('progressbar').first()
    await expect(progressBar).toBeVisible()

    // 等待 API 响应
    await page.waitForTimeout(3000)

    // 验证进度条显示百分比
    const percentText = await progressBar.textContent()
    console.log(`[Test] 进度条百分比: ${percentText}`)
    expect(percentText).toContain('%')

    // 验证运行时间不为 N/A
    console.log('[Test] 验证运行时间...')
    const uptimeText = await page.getByText('运行时间').locator('..').textContent()
    console.log(`[Test] 运行时间信息: ${uptimeText}`)
    expect(uptimeText).not.toContain('N/A')

    // 验证最大连接数不为 N/A
    console.log('[Test] 验证最大连接数...')
    const maxConnText = await page.getByText('最大连接数').locator('..').textContent()
    console.log(`[Test] 最大连接数信息: ${maxConnText}`)
    expect(maxConnText).not.toContain('N/A')

    // 验证日志区域存在
    console.log('[Test] 验证日志区域...')
    const logSection = page.locator('h2').filter({ hasText: '后端运行日志' })
    await expect(logSection).toBeVisible()

    // 验证日志列表（终端风格显示）
    const terminalOutput = page.locator('.terminal-output')
    await expect(terminalOutput).toBeVisible()

    // 验证有日志内容
    const terminalContent = await terminalOutput.textContent()
    console.log(`[Test] 终端日志内容长度: ${terminalContent?.length || 0}`)
    expect(terminalContent).toBeTruthy()

    await auth.remove()
    console.log('✅ Playwright 仪表盘数据显示测试完成喵！')
  })
})
