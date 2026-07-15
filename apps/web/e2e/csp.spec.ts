import { test, expect } from '@playwright/test';

type CspPage = Window & {
  __styleCspViolations?: string[];
};

test('style CSP is nonce-based and emits no style violations', async ({ page, request }) => {
  const response = await request.get('/login');
  const headers = response.headers();
  const csp = headers['content-security-policy'] ?? headers['content-security-policy-report-only'] ?? '';

  expect(csp).toContain("style-src 'self' 'nonce-");
  expect(csp).toContain("style-src-elem 'self' 'nonce-");
  expect(csp).toContain("style-src-attr 'none'");
  expect(csp).not.toContain("'unsafe-inline'");

  await page.addInitScript(() => {
    const windowWithViolations = window as CspPage;
    windowWithViolations.__styleCspViolations = [];
    window.addEventListener('securitypolicyviolation', (event) => {
      if (event.violatedDirective.startsWith('style-src')) {
        windowWithViolations.__styleCspViolations?.push(event.violatedDirective);
      }
    });
  });

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(100);

  const styleViolations = await page.evaluate(
    () => (window as CspPage).__styleCspViolations ?? [],
  );
  expect(styleViolations).toEqual([]);
});
