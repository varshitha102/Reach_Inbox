import prisma from '../database/client.js';
import { CampaignStatus } from '@prisma/client';

export interface CreateCampaignInput {
  userId: string;
  senderId?: string;
  name: string;
  subject: string;
}

export class CampaignRepository {
  static async create(data: CreateCampaignInput) {
    return prisma.campaign.create({
      data,
      include: {
        sender: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        sender: true,
      },
    });
  }

  static async findByUserId(userId: string, status?: CampaignStatus) {
    return prisma.campaign.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateStatus(id: string, status: CampaignStatus) {
    return prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }

  static async delete(id: string) {
    return prisma.campaign.delete({
      where: { id },
    });
  }
}
