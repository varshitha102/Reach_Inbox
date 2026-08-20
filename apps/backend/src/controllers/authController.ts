import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository.js';
import { randomBytes } from 'crypto';

export class AuthController {
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserRepository.findById(req.user.id);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      if (sessionToken) {
        await UserRepository.deleteSession(sessionToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSession(userId: string, _res: Response) {
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await UserRepository.createSession(userId, sessionToken, expiresAt);

    return sessionToken;
  }
}
