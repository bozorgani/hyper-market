import { useMutation } from "@tanstack/react-query";
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
