import { api } from '../lib/api';
import { EmailJob, EmailJobStats, CreateEmailJobInput, BulkCreateEmailJobsInput } from '../types';

interface EmailListResponse {
  emails: EmailJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CampaignGroup {
  campaignId: string;
  subject: string;
  count: number;
  scheduledAt: string;
}

export const emailJobsApi = {
  create: (data: CreateEmailJobInput) => 
    api.post<EmailJob>('/api/email-jobs', data),
  
  bulkCreate: (data: BulkCreateEmailJobsInput) => 
    api.post<EmailJob[]>('/api/email-jobs/bulk', data),
  
  list: (status?: string, page: number = 1) => 
    api.get<EmailListResponse>(`/api/email-jobs${status ? `?status=${status}` : ''}${page > 1 ? `&page=${page}` : ''}`),
  
  getById: (id: string) => 
    api.get<EmailJob>(`/api/email-jobs/${id}`),
  
  cancel: (id: string) => 
    api.post<EmailJob>(`/api/email-jobs/${id}/cancel`),
  
  search: (query: string) => 
    api.post<EmailJob[]>('/api/email-jobs/search', { query }),
  
  getStats: () => 
    api.get<EmailJobStats>('/api/email-jobs/stats'),
  
  deleteByCampaign: (campaignId: string) => 
    api.delete(`/api/email-jobs/campaign/${campaignId}`),
  
  listCampaigns: (status?: string) => 
    api.get<CampaignGroup[]>(`/api/email-jobs/campaigns${status ? `?status=${status}` : ''}`),
  
  deleteAllScheduled: () => 
    api.delete('/api/email-jobs/scheduled/all'),
};
