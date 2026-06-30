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
      qc.invalidateQueries({ queryKey: ['cash'] }); // qarz to'lovi = kassa kirimi
    },
  });
}

export interface AddDebtChargePayload {
  customerId: number;
  amount: number;
  chargeDate?: string; // YYYY-MM-DD — berilmasa bugun
  notes?: string;
}

export function useAddDebtCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddDebtChargePayload) =>
      (await api.post('/debts/charges', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      // Eski qarz pul harakati emas — kassa/hisobotga tegmaydi
    },
  });
}

export interface DebtHistoryItem {
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface DebtHistoryEntry {
  type: 'sale' | 'payment' | 'charge';
  /** Sotuv yozuvlari uchun to'lov turi */
  paymentType?: 'NAQD' | 'KARTA' | 'NASIYA';
  /** Boshlang'ich (appdan oldingi) eski qarz yozug'i — xarid statistikasiga kirmaydi */
  isOpening?: boolean;
  id: number;
  date: string;
  amount: string;
  summary: string;
  notes?: string | null;
  runningBalance: string;
  totalCost?: string;
  profit?: string;
  items?: DebtHistoryItem[];
}

export function useCustomerHistory(id: number | null) {
  return useQuery({
    queryKey: ['debts', 'customer-history', id],
    queryFn: async () =>
      (await api.get<DebtHistoryEntry[]>(`/debts/customers/${id}/history`)).data,
    enabled: id !== null,
  });
}
