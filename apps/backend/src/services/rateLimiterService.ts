import { redis } from '../utils/redis.js';
import { logger } from '../utils/logger';

const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_KEY_PREFIX = 'rate_limit:sender:';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiterService {
  static async checkRateLimit(
    senderId: string,
    hourlyLimit: number
  ): Promise<RateLimitResult> {
    const key = `${RATE_LIMIT_KEY_PREFIX}${senderId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - RATE_LIMIT_WINDOW;

    try {
      const result = await redis.eval(
        `
        local key = KEYS[1]
        local window = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local window_start = tonumber(ARGV[4])

        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

        local count = redis.call('ZCARD', key)

        if count < limit then
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, window)
          return {1, limit - count - 1, now + window}
        else
          local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local reset_at = oldest[2] and tonumber(oldest[2]) + window or now + window
          return {0, 0, reset_at}
        end
        `,
        1,
        key,
        RATE_LIMIT_WINDOW,
        hourlyLimit,
        now,
        windowStart
      );

      const [allowed, remaining, resetAt] = result as [number, number, number];

      logger.info('Rate limit check', {
        senderId,
        allowed: allowed === 1,
        remaining,
        hourlyLimit,
      });

      return {
        allowed: allowed === 1,
        remaining,
        resetAt,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { senderId, error });
      throw error;
    }
  }

  static async getCurrentCount(senderId: string): Promise<number> {
    const key = `${RATE_LIMIT_KEY_PREFIX}${senderId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - RATE_LIMIT_WINDOW;

    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);
      return count;
    } catch (error) {
      logger.error('Failed to get current rate limit count', { senderId, error });
      return 0;
    }
  }

  static async reset(senderId: string): Promise<void> {
    const key = `${RATE_LIMIT_KEY_PREFIX}${senderId}`;
    try {
      await redis.del(key);
      logger.info('Rate limit reset', { senderId });
    } catch (error) {
      logger.error('Failed to reset rate limit', { senderId, error });
    }
  }
}
