import { test, expect } from '@playwright/test';

test('服务商点击设置按钮 - 完全清除缓存后测试', async ({ page, browser }) => {
  // 创建新的浏览器上下文（无缓存）
  const context = await browser.newContext();
  const newPage = await context.newPage();

  // 监听HTTP响应
  newPage.on('response', response => {
    if (response.status() === 403) {
      console.log(`[Test] 403错误: ${response.url()}`);
    }
  });

  // 访问登录页
  console.log('[Test] 使用全新浏览器上下文登录...');
  await newPage.goto('http://localhost:5173/login');
  await newPage.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });

  // 填写登录表单（使用服务商账号）
  await newPage.getByPlaceholder('请输入手机号').fill('13800138000');
  await newPage.getByPlaceholder('请输入密码').fill('password123');

  // 点击登录按钮
  await newPage.getByRole('button', { name: '登录' }).click();
  await newPage.waitForTimeout(3000);

  // 检查登录后的URL
  const loginUrl = newPage.url();
  console.log(`[Test] 登录后URL: ${loginUrl}`);

  // 导航到组织管理页面
  console.log('[Test] 导航到组织管理页面...');
  await newPage.goto('http://localhost:5173/provider/orgs');
  await newPage.waitForTimeout(2000);

  // 查看组织列表
  const orgRows = newPage.locator('tbody tr');
  const orgCount = await orgRows.count();
  console.log(`[Test] 找到 ${orgCount} 个组织`);

  if (orgCount > 0) {
    // 点击第一个组织的"管理"按钮（设置图标）
    const firstRow = orgRows.first();
    const manageButton = firstRow.locator('button:has-text("管理"), v-btn:has(.mdi-cog)').first();

    try {
      console.log('[Test] 尝试点击管理按钮...');
      await manageButton.click({ timeout: 5000 });
      console.log('[Test] 已点击管理按钮');
    } catch (e) {
      console.log('[Test] 未找到管理按钮，直接导航');
      await newPage.goto('http://localhost:5173/provider/orgs/1');
    }

    await newPage.waitForTimeout(2000);

    // 检查当前URL
    const detailUrl = newPage.url();
    console.log(`[Test] 组织详情页面URL: ${detailUrl}`);

    // 等待页面稳定
    await newPage.waitForTimeout(1000);

    // 截图查看实际页面
    await newPage.screenshot({ path: '/tmp/org-detail-after-clear.png' });
    console.log('[Test] 已保存截图到 /tmp/org-detail-after-clear.png');

    // 检查是否有403或禁止访问
    const hasForbiddenText = await newPage.getByText('403').isVisible().catch(() => false) ||
                             await newPage.getByText('禁止访问').isVisible().catch(() => false) ||
                             await newPage.getByText('forbidden').isVisible().catch(() => false);

    if (hasForbiddenText) {
      console.log('[Test] ERROR: 页面显示403或禁止访问！');
      await context.close();
      throw new Error('服务商访问组织设置页面时出现403错误喵～');
    }

    console.log('[Test] ✅ 组织详情页面访问正常');

    await context.close();
  }
});
