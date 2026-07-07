# اسپرینت ۲: تست و کیفیت کد

**مدت زمان:** ۲ هفته  
**هدف:** بهبود پوشش تست و کیفیت کد  
**تخمین زمان:** ۵۰-۸۰ ساعت  

---

## 📋 تسک‌های اصلی

### 🔴 اولویت بحرانی

#### 1. نوشتن Unit Tests برای Auth Service
**زمان:** ۸-۱۲ ساعت  
**فایل:** `apps/backend-api/src/modules/auth/services/auth.service.spec.ts`

**تست‌های مورد نیاز:**
- register() - ثبت‌نام کاربر جدید
- login() - ورود با credentials صحیح و غلط
- refreshToken() - چرخش توکن و تشخیص استفاده مجدد
- logout() - خروج و revoke توکن‌ها
- verifyOtp() - تأیید کد OTP
- forgotPassword() - فراموشی رمز عبور
- resetPassword() - بازنشانی رمز عبور

**Coverage هدف:** ۸۰٪+

---

#### 2. نوشتن Unit Tests برای Order Service
**زمان:** ۸-۱۲ ساعت  
**فایل:** `apps/backend-api/src/modules/orders/services/orders.service.spec.ts`

**تست‌های مورد نیاز:**
- createOrder() - ایجاد سفارش با سبد خرید معتبر
- createOrder() - خطای سبد خرید خالی
- createOrder() - خطای موجودی ناکافی
- createOrder() - اعمال کوپن تخفیف
- updateStatus() - تغییر وضعیت سفارش
- cancelOrder() - لغو سفارش و بازگرداندن موجودی

**Coverage هدف:** ۸۵٪+

---

#### 3. نوشتن Unit Tests برای Payment Service
**زمان:** ۶-۸ ساعت  
**فایل:** `apps/backend-api/src/modules/payments/services/payments.service.spec.ts`

**تست‌های مورد نیاز:**
- createPayment() - ایجاد پرداخت COD
- createPayment() - خطای سفارش غیر PENDING
- verifyPayment() - تأیید پرداخت
- processRefund() - بازپرداخت
- handleWebhook() - پردازش webhook درگاه

**Coverage هدف:** ۸۰٪+

---

### 🟠 اولویت بالا

#### 4. استخراج کد تکراری از سرویس‌ها
**زمان:** ۶-۸ ساعت  
**فایل‌ها:**
- `apps/backend-api/src/shared/utils/validation.util.ts` (جدید)
- `apps/backend-api/src/shared/base/base.service.ts` (جدید)

**تغییرات:**
- استخراج `ensureValidObjectId()` به validation utility
- ایجاد `BaseService` با متدهای مشترک
- Refactor سرویس‌ها برای استفاده از کدهای مشترک

---

#### 5. نوشتن Integration Tests برای جریان‌های حیاتی
**زمان:** ۸-۱۲ ساعت  
**فایل‌ها:**
- `apps/backend-api/test/auth-flow.integration.spec.ts` (جدید)
- `apps/backend-api/test/order-flow.integration.spec.ts` (جدید)
- `apps/backend-api/test/payment-flow.integration.spec.ts` (جدید)

**جریان‌ها:**
- ثبت‌نام → تأیید ایمیل → ورود
- افزودن به سبد → ایجاد سفارش → پرداخت
- ایجاد سفارش → لغو → بازپرداخت

---

#### 6. رفع کامنت‌های TODO
**زمان:** ۲-۳ ساعت  
**فایل‌ها:** تمام فایل‌های backend

**تغییرات:**
- جستجوی تمام TODOها
- ایجاد GitHub Issue برای هر TODO
- رفع TODOهای ساده
- کامنت‌گذاری TODOهای پیچیده با شماره Issue

---

#### 7. استانداردسازی مدیریت خطا
**زمان:** ۸-۱۲ ساعت  
**فایل‌ها:**
- `apps/backend-api/src/core/exceptions/` (بهبود)
- تمام سرویس‌ها

**تغییرات:**
- ایجاد Exception Hierarchy
- استفاده از Custom Exceptions به‌جای HttpException
- افزودن Error Codes
- بهبود پیام‌های خطا

---

### 🟡 اولویت متوسط

#### 8. افزودن JSDoc به APIهای عمومی
**زمان:** ۸-۱۲ ساعت  
**فایل‌ها:** تمام Controllerها و Serviceها

**تغییرات:**
- افزودن JSDoc به تمام public methods
- مستندسازی پارامترها و return types
- افزودن مثال‌های استفاده

---

#### 9. استخراج Magic Numbers به Constants
**زمان:** ۳-۴ ساعت  
**فایل‌ها:** تمام فایل‌ها

**تغییرات:**
- شناسایی magic numbers
- ایجاد constants در فایل‌های مناسب
- جایگزینی magic numbers با constants

---

#### 10. بهبود ساختار تست‌ها
**زمان:** ۶-۸ ساعت  
**فایل‌ها:**
- `apps/backend-api/test/helpers/` (جدید)
- `apps/backend-api/test/fixtures/` (جدید)

**تغییرات:**
- ایجاد test helpers
- ایجاد test fixtures
- ایجاد test factories
- بهبود test organization

---

## 📊 معیارهای موفقیت

### پوشش تست
- [ ] Auth Service: ۸۰٪+
- [ ] Order Service: ۸۵٪+
- [ ] Payment Service: ۸۰٪+
- [ ] پوشش کلی: ۷۰٪+

### کیفیت کد
- [ ] کد تکراری: < ۵٪
- [ ] TODOهای حل شده: ۱۰۰٪
- [ ] JSDoc coverage: ۸۰٪+ (public APIs)
- [ ] Magic numbers: ۰

### تست‌های Integration
- [ ] Auth flow: کامل
- [ ] Order flow: کامل
- [ ] Payment flow: کامل

---

## 🎯 خروجی‌ها

1. **Unit Tests جامع** برای سرویس‌های اصلی
2. **Integration Tests** برای جریان‌های حیاتی
3. **کد تمیزتر** با کاهش duplication
4. **مستندات بهتر** با JSDoc
5. **Exception Hierarchy** استاندارد

---

## 📝 یادداشت‌ها

- تمام تست‌ها باید در CI اجرا شوند
- از Jest برای unit tests استفاده می‌شود
- از Supertest برای integration tests استفاده می‌شود
- Coverage report در PR نمایش داده می‌شود
