import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BETA_E2E_URL ?? 'http://127.0.0.1:5173'
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
  throw new Error('Run the beta browser tests against a local preview and a dedicated test database.')
}

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    channel: process.env.BETA_E2E_BROWSER || undefined,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
})
