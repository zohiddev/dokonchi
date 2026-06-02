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

// ===== ANALITIKA =====

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';
export type TopProductMetric = 'quantity' | 'revenue' | 'profit';

export interface OverviewData {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  revenue: string;
  cost: string;
  profit: string;
  margin: string;
  salesCount: number;
  avgTicket: string;
  previousPeriod: { revenue: string; salesCount: number };
  revenueGrowth: string | null;
}

export interface TopProductRow {
  productId: number;
  name: string;
  unit: string;
  categoryName: string;
  quantity: string;
  revenue: string;
  cost: string;
  profit: string;
  margin: string;
  salesCount: number;
}

export interface TopCustomerRow {
  customerId: number;
  name: string;
  phone: string | null;
  revenue: string;
  cost: string;
  profit: string;
  salesCount: number;
  creditAmount: string;
}

export interface SlowMoverRow {
  productId: number;
  name: string;
  category: string;
  unit: string;
  totalRemaining: string;
  stockValue: string;
  oldestBatchAgeDays: number;
  lastSaleDate: string | null;
  lastSaleDays: number | null;
}

export interface CashflowDay {
  date: string;
  income: string;
  outflow: string;
  profit: string;
  net: string;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  total: string;
  count: number;
}

export interface SalesHeatmapData {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  matrix: HeatmapCell[];
}

export function useOverview(period: AnalyticsPeriod = 'month') {
  return useQuery({
    queryKey: ['reports', 'overview', period],
    queryFn: async () =>
      (await api.get<OverviewData>('/reports/overview', { params: { period } })).data,
  });
}

export function useTopProducts(
  period: AnalyticsPeriod = 'month',
  metric: TopProductMetric = 'profit',
  limit = 10,
) {
  return useQuery({
    queryKey: ['reports', 'top-products', period, metric, limit],
    queryFn: async () =>
      (await api.get<TopProductRow[]>('/reports/top-products', {
        params: { period, metric, limit },
      })).data,
  });
}

export function useTopCustomers(period: AnalyticsPeriod = 'month', limit = 10) {
  return useQuery({
    queryKey: ['reports', 'top-customers', period, limit],
    queryFn: async () =>
      (await api.get<TopCustomerRow[]>('/reports/top-customers', {
        params: { period, limit },
      })).data,
  });
}

export function useSlowMovers(days = 30) {
  return useQuery({
    queryKey: ['reports', 'slow-movers', days],
    queryFn: async () =>
      (await api.get<SlowMoverRow[]>('/reports/slow-movers', { params: { days } })).data,
  });
}

export function useCashflowTrend(days = 30) {
  return useQuery({
    queryKey: ['reports', 'cashflow-trend', days],
    queryFn: async () =>
      (await api.get<CashflowDay[]>('/reports/cashflow-trend', { params: { days } })).data,
  });
}

export function useSalesHeatmap(period: AnalyticsPeriod = 'month') {
  return useQuery({
    queryKey: ['reports', 'sales-heatmap', period],
    queryFn: async () =>
      (await api.get<SalesHeatmapData>('/reports/sales-heatmap', { params: { period } })).data,
  });
}
