import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis.js';
import { EmailProcessingService } from '../services/emailProcessingService.js';
import { EmailQueue, EmailJobData, EMAIL_QUEUE_NAME } from '../queue/queue.js';
import { EmailSenderService } from '../services/emailSenderService.js';
import { logger } from '../utils/logger.js';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');

export class EmailWorker {
  private static instance: Worker<EmailJobData>;

  static getInstance(): Worker<EmailJobData> {
    if (!EmailWorker.instance) {
      EmailWorker.instance = new Worker<EmailJobData>(
        EMAIL_QUEUE_NAME,
        async (job: Job<EmailJobData>) => {
          const jobData = job.data;
          
          logger.info('Job received', {
            jobId: job.id,
            emailJobId: jobData.emailJobId,
            recipient: jobData.recipient,
            scheduledAt: jobData.scheduledAt,
          });

          await EmailProcessingService.processJob(jobData);

          logger.info('Job completed', {
            jobId: job.id,
            emailJobId: jobData.emailJobId,
          });
        },
        {
          connection: redis,
          concurrency: WORKER_CONCURRENCY,
        }
      );

      EmailWorker.instance.on('completed', (job) => {
        logger.info('Worker: Job completed', { jobId: job.id });
      });

      EmailWorker.instance.on('failed', (job, error) => {
        logger.error('Worker: Job failed', {
          jobId: job?.id,
          error: error.message,
        });
      });

      EmailWorker.instance.on('error', (error) => {
        logger.error('Worker: Error', { error: error.message });
      });

      logger.info('EmailWorker initialized', { concurrency: WORKER_CONCURRENCY });
    }

    return EmailWorker.instance;
  }

  static async close(): Promise<void> {
    if (EmailWorker.instance) {
      logger.info('Closing EmailWorker...');
      await EmailWorker.instance.close();
      EmailWorker.instance = null as any;
      logger.info('EmailWorker closed');
    }
  }
}

export async function startWorker(): Promise<void> {
  try {
    await EmailSenderService.initialize();
    EmailWorker.getInstance();
    logger.info('Worker started successfully');
  } catch (error) {
    logger.error('Failed to start worker', { error });
    throw error;
  }
}

export async function gracefulShutdown(): Promise<void> {
  logger.info('Initiating graceful shutdown...');
  
  try {
    await EmailWorker.close();
    await EmailSenderService.close();
    await EmailQueue.close();
    await redis.quit();
    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
  }
}

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});
