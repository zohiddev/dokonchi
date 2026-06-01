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
