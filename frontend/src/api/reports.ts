import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type {
  DashboardData,
  MonthlySummaryData,
  ProfitByCategoryRow,
  TimeseriesPoint,
} from '../types/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/reports/dashboard')).data,
  });
}

export function useSalesTimeseries(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['reports', 'sales-timeseries', period],
    queryFn: async () =>
      (await api.get<TimeseriesPoint[]>('/reports/sales-timeseries', { params: { period } })).data,
  });
}

export function useProfitByCategory() {
  return useQuery({
    queryKey: ['reports', 'profit-by-category'],
    queryFn: async () =>
      (await api.get<ProfitByCategoryRow[]>('/reports/profit-by-category')).data,
  });
}

export function useMonthlySummary(month?: string) {
  return useQuery({
    queryKey: ['reports', 'monthly-summary', month ?? 'current'],
    queryFn: async () =>
      (await api.get<MonthlySummaryData>('/reports/monthly-summary', {
        params: month ? { month } : undefined,
      })).data,
  });
}
