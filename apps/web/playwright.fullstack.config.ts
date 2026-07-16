import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/fullstack.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `npm run backend:build && npm run start:prod --workspace=apps/backend-api`,
      url: 'http://localhost:3001/health',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
      url: baseURL,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
        NEXT_PUBLIC_SITE_URL: baseURL,
        NEXT_TELEMETRY_DISABLED: '1',
        CSP_MODE: 'report-only',
        PLAYWRIGHT_MOCK_ACTIONS: '0',
      },
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
