import prisma from '../database/client.js';
import { EmailSenderService } from './emailSenderService.js';
import { RateLimiterService } from './rateLimiterService.js';
import { DelayCoordinator } from './delayCoordinator.js';
import { EmailQueue, EmailJobData } from '../queue/queue.js';
import { logger } from '../utils/logger.js';

export class EmailProcessingService {
  static async processJob(jobData: EmailJobData): Promise<void> {
    const { emailJobId, senderId, recipient, subject, body, delayMs, hourlyLimit, idempotencyKey } = jobData;

    logger.info('Processing email job', { emailJobId, recipient, idempotencyKey });

    try {
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { sender: true },
      });

      if (!emailJob) {
        logger.error('Email job not found', { emailJobId });
        throw new Error('Email job not found');
      }

      if (emailJob.status === 'SENT') {
        logger.info('Email already sent, skipping', { emailJobId, idempotencyKey });
        return;
      }

      if (emailJob.status === 'PROCESSING') {
        logger.warn('Email job already processing, possible duplicate', { emailJobId, idempotencyKey });
        return;
      }

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      logger.info('Transitioned to PROCESSING', { emailJobId, attempts: emailJob.attempts + 1 });

      await DelayCoordinator.waitForDelay(senderId, delayMs);

      const rateLimitResult = await RateLimiterService.checkRateLimit(senderId, hourlyLimit);

      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit reached, rescheduling', {
          senderId,
          hourlyLimit,
          resetAt: rateLimitResult.resetAt,
          emailJobId,
        });

        const delayUntilReset = (rateLimitResult.resetAt * 1000) - Date.now();

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SCHEDULED',
            scheduledAt: new Date(rateLimitResult.resetAt * 1000),
          },
        });

        await EmailQueue.addJob(jobData, Math.max(0, delayUntilReset));

        return;
      }

      const sendResult = await EmailSenderService.sendEmail(
        recipient,
        subject,
        body,
        emailJob.sender.email
      );

      if (sendResult.success) {
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        logger.info('Email sent successfully', {
          emailJobId,
          messageId: sendResult.messageId,
          recipient,
        });
      } else {
        const shouldRetry = this.shouldRetry(sendResult.errorType!, emailJob.attempts + 1);

        if (shouldRetry) {
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'SCHEDULED',
              lastError: sendResult.error,
              failedAt: new Date(),
            },
          });

          logger.warn('Email send failed, will retry', {
            emailJobId,
            error: sendResult.error,
            errorType: sendResult.errorType,
            attempts: emailJob.attempts + 1,
          });

          throw new Error(sendResult.error);
        } else {
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'FAILED',
              lastError: sendResult.error,
              failedAt: new Date(),
            },
          });

          logger.error('Email send failed permanently', {
            emailJobId,
            error: sendResult.error,
            errorType: sendResult.errorType,
            attempts: emailJob.attempts + 1,
          });

          throw new Error(sendResult.error);
        }
      }
    } catch (error: any) {
      logger.error('Email processing failed', {
        emailJobId,
        error: error.message,
      });

      if (error.message !== 'Email job not found') {
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            lastError: error.message,
            failedAt: new Date(),
          },
        }).catch(() => {});
      }

      throw error;
    }
  }

  private static shouldRetry(errorType: string, attempts: number): boolean {
    if (errorType === 'permanent') {
      return false;
    }

    if (errorType === 'temporary' && attempts < 5) {
      return true;
    }

    if (errorType === 'infrastructure' && attempts < 3) {
      return true;
    }

    return false;
  }
}
