import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { DeliveryAddress, DeliveryWindow } from "@/types/domain";

export type ShippingMethod = "standard" | "express";

export type ShippingQuote = {
  method: ShippingMethod;
  deliveryFee: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number;
  capacity: number;
  province: string;
  city: string;
  timeSlot: string;
  deliveryDate: string;
};

export function useShippingQuote(input: {
  address: DeliveryAddress;
  deliveryWindow: DeliveryWindow;
  method?: ShippingMethod;
  couponCode?: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "shipping",
      "quote",
      input.address.province,
      input.address.city,
      input.deliveryWindow.date,
      input.deliveryWindow.timeSlot,
      input.method ?? "standard",
      input.couponCode ?? null,
    ],
    queryFn: async () =>
      (await api.post<ShippingQuote>("/shipping/quote", {
        address: {
          province: input.address.province,
          city: input.address.city,
        },
        deliveryWindow: {
          date: `${input.deliveryWindow.date}T00:00:00.000Z`,
          timeSlot: input.deliveryWindow.timeSlot,
        },
        method: input.method ?? "standard",
        ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      })).data,
    enabled: input.enabled,
    retry: false,
  });
}
