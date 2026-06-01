import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { LoginResponse } from '../types/api';

export function useLogin() {
  return useMutation({
    mutationFn: async (vars: { phone: string; password: string }) => {
      const res = await api.post<LoginResponse>('/auth/login', vars);
      return res.data;
    },
  });
}
