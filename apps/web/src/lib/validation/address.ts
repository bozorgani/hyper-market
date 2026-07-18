import { z } from "zod";

const recipientNameMessage = "نام تحویل‌گیرنده حداقل ۲ کاراکتر باشد.";
const phoneNumberMessage = "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
const provinceMessage = "انتخاب استان الزامی است.";
const cityMessage = "انتخاب شهر الزامی است.";
const addressLineMessage = "آدرس باید حداقل ۱۰ کاراکتر باشد.";
const postalCodeMessage = "کد پستی باید دقیقاً ۱۰ رقم باشد.";

export const addressRecipientNameSchema = z.string().trim().min(2, recipientNameMessage);
export const addressPhoneNumberSchema = z.string().trim().regex(/^09\d{9}$/, phoneNumberMessage);
export const addressLineSchema = z.string().trim().min(10, addressLineMessage);
export const addressPostalCodeSchema = z.string().trim().regex(/^\d{10}$/, postalCodeMessage);

export const addressFormSchema = z.object({
  recipientName: addressRecipientNameSchema,
  phoneNumber: addressPhoneNumberSchema,
  province: z.string().trim().min(2, provinceMessage),
  city: z.string().trim().min(2, cityMessage),
  addressLine: addressLineSchema,
  label: z.string().nullish(),
  plate: z.string().nullish(),
  unit: z.string().nullish(),
  postalCode: z.string().nullish(),
  isDefault: z.boolean().optional(),
});
