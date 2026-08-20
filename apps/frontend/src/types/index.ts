export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  senderId: string | null;
  name: string;
  subject: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
  _count?: {
    emailJobs: number;
  };
}

export interface Attachment {
  id: string;
  emailJobId: string;
  filename: string;
  contentType: string | null;
  size: number | null;
  url: string | null;
  createdAt: string;
}

export interface EmailJob {
  id: string;
  campaignId: string | null;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  idempotencyKey: string;
  delayMs: number;
  createdAt: string;
  updatedAt: string;
  campaign?: Campaign;
  sender?: Sender;
  attachments?: Attachment[];
}

export interface EmailJobStats {
  total: number;
  sent: number;
  failed: number;
  scheduled: number;
}

export interface CreateEmailJobInput {
  campaignId?: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delayMs?: number;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    size?: number;
    url?: string;
  }>;
}

export interface BulkCreateEmailJobsInput {
  campaignId?: string;
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayMs?: number;
  minDelayBetweenEmails?: number;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    size?: number;
    url?: string;
  }>;
}
