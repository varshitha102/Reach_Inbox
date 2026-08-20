import { api } from '../lib/api';
import { User } from '../types';

export const authApi = {
  getSession: () => 
    api.get<User>('/api/auth/session'),
  
  logout: () => 
    api.post<{ message: string }>('/api/auth/logout'),
  
  googleLogin: () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  },
};
