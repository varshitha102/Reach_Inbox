import { Queue, Job } from 'bullmq';
import { redis } from '../utils/redis.js';
import prisma from '../database/client.js';

export interface EmailJobData {
  emailJobId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export const emailQueue = new Queue<EmailJobData>('email-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 3600,
    },
    removeOnFail: {
      count: 5000,
      age: 86400,
    },
  },
});

export async function scheduleEmailJob(
  emailJobId: string,
  data: EmailJobData,
  scheduledAt: Date
): Promise<Job<EmailJobData>> {
  const delay = scheduledAt.getTime() - Date.now();
  
  const job = await emailQueue.add('send-email', data, {
    jobId: emailJobId,
    delay: delay > 0 ? delay : 0,
    attempts: 3,
  });

  // Update email job status to SCHEDULED
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: 'SCHEDULED' },
  });

  return job;
}

export async function cancelEmailJob(emailJobId: string): Promise<void> {
  const job = await emailQueue.getJob(emailJobId);
  if (job) {
    await job.remove();
  }
  
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: 'CANCELLED' },
  });
}
