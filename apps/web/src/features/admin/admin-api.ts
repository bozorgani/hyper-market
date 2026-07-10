import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateOrderStatusAction } from "@/app/actions/checkout";
import {
  revalidateCategories,
  revalidateCategory,
  revalidateProduct,
  revalidateProducts,
} from "@/app/actions/revalidate";
import { api } from "@/services/api";
import type { Category, Coupon, Order, PaginatedResponse, Payment, Product, ProductListResponse, User } from "@/types/domain";

export type ProductFormInput = {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images?: string[];
  categoryId: string;
  isActive?: boolean;
  brand?: string;
  sku?: string;
  unit?: string;
  weight?: number;
  tags?: string[];
};

export type ProductImageUploadResponse = {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
};

export type AdminPaymentListItem = Payment & {
  order: { _id: string; totalPrice: number } | null;
};

export function useAdminProducts(page = 1, isActive?: boolean, limit = 100) {
  return useQuery({
    queryKey: ["admin", "products", page, isActive, limit],
    queryFn: async () =>
      (await api.get<ProductListResponse>("/admin/products", { params: { page, limit, isActive } })).data,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ["admin", "product", id],
    queryFn: async () => (await api.get<Product>(`/admin/products/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductFormInput) => (await api.post<Product>("/admin/products", input)).data,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      // Next.js cache tag invalidation – Issue #18
      try {
        await revalidateProducts();
      } catch {}
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProductFormInput>) => (await api.put<Product>(`/admin/products/${id}`, input)).data,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "product", id] });
      // Revalidate Next.js cache tags
      try {
        await revalidateProduct(id);
      } catch {}
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      return (await api.post<ProductImageUploadResponse>("/admin/products/images/upload", formData)).data;
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<Product>(`/admin/products/${id}`)).data,
    onSuccess: async (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      try {
        await revalidateProduct(id);
        await revalidateProducts();
      } catch {}
    },
  });
}

export type CategoryFormInput = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export function useAdminCategories(page?: number, limit?: number, search?: string) {
  return useQuery({
    queryKey: ["admin", "categories", page, limit, search],
    queryFn: async () => {
      if (page || limit || search) {
        return (await api.get<PaginatedResponse<Category>>("/admin/categories", { params: { page, limit, search } })).data;
      }
      const items = (await api.get<Category[]>("/admin/categories")).data;
      return { items, total: items.length, page: 1, limit: items.length || 1, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryFormInput) =>
      (await api.post<Category>("/admin/categories", input)).data,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      try {
        await revalidateCategories();
      } catch {}
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CategoryFormInput }) =>
      (await api.put<Category>(`/admin/categories/${id}`, input)).data,
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      try {
        await revalidateCategory(variables.id);
        await revalidateCategories();
      } catch {}
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<Category>(`/admin/categories/${id}`)).data,
    onSuccess: async (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      try {
        await revalidateCategory(id);
        await revalidateCategories();
      } catch {}
    },
  });
}

export function useAdminOrders(page?: number, status?: string, limit?: number, search?: string) {
  return useQuery({
    queryKey: ["admin", "orders", page, status, limit, search],
    queryFn: async () => {
      if (page || limit || status || search) {
        return (await api.get<PaginatedResponse<Order>>("/orders", { params: { page, limit, status, search } })).data;
      }
      const items = (await api.get<Order[]>("/orders")).data;
      return { items, total: items.length, page: 1, limit: items.length || 1, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrderStatusAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useAdminPayment(orderId: string) {
  return useQuery({
    queryKey: ["admin", "payment", orderId],
    queryFn: async () => (await api.get<Payment>(`/payments/${orderId}`)).data,
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useAdminPayments(page = 1, status?: string, search?: string, limit = 10) {
  return useQuery({
    queryKey: ["admin", "payments", page, status, search, limit],
    queryFn: async () => (
      await api.get<PaginatedResponse<AdminPaymentListItem>>("/payments/admin", {
        params: { page, limit, status, search },
      })
    ).data,
    staleTime: 30_000,
  });
}

/** Fetch a single admin order by id (replaces loading the whole list + .find). */
export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useAdminAnalyticsDashboard() {
  return useQuery({
    queryKey: ["admin", "analytics", "dashboard"],
    queryFn: async () => (await api.get("/analytics/dashboard")).data,
  });
}

export function useAdminUsers(page?: number, role?: string, accountStatus?: string, limit?: number, search?: string) {
  return useQuery({
    queryKey: ["admin", "users", page, role, accountStatus, limit, search],
    queryFn: async () => {
      if (page || limit || role || accountStatus || search) {
        return (await api.get<PaginatedResponse<User>>("/users", { params: { page, limit, role, accountStatus, search } })).data;
      }
      const items = (await api.get<User[]>("/users")).data;
      return { items, total: items.length, page: 1, limit: items.length || 1, meta: { totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
    },
    retry: false,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ["admin", "user", id],
    queryFn: async () => (await api.get<User>(`/users/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch<User>(`/users/${id}/block`)).data,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch<User>(`/users/${id}/unblock`)).data,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] });
    },
  });
}

// ── Permissions / Roles ─────────────────────────────────────────────────

export type PermissionMap = Record<string, string[]>;

export type GrantPermissionInput = {
  role: string;
  permissionName: string;
  resource: string;
  action: string;
};

export type RevokePermissionInput = {
  role: string;
  permissionName: string;
};

export function usePermissionsMap() {
  return useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: async () => (await api.get<PermissionMap>("/permissions")).data,
    staleTime: 30_000,
  });
}

export function useRolePermissions(role: string) {
  return useQuery({
    queryKey: ["admin", "permissions", role],
    queryFn: async () => (await api.get<{ role: string; permissions: string[] }>(`/permissions/${role}`)).data,
    enabled: Boolean(role),
  });
}

export function useGrantPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GrantPermissionInput) =>
      (await api.post("/permissions/grant", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RevokePermissionInput) =>
      (await api.post("/permissions/revoke", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
  });
}

export function useSeedPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/permissions/seed")).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    },
  });
}


// ── Coupons ────────────────────────────────────────────────────────────────

export type CouponFormInput = {
  code: string;
  percent: number;
  active?: boolean;
  minSubtotal?: number;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
};

export function useAdminCoupons(page = 1, active?: boolean, limit = 20) {
  return useQuery({
    queryKey: ["admin", "coupons", page, active, limit],
    queryFn: async () =>
      (await api.get<PaginatedResponse<Coupon>>("/admin/coupons", { params: { page, limit, active } })).data,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CouponFormInput) => (await api.post<Coupon>("/admin/coupons", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CouponFormInput }) =>
      (await api.put<Coupon>(`/admin/coupons/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<Coupon>(`/admin/coupons/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useCouponAnalytics() {
  return useQuery({
    queryKey: ["admin", "coupons", "analytics"],
    queryFn: async () => (await api.get("/admin/coupons/analytics")).data,
  });
}
