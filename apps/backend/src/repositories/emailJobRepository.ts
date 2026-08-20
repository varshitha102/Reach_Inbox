import prisma from '../database/client.js';
import { EmailJobStatus } from '@prisma/client';

export interface CreateEmailJobInput {
  campaignId?: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  delayMs?: number;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    size?: number;
    url?: string;
  }>;
}

export class EmailJobRepository {
  static async create(data: CreateEmailJobInput) {
    const idempotencyKey = `${data.senderId}-${data.recipient}-${Date.now()}`;

    const emailJob = await prisma.emailJob.create({
      data: {
        campaignId: data.campaignId,
        senderId: data.senderId,
        recipient: data.recipient,
        subject: data.subject,
        body: data.body,
        scheduledAt: data.scheduledAt,
        delayMs: data.delayMs || 0,
        idempotencyKey,
        attachments: data.attachments
          ? {
              create: data.attachments,
            }
          : undefined,
      },
      include: {
        attachments: true,
        sender: true,
      },
    });

    return emailJob;
  }

  static async findById(id: string) {
    return prisma.emailJob.findUnique({
      where: { id },
      include: {
        attachments: true,
        sender: true,
      },
    });
  }

  static async findByUserId(userId: string, status?: EmailJobStatus) {
    return prisma.emailJob.findMany({
      where: {
        sender: { userId },
        ...(status && { status }),
      },
      include: {
        attachments: true,
        sender: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  static async findByCampaignId(campaignId: string) {
    return prisma.emailJob.findMany({
      where: { campaignId },
      include: {
        attachments: true,
        sender: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  static async findBySenderId(senderId: string) {
    return prisma.emailJob.findMany({
      where: { senderId },
      include: {
        attachments: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  static async updateStatus(
    id: string,
    status: EmailJobStatus,
    metadata?: {
      sentAt?: Date;
      failedAt?: Date;
      lastError?: string;
    }
  ) {
    return prisma.emailJob.update({
      where: { id },
      data: {
        status,
        ...metadata,
      },
    });
  }

  static async search(query: string, userId: string) {
    return prisma.emailJob.findMany({
      where: {
        sender: { userId },
        OR: [
          { recipient: { contains: query } },
          { subject: { contains: query } },
          { body: { contains: query } },
        ],
      },
      include: {
        attachments: true,
        sender: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  static async getStats(userId: string) {
    const [total, sent, failed, scheduled] = await Promise.all([
      prisma.emailJob.count({
        where: { sender: { userId } },
      }),
      prisma.emailJob.count({
        where: { sender: { userId }, status: 'SENT' },
      }),
      prisma.emailJob.count({
        where: { sender: { userId }, status: 'FAILED' },
      }),
      prisma.emailJob.count({
        where: { sender: { userId }, status: 'SCHEDULED' },
      }),
    ]);

    return { total, sent, failed, scheduled };
  }
}
