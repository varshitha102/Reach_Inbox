import prisma from '../database/client.js';

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        senders: true,
        campaigns: true,
      },
    });
  }

  static async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async create(data: {
    googleId: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  static async createSession(userId: string, sessionToken: string, expiresAt: Date) {
    return prisma.session.create({
      data: {
        userId,
        sessionToken,
        expiresAt,
      },
    });
  }

  static async findSession(sessionToken: string) {
    return prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
  }

  static async deleteSession(sessionToken: string) {
    return prisma.session.delete({
      where: { sessionToken },
    });
  }

  static async deleteExpiredSessions() {
    return prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
