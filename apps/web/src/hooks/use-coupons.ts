import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";

export type CouponValidationResult = {
  code: string;
  percent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
};

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (code: string) =>
      (await api.post<CouponValidationResult>("/coupons/validate", { code })).data,
  });
}
