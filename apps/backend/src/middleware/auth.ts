import { Request, Response, NextFunction } from 'express';
import prisma from '../database/client.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.user = session.user as any;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
