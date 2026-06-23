import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Category, Order, Payment, Product, ProductListResponse, User } from "@/types/domain";

export type ProductFormInput = {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images?: string[];
  categoryId: string;
  isActive?: boolean;
};

export function useAdminProducts(page = 1) {
  return useQuery({
    queryKey: ["admin", "products", page],
    queryFn: async () => (await api.get<ProductListResponse>("/products", { params: { page, limit: 100 } })).data,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ["admin", "product", id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductFormInput) => (await api.post<Product>("/products", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProductFormInput>) => (await api.put<Product>(`/products/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "product", id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<Product>(`/products/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => (await api.get<Order[]>("/orders")).data,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) =>
      (await api.patch<Order>(`/orders/${orderId}/status`, { status })).data,
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

export function useAdminAnalyticsDashboard() {
  return useQuery({
    queryKey: ["admin", "analytics", "dashboard"],
    queryFn: async () => (await api.get("/analytics/dashboard")).data,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
    retry: false,
  });
}
