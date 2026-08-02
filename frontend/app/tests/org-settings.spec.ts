import { test, expect } from '@playwright/test';

test('服务商访问组织管理设置页面', async ({ page }) => {
  // 监听控制台日志
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log(`[Browser] ${msg.text()}`);
  });

  // 监听HTTP响应
  page.on('response', response => {
    if (response.status() === 403) {
      console.log(`[Test] 403错误: ${response.url()}`);
    }
  });

  // 访问前端首页
  await page.goto('http://localhost:5173');

  // 导航到登录页
  await page.goto('http://localhost:5173/login');

  // 等待页面加载
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });

  // 填写登录表单（使用服务商账号）
  await page.getByPlaceholder('请输入手机号').fill('13800138000');
  await page.getByPlaceholder('请输入密码').fill('password123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录' }).click();

  // 等待登录完成
  await page.waitForTimeout(3000);

  // 检查是否成功登录
  const currentUrl = page.url();
  console.log(`[Test] Current URL after login: ${currentUrl}`);

  // 清除localStorage中的用户信息，模拟新登录
  console.log('[Test] 清除localStorage并重新获取角色...');
  await page.evaluate(() => {
    localStorage.clear();
  });

  // 重新登录
  console.log('[Test] 重新登录...');
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });
  await page.getByPlaceholder('请输入手机号').fill('13800138000');
  await page.getByPlaceholder('请输入密码').fill('password123');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(3000);

  // 导航到组织管理页面
  console.log('[Test] 导航到组织管理页面...');
  await page.goto('http://localhost:5173/provider/orgs');
  await page.waitForTimeout(2000);

  // 查看是否有组织列表
  const orgRows = page.locator('tbody tr');
  const orgCount = await orgRows.count();
  console.log(`[Test] 找到 ${orgCount} 个组织`);

  if (orgCount > 0) {
    // 获取第一个组织的ID
    const firstRow = orgRows.first();
    let orgId = '1'; // 默认使用org_id=1

    // 尝试从行属性获取ID
    try {
      const rowId = await firstRow.getAttribute('data-id');
      if (rowId) {
        orgId = rowId;
      }
    } catch (e) {
      // 忽略
    }

    console.log(`[Test] 访问组织ID: ${orgId}`);

    // 直接导航到组织详情页面（超级管理员org_id=1）
    console.log('[Test] 导航到组织详情页面...');
    await page.goto(`http://localhost:5173/provider/orgs/${orgId}`);
    await page.waitForTimeout(2000);

    // 检查当前URL
    const orgDetailUrl = page.url();
    console.log(`[Test] 组织详情页面URL: ${orgDetailUrl}`);

    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 检查页面内容
    const pageContent = await page.content();
    const pageTitle = await page.title();
    console.log(`[Test] 页面标题: ${pageTitle}`);

    // 检查是否有明显的403或禁止访问文本
    const hasForbiddenText = await page.getByText('403').isVisible() ||
                             await page.getByText('禁止访问').isVisible() ||
                             await page.getByText('forbidden').isVisible();

    if (hasForbiddenText) {
      console.log('[Test] ERROR: 页面包含403或禁止访问文本！');

      // 截图
      await page.screenshot({ path: '/tmp/org-403.png' });
      console.log('[Test] 已保存403截图到 /tmp/org-403.png');

      throw new Error('服务商访问组织管理设置页面时出现403错误喵～');
    }

    // 检查是否在正确的URL上（没有被重定向）
    if (!orgDetailUrl.includes('/provider/orgs/')) {
      console.log(`[Test] ERROR: 被重定向到其他页面: ${orgDetailUrl}`);

      await page.screenshot({ path: '/tmp/org-redirect.png' });
      throw new Error(`被重定向到: ${orgDetailUrl} 喵～`);
    }

    console.log('[Test] ✅ 组织管理设置页面访问正常');
  } else {
    console.log('[Test] 没有找到组织，跳过测试');
  }
});
