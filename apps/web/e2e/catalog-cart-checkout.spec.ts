import { test, expect } from '@playwright/test';
import { expectNoCriticalA11ySmoke, mockCatalog, mockCustomerAuth, sampleAddress, sampleProduct } from './helpers';

test('product browse and search suggestions are keyboard accessible', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/products');

  await expect(page.getByText(sampleProduct.name).first()).toBeVisible();
  await expectNoCriticalA11ySmoke(page);

  const search = page.getByRole('combobox', { name: 'جستجو در محصولات' });
  await search.fill('چای');
  const option = page.getByRole('option').filter({ hasText: sampleProduct.name }).first();
  await expect(option).toBeVisible();
  await search.press('ArrowDown');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await expect(option).toContainText(sampleProduct.name);
});

test('cart and checkout flow uses saved address, shipping quote and creates COD payment', async ({ page }) => {
  await mockCustomerAuth(page);
  await mockCatalog(page);
  await page.route('**/api/v1/cart/my', async (route) => {
    await route.fulfill({ json: { cart: { userId: 'user-1', items: [{ productId: sampleProduct._id, quantity: 1 }] }, totalPrice: 99000, items: [{ productId: sampleProduct._id, quantity: 1, name: sampleProduct.name, price: 99000, stock: 12, lineTotal: 99000, isAvailable: true, product: { _id: sampleProduct._id, name: sampleProduct.name, price: sampleProduct.price, discountPrice: sampleProduct.discountPrice, images: [], stock: 12, isActive: true } }] } });
  });
  await page.route('**/api/v1/addresses/my', async (route) => route.fulfill({ json: [sampleAddress] }));
  await page.route('**/api/v1/shipping/quote', async (route) => route.fulfill({ json: { method: 'standard', deliveryFee: 50000, freeShippingApplied: false, freeShippingThreshold: 1000000, capacity: 50, province: 'تهران', city: 'تهران', timeSlot: '09:00-12:00', deliveryDate: '2026-07-10' } }));
  await page.route('**/api/v1/orders', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ shippingMethod: 'standard' });
    await route.fulfill({ status: 201, json: { _id: 'order-1', userId: 'user-1', items: [], subtotalPrice: 99000, deliveryFee: 50000, totalPrice: 149000, status: 'pending' } });
  });
  await page.route('**/api/v1/payments/create', async (route) => route.fulfill({ status: 201, json: { _id: 'payment-1', orderId: 'order-1', userId: 'user-1', amount: 149000, status: 'paid', method: 'cod' } }));

  await page.goto('/checkout');
  await page.getByLabel('انتخاب از آدرس‌های ذخیره‌شده').selectOption(sampleAddress._id);
  await expect(page.getByPlaceholder('نام تحویل‌گیرنده')).toHaveValue(sampleAddress.recipientName);
  await page.getByRole('button', { name: /ثبت سفارش/ }).click();
  await page.getByRole('button', { name: /بله، ثبت سفارش/ }).click();

  await expect(page).toHaveURL(/\/order\/success\?orderId=order-1/);
});
