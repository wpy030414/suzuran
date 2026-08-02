import { test, expect } from '@playwright/test';

test('服务商访问非org_id=1的组织设置页面', async ({ page }) => {
  // 监听控制台日志
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log(`[Browser] ${msg.text()}`);
  });

  // 监听HTTP响应
  page.on('response', response => {
    if (response.status() === 403) {
      console.log(`[Test] 403错误: ${response.url()} - ${response.statusText()}`);
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

  // 清除localStorage中的用户信息，模拟新登录以获取最新角色
  console.log('[Test] 清除localStorage...');
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
    // 遍历所有组织，检查每个组织的访问情况
    for (let i = 0; i < orgCount; i++) {
      const row = orgRows.nth(i);
      const cells = await row.locator('td').all();

      // 获取组织ID（从第一列或第二列）
      let orgIdText = '';
      try {
        orgIdText = await cells[0].textContent();
      } catch (e) {
        // 忽略
      }

      console.log(`[Test] 第${i+1}行组织信息: ${orgIdText}`);

      // 尝试点击"设置"或"详情"按钮
      const settingsButton = row.locator('button:has-text("设置"), button:has-text("详情"), a[href*="org"]').first();

      try {
        await settingsButton.click({ timeout: 3000 });
        console.log(`[Test] 已点击第${i+1}个组织的设置/详情按钮`);
      } catch (e) {
        // 如果找不到按钮，直接导航
        const orgId = String(i + 1); // 假设组织ID从1开始
        console.log(`[Test] 未找到设置按钮，直接导航到组织${orgId}详情页`);
        await page.goto(`http://localhost:5173/provider/orgs/${orgId}`);
      }

      await page.waitForTimeout(2000);

      // 检查当前URL
      const detailUrl = page.url();
      console.log(`[Test] 组织详情页面URL: ${detailUrl}`);

      // 等待页面稳定
      await page.waitForTimeout(1000);

      // 检查页面内容
      const pageContent = await page.content();
      const pageTitle = await page.title();
      console.log(`[Test] 页面标题: ${pageTitle}`);

      // 检查是否有明显的403或禁止访问文本
      const hasForbiddenText = await page.getByText('403').isVisible().catch(() => false) ||
                               await page.getByText('禁止访问').isVisible().catch(() => false) ||
                               await page.getByText('forbidden').isVisible().catch(() => false);

      if (hasForbiddenText) {
        console.log(`[Test] ERROR: 组织${i+1}详情页面显示403或禁止访问！`);

        // 截图
        await page.screenshot({ path: `/tmp/org-${i+1}-403.png` });
        console.log(`[Test] 已保存403截图到 /tmp/org-${i+1}-403.png`);

        throw new Error(`服务商访问组织${i+1}设置页面时出现403错误喵～`);
      }

      // 检查是否在正确的URL上（没有被重定向）
      if (!detailUrl.includes('/provider/orgs/')) {
        console.log(`[Test] ERROR: 被重定向到其他页面: ${detailUrl}`);

        await page.screenshot({ path: `/tmp/org-redirect-${i+1}.png` });
        throw new Error(`被重定向到: ${detailUrl} 喵～`);
      }

      console.log(`[Test] ✅ 组织${i+1}详情页面访问正常`);

      // 返回组织列表页面
      if (i < orgCount - 1) {
        console.log(`[Test] 返回组织列表页面...`);
        await page.goto('http://localhost:5173/provider/orgs');
        await page.waitForTimeout(2000);
      }
    }

    console.log('[Test] ✅ 所有组织详情页面访问正常喵！');
  } else {
    console.log('[Test] 没有找到组织，跳过测试');
  }
});
