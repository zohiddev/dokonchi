import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Delivery } from '../types/api';

export interface DeliveriesFilter {
  supplierId?: number;
}

export function useDeliveries(filter: DeliveriesFilter = {}) {
  return useQuery({
    queryKey: ['deliveries', filter],
    queryFn: async () =>
      (await api.get<Delivery[]>('/deliveries', { params: filter })).data,
  });
}

// Yetkazmadagi bitta mahsulot qatori (base yoki pachka rejimi)
export interface CreateDeliveryLinePayload {
  productId: number;
  // Base rejimi: quantityReceived + costPricePerUnit
  quantityReceived?: number;
  costPricePerUnit?: number;
  // Pachka rejimi: packQuantity + costPerPack (backend packSize orqali hisoblaydi)
  packQuantity?: number;
  costPerPack?: number;
  salePricePerUnit?: number;
  packSalePrice?: number; // shu mahsulot uchun butun-pachka narxi override
  notes?: string;
}

export interface CreateDeliveryPayload {
  supplierId?: number;
  receivedDate: string; // YYYY-MM-DD (ISO)
  amountPaid?: number; // butun yetkazma uchun darhol to'langan (ta'minotchi tanlangan bo'lsa)
  notes?: string;
  lines: CreateDeliveryLinePayload[];
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDeliveryPayload) =>
      (await api.post<Delivery>('/deliveries', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] }); // ta'minotchi qarzi yangilanadi
      qc.invalidateQueries({ queryKey: ['cash'] }); // yetkazma xaridi → kassa chiqimi
    },
  });
}
