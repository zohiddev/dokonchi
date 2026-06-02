import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export type CashTransactionKind =
  | 'sale-cash'
  | 'sale-card'
  | 'debt-payment'
  | 'expense'
  | 'batch-purchase';

export interface CashTransaction {
  time: string;
  kind: CashTransactionKind;
  direction: 'in' | 'out';
  amount: string;
  description: string;
  refId: number;
}

export interface CashBucket {
  amount: string;
  count: number;
}

export interface CashDailyData {
  date: string;
  income: {
    naqd: CashBucket;
    karta: CashBucket;
    debtPayments: CashBucket;
    total: string;
  };
  outflow: {
    expenses: CashBucket;
    batchPurchases: CashBucket;
    total: string;
  };
  netCash: string;
  creditSales: CashBucket;
  transactions: CashTransaction[];
}

export function useDailyCash(date?: string) {
  return useQuery({
    queryKey: ['cash', 'daily', date ?? 'today'],
    queryFn: async () =>
      (await api.get<CashDailyData>('/cash/daily', {
        params: date ? { date } : undefined,
      })).data,
  });
}
