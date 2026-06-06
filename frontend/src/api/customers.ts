import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Customer, CustomerBalance } from '../types/api';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get<Customer[]>('/customers')).data,
  });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['customers', id, 'detail'],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
    enabled: id !== null,
  });
}

export function useCustomerBalance(id: number | null) {
  return useQuery({
    queryKey: ['customers', id, 'balance'],
    queryFn: async () =>
      (await api.get<CustomerBalance>(`/customers/${id}/balance`)).data,
    enabled: id !== null,
  });
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  notes?: string;
  openingDebt?: number;
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload) =>
      (await api.post<Customer>('/customers', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: CreateCustomerPayload & { id: number }) =>
      (await api.patch<Customer>(`/customers/${id}`, rest)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/customers/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}
