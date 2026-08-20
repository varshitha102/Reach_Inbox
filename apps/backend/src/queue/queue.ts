import { Queue, Job } from 'bullmq';
import { redis } from '../utils/redis.js';

export const EMAIL_QUEUE_NAME = 'email-send';

export interface EmailJobData {
  emailJobId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  delayMs: number;
  hourlyLimit: number;
  dailyLimit: number;
  idempotencyKey: string;
  priority?: number;
}

class EmailQueueClass {
  private static instance: Queue<EmailJobData>;

  static getInstance(): Queue<EmailJobData> {
    if (!EmailQueueClass.instance) {
      EmailQueueClass.instance = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
        connection: redis,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 1000,
            age: 3600 * 24,
          },
          removeOnFail: {
            count: 5000,
            age: 3600 * 24 * 7,
          },
        },
      });
    }
    return EmailQueueClass.instance;
  }

  static async addJob(data: EmailJobData, delay: number = 0): Promise<Job<EmailJobData>> {
    const queue = EmailQueueClass.getInstance();
    
    // Use delay for timing - BullMQ will make job available at scheduled time
    // Priority is only used to break ties when multiple jobs become available at same time
    // Jobs with earlier scheduled times will have smaller delays, so they'll be processed first
    
    return queue.add(
      EMAIL_QUEUE_NAME,
      data,
      {
        jobId: data.idempotencyKey,
        delay,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );
  }

  static async close(): Promise<void> {
    if (EmailQueueClass.instance) {
      await EmailQueueClass.instance.close();
      EmailQueueClass.instance = null as any;
    }
  }
}

export const EmailQueue = EmailQueueClass;
