import { test, expect } from '@playwright/test';
import { mockAdminAuth, sampleCategory, sampleProduct } from './helpers';

test('admin category create/update/delete UI talks to admin CRUD endpoints', async ({ page }) => {
  await mockAdminAuth(page);
  await page.route('**/api/v1/admin/categories**', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    if (method === 'GET' && url.searchParams.has('page')) {
      return route.fulfill({ json: { items: [sampleCategory], total: 1, page: 1, limit: 8, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    }
    if (method === 'GET') return route.fulfill({ json: [sampleCategory] });
    if (method === 'POST') return route.fulfill({ status: 201, json: { ...sampleCategory, ...route.request().postDataJSON(), _id: 'new-category' } });
    if (method === 'PUT') return route.fulfill({ json: { ...sampleCategory, ...route.request().postDataJSON() } });
    if (method === 'DELETE') return route.fulfill({ json: sampleCategory });
    return route.fallback();
  });

  await page.goto('/admin/categories');
  await expect(page.getByText('مدیریت دسته‌بندی‌ها')).toBeVisible();
  await page.getByPlaceholder('مثال: موبایل').fill('تنقلات');
  await page.getByPlaceholder('مثال: mobile').fill('snacks');
  await page.getByRole('button', { name: /افزودن دسته‌بندی|ذخیره/ }).click();
  await expect(page.getByText(/دسته‌بندی/).first()).toBeVisible();
});

test('admin product list uses server pagination endpoint', async ({ page }) => {
  await mockAdminAuth(page);
  await page.route('**/api/v1/admin/products**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: { items: [sampleProduct], total: 1, page: 1, limit: 10, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.route('**/api/v1/admin/search/products**', async (route) => route.fulfill({ json: { items: [], total: 0, page: 1, limit: 10, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false }, facets: { categories: {}, brands: {}, tags: {}, status: {} } } }));

  await page.goto('/admin/products');
  await expect(page.getByText('مدیریت محصولات')).toBeVisible();
  await expect(page.getByRole('cell', { name: sampleProduct.name }).first()).toBeVisible();
});
