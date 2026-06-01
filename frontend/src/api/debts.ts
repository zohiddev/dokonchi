import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { DebtCustomer } from '../types/api';

export function useDebts() {
  return useQuery({
    queryKey: ['debts'],
    queryFn: async () => (await api.get<DebtCustomer[]>('/debts')).data,
  });
}

export function useDebtsSummary() {
  return useQuery({
    queryKey: ['debts', 'summary'],
    queryFn: async () =>
      (await api.get<{ totalDebt: string; debtorCount: number }>('/debts/summary')).data,
  });
}

export interface PayDebtPayload {
  customerId: number;
  amount: number;
  notes?: string;
}

export function usePayDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PayDebtPayload) =>
      (await api.post('/debts/payments', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export interface DebtHistoryEntry {
  type: 'credit' | 'payment';
  id: number;
  date: string;
  amount: string;
  summary: string;
}

export function useCustomerHistory(id: number | null) {
  return useQuery({
    queryKey: ['debts', 'customer-history', id],
    queryFn: async () =>
      (await api.get<DebtHistoryEntry[]>(`/debts/customers/${id}/history`)).data,
    enabled: id !== null,
  });
}
