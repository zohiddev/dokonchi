import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Expense } from '../types/api';

export function useExpenses(month?: string) {
  return useQuery({
    queryKey: ['expenses', month ?? 'all'],
    queryFn: async () =>
      (await api.get<Expense[]>('/expenses', { params: month ? { month } : undefined })).data,
  });
}

export interface CreateExpensePayload {
  expenseDate?: string;
  category: string;
  amount: number;
  notes?: string;
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) =>
      (await api.post<Expense>('/expenses', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
