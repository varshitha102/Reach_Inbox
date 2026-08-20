import { api } from '../lib/api';
import { Campaign } from '../types';

export const campaignsApi = {
  create: (data: { senderId?: string; name: string; subject: string }) => 
    api.post<Campaign>('/api/campaigns', data),
  
  list: (status?: string) => 
    api.get<Campaign[]>(`/api/campaigns${status ? `?status=${status}` : ''}`),
  
  getById: (id: string) => 
    api.get<Campaign>(`/api/campaigns/${id}`),
  
  update: (id: string, data: { status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'; name?: string; subject?: string }) => 
    api.put<Campaign>(`/api/campaigns/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/api/campaigns/${id}`),
};
