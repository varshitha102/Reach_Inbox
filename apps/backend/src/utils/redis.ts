import Redis from 'ioredis';
import { config } from '../config/index.js';

// Create Redis client with proper configuration
export const redis = config.redisUrl 
  ? new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    })
  : new Redis({
      host: config.redisHost,
      port: config.redisPort,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

// Handle Redis errors
redis.on('error', (error) => {
  console.error('Redis error:', error.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.ping();
    console.log('Redis connection verified');
  } catch (error) {
    console.error('Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('Redis disconnected gracefully');
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
    // Force close if graceful quit fails
    redis.disconnect();
  }
}

// Rate limiting using Redis
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}

// Idempotency check
export async function checkIdempotency(key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1;
}

export async function setIdempotencyKey(key: string, ttl: number = 86400): Promise<void> {
  await redis.set(key, '1', 'EX', ttl);
}
