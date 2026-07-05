import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Address } from "@/types/domain";

export type AddressInput = Omit<Address, "_id" | "userId" | "createdAt" | "updatedAt">;

export function useMyAddresses() {
  return useQuery({
    queryKey: ["addresses", "my"],
    queryFn: async () => (await api.get<Address[]>("/addresses/my")).data,
    retry: false,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddressInput) => (await api.post<Address>("/addresses", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses", "my"] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AddressInput }) =>
      (await api.put<Address>(`/addresses/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses", "my"] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<{ success: true }>(`/addresses/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses", "my"] }),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch<Address>(`/addresses/${id}/default`, {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses", "my"] }),
  });
}
