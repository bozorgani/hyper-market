import { z } from "zod";

const nameMessage = "نام محصول باید حداقل ۲ کاراکتر باشد.";
const descriptionMessage = "توضیحات محصول الزامی است.";
const categoryMessage = "انتخاب دسته‌بندی الزامی است.";
const priceMessage = "قیمت محصول باید عددی صفر یا بزرگ‌تر باشد.";
const discountPriceMessage = "قیمت تخفیفی باید بین صفر و قیمت اصلی باشد.";
const stockMessage = "موجودی محصول باید عددی صفر یا بزرگ‌تر باشد.";

export const productFormSchema = z.object({
  name: z.string(),
  description: z.string(),
  categoryId: z.string(),
  price: z.number(priceMessage),
  discountPrice: z.number(discountPriceMessage).optional(),
  stock: z.number(stockMessage),
}).superRefine((value, context) => {
  if (value.name.trim().length < 2) {
    context.addIssue({ code: "custom", path: ["name"], message: nameMessage });
  }
  if (!value.description.trim()) {
    context.addIssue({ code: "custom", path: ["description"], message: descriptionMessage });
  }
  if (!value.categoryId) {
    context.addIssue({ code: "custom", path: ["categoryId"], message: categoryMessage });
  }
  if (value.price < 0) {
    context.addIssue({ code: "custom", path: ["price"], message: priceMessage });
  }
  if (value.discountPrice !== undefined && (value.discountPrice < 0 || value.discountPrice > value.price)) {
    context.addIssue({ code: "custom", path: ["discountPrice"], message: discountPriceMessage });
  }
  if (value.stock < 0) {
    context.addIssue({ code: "custom", path: ["stock"], message: stockMessage });
  }
});
