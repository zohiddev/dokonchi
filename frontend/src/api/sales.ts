import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Paginated, PaymentType, Sale, SalePreviewResult } from '../types/api';

export interface SalesFilter {
  paymentType?: PaymentType;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

export function useSales(filter: SalesFilter = {}) {
  return useQuery({
    queryKey: ['sales', filter],
    queryFn: async () => (await api.get<Paginated<Sale>>('/sales', { params: filter })).data,
  });
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => (await api.get<Sale>(`/sales/${id}`)).data,
    enabled: id !== null,
  });
}

export interface CreateSaleItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalePayload {
  paymentType: PaymentType;
  customerId?: number;
  notes?: string;
  items: CreateSaleItemInput[];
}

export function useSalePreview() {
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) =>
      (await api.post<SalePreviewResult>('/sales/preview', payload)).data,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) =>
      (await api.post<Sale>('/sales', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['cash'] }); // NAQD/KARTA sotuv → kassa kirimi
    },
  });
}
