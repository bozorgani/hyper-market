import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

const responsiveViewports = [
  { name: 'responsive-320', width: 320, height: 800 },
  { name: 'responsive-375', width: 375, height: 812 },
  { name: 'responsive-390', width: 390, height: 844 },
  { name: 'responsive-414', width: 414, height: 896 },
  { name: 'responsive-768', width: 768, height: 900 },
  { name: 'responsive-1024', width: 1024, height: 900 },
  { name: 'responsive-1280', width: 1280, height: 900 },
  { name: 'responsive-1440', width: 1440, height: 900 },
  { name: 'responsive-1920', width: 1920, height: 1080 },
];

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: '/api/v1',
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_TELEMETRY_DISABLED: '1',
      CSP_MODE: 'report-only',
      PLAYWRIGHT_MOCK_ACTIONS: '1',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...responsiveViewports.map(({ name, width, height }) => ({
      name,
      testMatch: [/responsive\.spec\.ts/, /accessibility\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width, height },
        isMobile: width < 768,
        hasTouch: width < 768,
      },
    })),
  ],
});
