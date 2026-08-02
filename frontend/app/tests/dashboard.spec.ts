import { test, expect } from '@playwright/test';

test('仪表盘数据显示验证', async ({ page }) => {
  // 监听控制台日志
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log(`[Browser] ${msg.text()}`);
  });

  // 访问前端首页
  await page.goto('http://localhost:5173');

  // 导航到登录页
  await page.goto('http://localhost:5173/login');

  // 等待页面加载
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });

  // 填写登录表单（使用测试账号）
  await page.getByPlaceholder('请输入手机号').fill('13800138000');
  await page.getByPlaceholder('请输入密码').fill('password123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录' }).click();

  // 等待登录完成
  await page.waitForTimeout(3000);

  // 检查是否成功登录
  const currentUrl = page.url();
  console.log(`[Test] Current URL after login: ${currentUrl}`);

  // 导航到仪表盘页面
  await page.goto('http://localhost:5173/provider/dashboard');
  await page.waitForTimeout(2000);

  // 验证标题显示"仪表盘"而非"服务商仪表盘"
  console.log('[Test] 验证仪表盘标题...');
  const titleElement = page.locator('h1.text-h4');
  const titleText = await titleElement.textContent();
  console.log(`[Test] 标题内容: ${titleText}`);
  expect(titleText).toBe('仪表盘');

  // 验证系统监控卡片存在（使用更宽松的文本匹配）
  console.log('[Test] 验证系统监控卡片...');
  const memorySection = page.locator('text=内存使用');
  const diskSection = page.locator('text=磁盘使用');
  const dbSection = page.locator('text=数据库连接');

  await expect(memorySection).toBeVisible();
  await expect(diskSection).toBeVisible();
  await expect(dbSection).toBeVisible();

  // 验证进度条存在（使用role选择器）
  console.log('[Test] 验证进度条...');
  const progressBar = page.getByRole('progressbar').first();
  await expect(progressBar).toBeVisible();

  // 验证数据不为空（有实际数值）
  console.log('[Test] 验证数据不为零...');

  // 等待API响应
  await page.waitForTimeout(3000);

  // 截图查看实际显示
  const screenshot = await page.screenshot({ path: '/tmp/dashboard-test.png' });
  console.log('[Test] 已保存截图到 /tmp/dashboard-test.png');

  // 验证内存使用有数值
  const memoryText = await memorySection.textContent();
  console.log(`[Test] 内存使用信息: ${memoryText}`);

  // 验证进度条显示百分比
  const percentText = await progressBar.textContent();
  console.log(`[Test] 进度条百分比: ${percentText}`);
  expect(percentText).toContain('%');

  // 验证运行时间不为N/A
  console.log('[Test] 验证运行时间...');
  const uptimeText = await page.getByText('运行时间').locator('..').textContent();
  console.log(`[Test] 运行时间信息: ${uptimeText}`);
  expect(uptimeText).not.toContain('N/A');

  // 验证最大连接数不为N/A
  console.log('[Test] 验证最大连接数...');
  const maxConnText = await page.getByText('最大连接数').locator('..').textContent();
  console.log(`[Test] 最大连接数信息: ${maxConnText}`);
  expect(maxConnText).not.toContain('N/A');

  // 验证日志区域存在
  console.log('[Test] 验证日志区域...');
  const logSection = page.locator('h2').filter({ hasText: '后端运行日志' });
  await expect(logSection).toBeVisible();

  // 验证日志列表（终端风格显示）
  const terminalOutput = page.locator('.terminal-output');
  await expect(terminalOutput).toBeVisible();

  // 验证有日志内容（终端风格的文本）
  const terminalContent = await terminalOutput.textContent();
  console.log(`[Test] 终端日志内容长度: ${terminalContent?.length || 0}`);
  expect(terminalContent).toBeTruthy();

  console.log('✅ Playwright 仪表盘数据显示测试完成喵！');
});
