import type { Page, BrowserContext } from '@playwright/test'

/**
 * WebAuthn test helpers.
 *
 * The platform is OAuth-only — every E2E flow that touches a protected page
 * must complete a real WebAuthn ceremony. Playwright drives this via the
 * Chrome DevTools Protocol (CDP) WebAuthn domain: we add a *virtual
 * authenticator* that automatically approves navigator.credentials.create()
 * and navigator.credentials.get() without interactive prompts.
 *
 * Usage in a test:
 *
 *   const auth = await enableVirtualAuthenticator(page)
 *   // ... register a passkey, log in, assert protected page ...
 *
 * The virtual authenticator lives on the page's browser context. Each test
 * gets its own context (Playwright default), so credentials don't leak across
 * tests. To isolate further, tests can call setAutomaticPresence.
 */

interface VirtualAuthenticatorOptions {
  protocol?: 'ctap2' | 'u2f'
  transport?: 'usb' | 'nfc' | 'ble' | 'internal'
  hasResidentKey?: boolean
  hasUserVerification?: boolean
  isUserVerified?: boolean
  automaticPresenceSimulation?: boolean
}

const DEFAULTS: Required<VirtualAuthenticatorOptions> = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  automaticPresenceSimulation: true,
}

export interface VirtualAuthenticator {
  authenticatorId: string
  cdpage: import('playwright').CDPSession
  remove: () => Promise<void>
}

/**
 * Enable the WebAuthn domain and add a virtual authenticator to the page's
 * browser context. The authenticator auto-approves ceremonies.
 */
export async function enableVirtualAuthenticator(
  page: Page,
  opts: VirtualAuthenticatorOptions = {},
): Promise<VirtualAuthenticator> {
  const o = { ...DEFAULTS, ...opts }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cdpage = await (page.context() as any).newCDPSession(page) as import('playwright').CDPSession

  // enableUI=false: suppress Chrome's interactive WebAuthn UI so ceremonies
  // resolve non-interactively under the virtual authenticator.
  await (cdpage.send as any)('WebAuthn.enable' as never, { enableUI: false })
  const { authenticatorId } = await (cdpage.send as any)('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: o.protocol,
      ctap2Version: 'ctap2_1',
      transport: o.transport,
      hasResidentKey: o.hasResidentKey,
      hasUserVerification: o.hasUserVerification,
      isUserVerified: o.isUserVerified,
      automaticPresenceSimulation: o.automaticPresenceSimulation,
    },
  })

  return {
    authenticatorId,
    cdpage,
    async remove() {
      try {
        await (cdpage.send as any)('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
        await (cdpage.send as any)('WebAuthn.disable' as never)
        await (cdpage as any).detach()
      } catch {
        // context teardown may race; ignore.
      }
    },
  }
}

/**
 * Convenience: wait for a navigator.credentials call to settle. Virtual
 * authenticator resolves synchronously, but the app's async post-processing
 * (API round-trips) needs a tick.
 */
export async function settleAuth() {
  await new Promise((r) => setTimeout(r, 100))
}

/**
 * Register a passkey via the Register page UI. Returns after the registration
 * flow completes (assumes a virtual authenticator is already enabled).
 */
export async function registerPasskeyViaUI(
  page: import('playwright').Page,
  name: string,
  email: string,
) {
  await page.goto('/register')
  await page.waitForSelector('input[placeholder="输入用户名"]', { timeout: 5000 })
  await page.getByPlaceholder('输入用户名').fill(name)
  await page.getByPlaceholder('输入邮箱').fill(email)
  await page.getByRole('button', { name: /创建 Passkey/ }).click()
  // Wait for the success alert before the auto-redirect to /login.
  await page.waitForSelector('.v-alert--type-success', { timeout: 10000 })
}

/**
 * Log in via the Login page UI using a previously-registered passkey.
 * Completes the full WebAuthn ceremony and token exchange, leaving the
 * browser authenticated. The caller chooses which org to enter by index
 * (default: first available).
 */
export async function loginWithPasskeyViaUI(
  page: import('playwright').Page,
  identifier: string,
  orgIndex = 0,
) {
  await page.goto('/login')
  await page.waitForSelector('input[placeholder="输入注册时的邮箱或用户名"]', { timeout: 5000 })
  await page.getByPlaceholder('输入注册时的邮箱或用户名').fill(identifier)
  await page.getByRole('button', { name: /Passkey 登录/ }).click()
  // Login.vue auto-selects the first available org and exchanges for tokens,
  // then routes by role. Wait for navigation away from /login.
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

/**
/**
 * Full bootstrap: enable virtual authenticator, register a passkey for the
 * seeded provider user (admin@example.com, user_id=1, bound to org 1 with
 * is_admin=true → provider role), and log in.
 *
 * The seeded user must exist (run docs/sql/seed_demo_data.sql). Each test
 * run adds a fresh passkey to user_id=1; tests are serial (workers=1) so
 * there is no concurrent-credential race.
 *
 * Returns the authenticator handle so the test can remove it in afterEach.
 *
 * @param role 'provider' (default, seeded) | 'tenant' | 'user'
 */
export async function bootstrapAuthedSession(
  page: import('playwright').Page,
  role: 'provider' | 'tenant' | 'user' = 'provider',
): Promise<VirtualAuthenticator> {
  const auth = await enableVirtualAuthenticator(page)
  const target = SEED_USERS[role]
  // Register a passkey for the seeded user (matched by email).
  await registerPasskeyViaUI(page, target.name, target.email)
  // Log in — Login.vue auto-selects the first available org and exchanges
  // for tokens, then routes by role.
  await loginWithPasskeyViaUI(page, target.email)
  return auth
}

const SEED_USERS = {
  provider: { name: '服务商管理员', email: 'admin@example.com' },
  tenant: { name: '租户管理员', email: 'tenant@example.com' },
  user: { name: '普通用户', email: 'user@example.com' },
} as const
