import { z } from 'zod';

export const createSenderSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export const updateSenderSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  name: z.string().optional(),
});

export type CreateSenderInput = z.infer<typeof createSenderSchema>;
export type UpdateSenderInput = z.infer<typeof updateSenderSchema>;
