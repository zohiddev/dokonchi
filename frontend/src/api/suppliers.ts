import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Supplier } from '../types/api';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  });
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  notes?: string;
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) =>
      (await api.post<Supplier>('/suppliers', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: CreateSupplierPayload & { id: number }) =>
      (await api.patch<Supplier>(`/suppliers/${id}`, rest)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/suppliers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
