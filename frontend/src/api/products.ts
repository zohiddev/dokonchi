import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Category, Product, Unit } from '../types/api';

export interface ProductsFilter {
  categoryId?: number;
  q?: string;
  isActive?: boolean;
}

export function useProducts(filter: ProductsFilter = {}) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: async () =>
      (
        await api.get<Product[]>('/products', {
          params: filter,
        })
      ).data,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  });
}

export interface CreateProductPayload {
  name: string;
  categoryId: number;
  baseUnit: Unit;
  packSize?: number | null;
  packUnit?: string | null;
  barcode?: string | null;
  defaultSalePrice?: number | null;
  packSalePrice?: number | null;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) =>
      (await api.post<Product>('/products', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: CreateProductPayload & { id: number }) =>
      (await api.patch<Product>(`/products/${id}`, rest)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete<Product>(`/products/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
