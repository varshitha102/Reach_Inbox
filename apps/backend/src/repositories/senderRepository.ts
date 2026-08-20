import prisma from '../database/client.js';
import { SenderStatus } from '@prisma/client';

export class SenderRepository {
  static async create(userId: string, email: string, name?: string) {
    return prisma.sender.create({
      data: {
        userId,
        email,
        name,
      },
    });
  }

  static async findById(id: string) {
    return prisma.sender.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  static async findByUserId(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findByEmail(userId: string, email: string) {
    return prisma.sender.findUnique({
      where: {
        userId_email: {
          userId,
          email,
        },
      },
    });
  }

  static async updateStatus(id: string, status: SenderStatus) {
    return prisma.sender.update({
      where: { id },
      data: { status },
    });
  }

  static async delete(id: string) {
    return prisma.sender.delete({
      where: { id },
    });
  }
}
