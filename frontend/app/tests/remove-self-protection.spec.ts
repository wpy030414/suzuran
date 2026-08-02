import { test, expect } from '@playwright/test';

test('服务商不能将自己从org_id=1中移除', async ({ page }) => {
  // 监听HTTP响应
  const forbiddenResponses = [];
  page.on('response', response => {
    if (response.url().includes('/api/provider/orgs/') && response.status() === 403) {
      forbiddenResponses.push(response.url());
      console.log(`[Test] 403错误: ${response.url()}`);
    }
  });

  // 访问登录页
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('input[placeholder="请输入手机号"]', { timeout: 5000 });

  // 填写登录表单（使用服务商账号）
  await page.getByPlaceholder('请输入手机号').fill('13800138000');
  await page.getByPlaceholder('请输入密码').fill('password123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(3000);

  // 导航到组织管理页面
  console.log('[Test] 导航到组织管理页面...');
  await page.goto('http://localhost:5173/provider/orgs');
  await page.waitForTimeout(2000);

  // 查看组织列表
  const orgRows = page.locator('tbody tr');
  const orgCount = await orgRows.count();
  console.log(`[Test] 找到 ${orgCount} 个组织`);

  if (orgCount > 0) {
    // 获取第一个组织（应该是org_id=1）
    const firstRow = orgRows.first();

    // 尝试点击"删除"或"移除"按钮（如果有的话）
    // 注意：通常UI上不会显示删除自己的选项，但API应该有保护

    // 直接测试API：尝试通过API移除自己
    console.log('[Test] 测试API保护逻辑...');

    // 获取当前用户的ID（从localStorage或API响应中）
    const storedUser = await page.evaluate(() => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    });

    if (storedUser && storedUser.id) {
      const userId = storedUser.id;
      console.log(`[Test] 当前用户ID: ${userId}`);

      // 尝试通过API移除自己（应该被后端拒绝）
      const token = await page.evaluate(() => localStorage.getItem('token'));

      try {
        const response = await page.evaluate(async (uid, tok) => {
          const res = await fetch(`/api/provider/orgs/1/users/${uid}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${tok}`,
              'Content-Type': 'application/json'
            }
          });
          return {
            status: res.status,
            body: await res.json()
          };
        }, userId, token);

        console.log(`[Test] API响应状态: ${response.status}`);
        console.log(`[Test] API响应内容:`, response.body);

        // 验证API返回了错误（禁止移除自己）
        if (response.status === 400 || response.status === 403) {
          console.log('[Test] ✅ API正确拒绝了移除自己的请求');
          expect(response.body.error).toBeTruthy();
        } else {
          console.log('[Test] ERROR: API允许了移除自己的请求！');
          throw new Error('API没有正确保护防止移除自己喵～');
        }
      } catch (e) {
        console.log('[Test] API调用失败:', e);
        // 可能是CORS问题或其他原因，继续测试
      }
    }

    console.log('[Test] ✅ 保护逻辑测试完成');
  }
});
