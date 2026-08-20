import prisma from '../database/client.js';
import { EmailQueue, EmailJobData } from '../queue/queue.js';
import { logger } from '../utils/logger.js';
import { randomBytes } from 'crypto';

export class EmailJobService {
  static async createEmailJob(
    userId: string,
    data: any
  ) {
    const idempotencyKey = `email:${userId}:${randomBytes(16).toString('hex')}`;
    
    let senderId = data.senderId;
    let senderEmail: string;

    // Handle default sender from env
    if (senderId === 'default') {
      senderEmail = process.env.SMTP_FROM || '';
      if (!senderEmail) {
        throw new Error('Default sender email not configured in SMTP_FROM');
      }
      // Create or get default sender in database
      const existingSender = await prisma.sender.findFirst({
        where: { userId, email: senderEmail },
      });
      if (existingSender) {
        senderId = existingSender.id;
      } else {
        const newSender = await prisma.sender.create({
          data: {
            userId,
            email: senderEmail,
            name: process.env.DEFAULT_SENDER_NAME || 'Default Sender',
            status: 'ACTIVE',
          },
        });
        senderId = newSender.id;
      }
    }
    
    logger.info('Creating email job', {
      recipient: data.recipient,
      subject: data.subject,
      hasAttachments: !!data.attachments,
      attachmentsCount: data.attachments?.length || 0,
      attachmentsData: data.attachments,
    });

    const emailJob = await prisma.emailJob.create({
      data: {
        senderId,
        recipient: data.recipient,
        subject: data.subject,
        body: data.body,
        scheduledAt: new Date(data.scheduledAt),
        delayMs: data.delayMs || 0,
        idempotencyKey,
        status: 'SCHEDULED',
        campaignId: data.campaignId,
        ...(data.attachments && {
          attachments: {
            create: data.attachments.map((att: any) => ({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size,
              url: att.url,
            })),
          },
        }),
      },
      include: { sender: true, attachments: true },
    });

    logger.info('Email job created with attachments', {
      emailJobId: emailJob.id,
      attachmentsCreated: emailJob.attachments?.length || 0,
      attachments: emailJob.attachments,
    });

    const delay = Math.max(0, emailJob.scheduledAt.getTime() - Date.now());

    const jobData: EmailJobData = {
      emailJobId: emailJob.id,
      userId,
      senderId: emailJob.senderId,
      recipient: emailJob.recipient,
      subject: emailJob.subject,
      body: emailJob.body,
      scheduledAt: emailJob.scheduledAt,
      delayMs: emailJob.delayMs,
      hourlyLimit: data.hourlyLimit || 100,
      dailyLimit: data.dailyLimit || 1000,
      idempotencyKey,
    };

    await EmailQueue.addJob(jobData, delay);

    logger.info('Email job created and scheduled', {
      emailJobId: emailJob.id,
      recipient: emailJob.recipient,
      scheduledAt: emailJob.scheduledAt,
      delay,
    });

    return emailJob;
  }

  static async bulkCreateEmailJobs(
    userId: string,
    data: any
  ) {
    const baseScheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : new Date();
    const minDelay = data.minDelayBetweenEmails || 2000;
    const hourlyLimit = data.hourlyLimit || 1000;
    const dailyLimit = data.dailyLimit || 10000;
    
    let senderId = data.senderId;
    let senderEmail: string;

    // Handle default sender from env
    if (senderId === 'default') {
      senderEmail = process.env.SMTP_FROM || '';
      if (!senderEmail) {
        throw new Error('Default sender email not configured in SMTP_FROM');
      }
      // Create or get sender from database
      const sender = await prisma.sender.findFirst({
        where: { email: senderEmail, userId },
      });
      if (sender) {
        senderId = sender.id;
      } else {
        const newSender = await prisma.sender.create({
          data: {
            email: senderEmail,
            name: process.env.DEFAULT_SENDER_NAME || 'Default Sender',
            userId,
          },
        });
        senderId = newSender.id;
      }
    }

    // Generate campaign ID if not provided
    const campaignId = data.campaignId || `campaign_${Date.now()}_${randomBytes(8).toString('hex')}`;

    const emailJobs = [];
    const jobsToSchedule: { jobData: EmailJobData; delay: number }[] = [];
    
    for (let i = 0; i < data.recipients.length; i++) {
      const delayMs = i * minDelay;
      const scheduledAt = new Date(baseScheduledAt.getTime() + delayMs);
      const idempotencyKey = `email:${userId}:${randomBytes(16).toString('hex')}`;
      
      logger.info('Creating bulk email jobs', {
        recipientsCount: data.recipients.length,
        subject: data.subject,
        hasAttachments: !!data.attachments,
        attachmentsCount: data.attachments?.length || 0,
        attachmentsData: data.attachments,
      });

      const emailJob = await prisma.emailJob.create({
        data: {
          senderId,
          recipient: data.recipients[i],
          subject: data.subject,
          body: data.body,
          scheduledAt,
          delayMs,
          idempotencyKey,
          status: 'SCHEDULED',
          campaignId,
          ...(data.attachments && {
            attachments: {
              create: data.attachments.map((att: any) => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                url: att.url,
              })),
            },
          }),
        },
        include: { sender: true, attachments: true },
      });

      logger.info(`Email job ${i + 1} created`, {
        emailJobId: emailJob.id,
        recipient: emailJob.recipient,
        attachmentsCreated: emailJob.attachments?.length || 0,
        attachments: emailJob.attachments,
      });

      const jobData: EmailJobData = {
        emailJobId: emailJob.id,
        userId,
        senderId: emailJob.senderId,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        body: emailJob.body,
        scheduledAt: emailJob.scheduledAt,
        delayMs: emailJob.delayMs,
        hourlyLimit: hourlyLimit,
        dailyLimit: dailyLimit,
        idempotencyKey,
      };

      const delay = Math.max(0, scheduledAt.getTime() - Date.now());
      jobsToSchedule.push({ jobData, delay });
      emailJobs.push(emailJob);
    }

    for (const { jobData, delay } of jobsToSchedule) {
      await EmailQueue.addJob(jobData, delay);
    }

    logger.info('Bulk email jobs created and scheduled', {
      count: emailJobs.length,
      campaignId: data.campaignId,
    });

    return emailJobs;
  }

  static async getEmailJob(id: string, userId: string) {
    return prisma.emailJob.findFirst({
      where: {
        id,
        sender: { userId },
      },
      include: {
        sender: true,
        attachments: true,
      },
    });
  }

  static async getUserEmailJobs(userId: string, status?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      sender: { userId },
    };
    
    if (status) {
      where.status = status;
    }

    logger.info('getUserEmailJobs query', { userId, status, page, limit, where });

    try {
      const [emails, total] = await Promise.all([
        prisma.emailJob.findMany({
          where,
          include: {
            sender: true,
          },
          orderBy: { scheduledAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.emailJob.count({ where }),
      ]);

      logger.info('getUserEmailJobs result', { count: emails.length, total });

      return {
        emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('getUserEmailJobs error', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  static async cancelEmailJob(id: string, userId: string) {
    const emailJob = await prisma.emailJob.findFirst({
      where: {
        id,
        sender: { userId },
      },
    });

    if (!emailJob) {
      throw new Error('Email job not found');
    }

    if (emailJob.status === 'SENT') {
      throw new Error('Cannot cancel sent email');
    }

    await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    logger.info('Email job cancelled', { emailJobId: id });

    return emailJob;
  }

  static async searchEmailJobs(userId: string, query: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      sender: { userId },
      OR: [
        { recipient: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        include: {
          sender: true,
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getEmailJobStats(userId: string) {
    const stats = await prisma.emailJob.groupBy({
      by: ['status'],
      where: {
        sender: { userId },
      },
      _count: {
        status: true,
      },
    });

    return stats.reduce((acc: Record<string, number>, stat: { status: string; _count: { status: number } }) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  static async deleteByCampaign(userId: string, campaignId: string) {
    // Handle null or undefined campaignId - delete emails with null campaignId
    if (!campaignId || campaignId === 'null' || campaignId === 'undefined' || campaignId === '') {
      logger.info('Deleting emails with null campaignId', { userId });
      const result = await prisma.emailJob.deleteMany({
        where: {
          campaignId: null,
          sender: { userId },
        },
      });
      logger.info('Email jobs with null campaignId deleted', { userId, count: result.count });
      return result.count;
    }

    // Convert string "null" to actual null for database query
    const dbCampaignId = campaignId === 'null' ? null : campaignId;

    const result = await prisma.emailJob.deleteMany({
      where: {
        campaignId: dbCampaignId,
        sender: { userId },
      },
    });

    logger.info('Email jobs deleted by campaign', { campaignId, userId, count: result.count });

    return result.count;
  }

  static async listCampaigns(userId: string, status?: string) {
    const where: any = {
      sender: { userId },
    };

    if (status) {
      where.status = status as any;
    }

    // First, get all campaignIds that have emails with the specified status
    const campaignIds = await prisma.emailJob.findMany({
      where,
      select: { campaignId: true },
      distinct: ['campaignId'],
    }).then((results: Array<{ campaignId: string | null }>) => results.map((r) => r.campaignId).filter((id): id is string => id !== null));

    if (campaignIds.length === 0) {
      return [];
    }

    // Now group by campaignId only for those campaigns with the specified status
    const campaigns = await prisma.emailJob.groupBy({
      by: ['campaignId', 'subject'],
      where: {
        campaignId: { in: campaignIds },
        sender: { userId },
        ...(status ? { status: status as any } : {}),
      },
      _count: {
        _all: true,
      },
    });

    // Get the scheduledAt for each campaign (earliest email in that campaign with the specified status)
    const campaignDetails = await Promise.all(
      campaigns.map(async (campaign) => {
        const firstEmail = await prisma.emailJob.findFirst({
          where: {
            campaignId: campaign.campaignId,
            sender: { userId },
            ...(status ? { status: status as any } : {}),
          },
          orderBy: { scheduledAt: 'asc' },
          select: { scheduledAt: true },
        });

        return {
          campaignId: campaign.campaignId,
          subject: campaign.subject,
          count: typeof campaign._count === 'object' && campaign._count !== null ? campaign._count._all : campaign._count,
          scheduledAt: firstEmail?.scheduledAt,
        };
      })
    );

    return campaignDetails;
  }

  static async deleteAllScheduled(userId: string) {
    const result = await prisma.emailJob.deleteMany({
      where: {
        sender: { userId },
        status: 'SCHEDULED',
      },
    });

    logger.info('All scheduled emails deleted', { userId, count: result.count });

    return result.count;
  }
}
