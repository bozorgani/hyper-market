import { expect, type Page } from '@playwright/test';

export const sampleCategory = {
  _id: '64f000000000000000000001',
  name: 'نوشیدنی',
  slug: 'drinks',
  isActive: true,
};

export const sampleProduct = {
  _id: '64f000000000000000000101',
  name: 'چای ممتاز',
  description: 'چای ایرانی خوش‌عطر برای تست',
  price: 120000,
  discountPrice: 99000,
  stock: 12,
  images: [],
  categoryId: sampleCategory._id,
  isActive: true,
  brand: 'هایپر',
  unit: 'بسته',
  tags: ['tea'],
};

export const sampleAddress = {
  _id: '64f000000000000000000501',
  label: 'خانه',
  recipientName: 'کاربر تست',
  phoneNumber: '09123456789',
  province: 'تهران',
  city: 'تهران',
  addressLine: 'تهران، خیابان تست، پلاک ۱',
  plate: '۱',
  unit: '۲',
  postalCode: '1234567890',
  isDefault: true,
};

export function fakeJwt(role: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '64f000000000000000000999', role, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

export async function mockCatalog(page: Page) {
  await page.route('**/api/v1/products**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: { items: [sampleProduct], total: 1, page: 1, limit: 12, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.route('**/api/v1/categories**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: [sampleCategory] });
  });
  await page.route('**/api/v1/search/products**', async (route) => {
    await route.fulfill({ json: { items: [{ id: sampleProduct._id, title: sampleProduct.name, price: sampleProduct.price, discountPrice: sampleProduct.discountPrice, effectivePrice: sampleProduct.discountPrice, stock: sampleProduct.stock, categoryName: sampleCategory.name, image: null }], total: 1, page: 1, limit: 24, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false }, facets: { categories: { [sampleCategory.name]: 1 }, brands: {}, tags: {} } } });
  });
  await page.route('**/api/v1/search/suggest**', async (route) => {
    await route.fulfill({ json: [{ id: sampleProduct._id, title: sampleProduct.name, price: sampleProduct.price, discountPrice: sampleProduct.discountPrice, effectivePrice: sampleProduct.discountPrice, stock: sampleProduct.stock, categoryName: sampleCategory.name, image: null }] });
  });
}

export async function mockCustomerAuth(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { id: '64f000000000000000000999', _id: '64f000000000000000000999', role: 'customer', email: 'customer@example.com', phoneNumber: '09123456789', accountStatus: 'active', sessionId: 'session-1', deviceId: 'device-1' } });
  });
  await page.context().addCookies([
    { name: 'hyper_market_access_token', value: fakeJwt('customer'), domain: '127.0.0.1', path: '/' },
  ]);
}

export async function mockAdminAuth(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: { id: '64f000000000000000000998', _id: '64f000000000000000000998', role: 'admin', email: 'admin@example.com', accountStatus: 'active', sessionId: 'session-admin', deviceId: 'device-admin' } });
  });
  await page.context().addCookies([
    { name: 'hyper_market_access_token', value: fakeJwt('admin'), domain: '127.0.0.1', path: '/' },
  ]);
}

export async function expectNoCriticalA11ySmoke(page: Page) {
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  const buttons = await page.locator('button').count();
  for (let i = 0; i < Math.min(buttons, 10); i += 1) {
    const button = page.locator('button').nth(i);
    await expect(button).toHaveJSProperty('tabIndex', 0);
  }
}
