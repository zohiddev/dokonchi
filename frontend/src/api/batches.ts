import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Batch } from '../types/api';

export interface BatchesFilter {
  productId?: number;
  weekLabel?: string;
  status?: 'active' | 'finished';
}

export function useBatches(filter: BatchesFilter = {}) {
  return useQuery({
    queryKey: ['batches', filter],
    queryFn: async () =>
      (await api.get<Batch[]>('/batches', { params: filter })).data,
  });
}

export function useBatchAttention() {
  return useQuery({
    queryKey: ['batches', 'attention'],
    queryFn: async () => (await api.get<Batch[]>('/batches/attention')).data,
  });
}

export interface CreateBatchPayload {
  productId: number;
  supplierId?: number;
  receivedDate: string; // YYYY-MM-DD
  quantityReceived: number;
  costPricePerUnit: number;
  salePricePerUnit?: number;
  amountPaid?: number; // shu partiya uchun darhol to'langan (ta'minotchi tanlangan bo'lsa)
  notes?: string;
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBatchPayload) =>
      (await api.post<Batch>('/batches', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] }); // ta'minotchi qarzi yangilanadi
      qc.invalidateQueries({ queryKey: ['cash'] }); // partiya xaridi → kassa chiqimi
    },
  });
}
