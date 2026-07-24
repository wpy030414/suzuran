import { test, expect } from '@playwright/test';

test('服务商登录流程测试', async ({ page }) => {
  // 监听控制台日志
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`);
  });

  // 访问前端首页
  await page.goto('http://localhost:5173');

  // 点击登录链接或直接导航到登录页
  await page.goto('http://localhost:5173/login');

  // 等待页面加载
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });

  // 填写登录表单
  await page.getByPlaceholder('请输入手机号').fill('13800138000');
  await page.getByPlaceholder('请输入密码').fill('password123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录' }).click();

  // 等待一下，让异步操作完成
  await page.waitForTimeout(3000);

  // 检查当前 URL
  const currentUrl = page.url();
  console.log(`[Test] Current URL after login: ${currentUrl}`);

  // 如果跳转到 forbidden，说明路由守卫拒绝了
  if (currentUrl.includes('/forbidden')) {
    console.log('[Test] ERROR: Redirected to forbidden!');
    // 截图查看
    await page.screenshot({ path: '/tmp/forbidden.png' });
    throw new Error('登录后被重定向到禁止访问页面，请检查路由守卫逻辑喵～');
  }

  // 验证是否成功进入服务商页面
  await expect(page.locator('h1')).toContainText(/服务商仪表盘|Dashboard/, { timeout: 5000 });

  console.log('✅ Playwright 测试成功喵！');
});
