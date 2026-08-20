import { z } from 'zod';

export const createEmailJobSchema = z.object({
  campaignId: z.string().optional(),
  senderId: z.string().min(1, 'Sender ID is required'),
  recipient: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  scheduledAt: z.string().datetime(),
  delayMs: z.number().int().min(0).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().optional(),
        size: z.number().int().optional(),
        url: z.string().url().optional(),
      })
    )
    .optional(),
});

export const bulkCreateEmailJobsSchema = z.object({
  campaignId: z.string().optional(),
  senderId: z.string().min(1, 'Sender ID or email is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  scheduledAt: z.string().datetime().optional(),
  delayMs: z.number().int().min(0).optional(),
  minDelayBetweenEmails: z.number().int().min(0).optional(),
  hourlyLimit: z.number().int().min(0).optional(),
  dailyLimit: z.number().int().min(0).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().optional(),
        size: z.number().int().optional(),
        url: z.string().optional(),
      })
    )
    .optional(),
});

export const updateEmailJobSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'CANCELLED']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const searchEmailJobsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
});

export type CreateEmailJobInput = z.infer<typeof createEmailJobSchema>;
export type BulkCreateEmailJobsInput = z.infer<typeof bulkCreateEmailJobsSchema>;
export type UpdateEmailJobInput = z.infer<typeof updateEmailJobSchema>;
export type SearchEmailJobsInput = z.infer<typeof searchEmailJobsSchema>;
