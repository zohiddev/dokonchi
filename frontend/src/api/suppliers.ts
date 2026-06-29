import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Product, Supplier } from '../types/api';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  });
}

export function useSupplier(id: number | null) {
  return useQuery({
    queryKey: ['suppliers', id, 'detail'],
    queryFn: async () => (await api.get<Supplier>(`/suppliers/${id}`)).data,
    enabled: id !== null,
  });
}

export interface SupplierBalance {
  supplierId: number;
  batchCount: number;
  totalPurchased: string; // jami olingan tovar (tannarx)
  totalPaid: string; // jami to'langan
  balance: string; // qarz
  soldCostValue: string; // sotilgan qism (tannarx)
  remainingCostValue: string; // omborda qolgan (tannarx)
}

export function useSupplierBalance(id: number | null) {
  return useQuery({
    queryKey: ['suppliers', id, 'balance'],
    queryFn: async () => (await api.get<SupplierBalance>(`/suppliers/${id}/balance`)).data,
    enabled: id !== null,
  });
}

export interface SupplierHistoryEntry {
  type: 'purchase' | 'payment';
  id: number;
  date: string;
  amount: string;
  notes?: string | null;
  runningBalance: string;
  // faqat 'purchase' uchun
  productName?: string;
  unit?: string;
  quantityReceived?: string;
  quantityRemaining?: string;
  costPricePerUnit?: string;
}

export function useSupplierHistory(id: number | null) {
  return useQuery({
    queryKey: ['suppliers', id, 'history'],
    queryFn: async () =>
      (await api.get<SupplierHistoryEntry[]>(`/suppliers/${id}/history`)).data,
    enabled: id !== null,
  });
}

// Ta'minotchi avval yetkazgan mahsulotlar (yetkazma modalida mahsulot select'ini filterlash uchun)
export function useSupplierProducts(id: number | null) {
  return useQuery({
    queryKey: ['suppliers', id, 'products'],
    queryFn: async () => (await api.get<Product[]>(`/suppliers/${id}/products`)).data,
    enabled: id !== null,
  });
}

export interface PaySupplierPayload {
  supplierId: number;
  amount: number;
  batchId?: number;
  notes?: string;
}

export function usePaySupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PaySupplierPayload) =>
      (await api.post('/suppliers/payments', payload)).data,
    // Ta'minotchi defteri kassadan alohida hisob — faqat ta'minotchi ma'lumotini yangilaymiz
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  notes?: string;
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) =>
      (await api.post<Supplier>('/suppliers', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: CreateSupplierPayload & { id: number }) =>
      (await api.patch<Supplier>(`/suppliers/${id}`, rest)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/suppliers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
