import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { InventoryRow } from '../types/api';

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => (await api.get<InventoryRow[]>('/inventory')).data,
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory', 'valuation'],
    queryFn: async () =>
      (await api.get<{ totalValue: string; batchCount: number }>('/inventory/valuation')).data,
  });
}
