import { test, expect } from '@playwright/test';
import { mockCustomerAuth } from './helpers';

test('login flow submits credentials and opens profile', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ json: { success: true, message: 'login successful' } });
  });
  await mockCustomerAuth(page);

  await page.goto('/login');
  await page.getByPlaceholder(/example@email/).fill('customer@example.com');
  await page.getByPlaceholder('رمز عبور خود را وارد کنید').fill('StrongPass123!');
  await page.getByRole('button', { name: /ورود به حساب/ }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByText(/حساب کاربری|customer/).first()).toBeVisible();
});

test('register flow sends registration request and redirects to OTP verification', async ({ page }) => {
  await page.route('**/api/v1/auth/me', async (route) => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.route('**/api/v1/auth/register', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ email: 'new@example.com' });
    await route.fulfill({ status: 201, json: { id: 'user-1', message: 'verification otp sent' } });
  });

  await page.goto('/register');
  await page.getByPlaceholder('example@email.com').fill('new@example.com');
  await page.getByPlaceholder('حداقل ۸ کاراکتر شامل حروف و اعداد').fill('StrongPass123!');
  await page.getByRole('button', { name: /ساخت حساب کاربری/ }).click();

  await expect(page).toHaveURL(/\/verify-otp/);
});
