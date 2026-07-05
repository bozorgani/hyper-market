import { useMutation, useQuery } from "@tanstack/react-query";
import { validateCouponAction } from "@/app/actions/checkout";

export type CouponValidationResult = {
  code: string;
  percent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
};

export function useValidateCoupon() {
  return useMutation({
    mutationFn: validateCouponAction,
  });
}


export function useAvailableCoupons() {
  return useQuery({
    queryKey: ["coupons", "available"],
    queryFn: async () => (await import("@/services/api")).api.get<CouponValidationResult[]>("/coupons/available").then((res) => res.data),
    retry: false,
  });
}
