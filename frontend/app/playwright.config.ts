import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Suzuran Cloud frontend.
 *
 * E2E tests run against the Vite dev server (port 5173), which proxies API
 * calls to the Go backend (port 8888). Start both before running tests:
 *
 *   cd backend && go run cmd/api/main.go
 *   cd frontend/app && npm run dev
 *
 * Or use `webServer` below to auto-start the frontend. The backend must be
 * started manually (it needs PostgreSQL/Redis/MinIO).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
