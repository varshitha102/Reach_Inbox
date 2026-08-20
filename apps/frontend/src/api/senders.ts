import { api } from '../lib/api';
import { Sender } from '../types';

export const sendersApi = {
  getDefault: () => 
    api.get<{ email: string; name: string }>('/api/senders/default'),
  
  create: (data: { email: string; name?: string }) => 
    api.post<Sender>('/api/senders', data),
  
  list: () => 
    api.get<Sender[]>('/api/senders'),
  
  getById: (id: string) => 
    api.get<Sender>(`/api/senders/${id}`),
  
  update: (id: string, data: { status?: 'ACTIVE' | 'INACTIVE'; name?: string }) => 
    api.put<Sender>(`/api/senders/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/api/senders/${id}`),
};
