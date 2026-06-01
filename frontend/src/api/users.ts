import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { Role, User } from '../types/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });
}

export interface CreateUserPayload {
  name: string;
  phone: string;
  password: string;
  role?: Role;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) =>
      (await api.post<User>('/users', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export interface UpdateUserPayload {
  id: number;
  name?: string;
  phone?: string;
  password?: string;
  role?: Role;
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateUserPayload) =>
      (await api.patch<User>(`/users/${id}`, rest)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
