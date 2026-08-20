import { redis } from '../utils/redis.js';
import { logger } from '../utils/logger';

const DELAY_KEY_PREFIX = 'delay:sender:';

export class DelayCoordinator {
  static async waitForDelay(senderId: string, delayMs: number): Promise<void> {
    if (delayMs <= 0) {
      return;
    }

    const key = `${DELAY_KEY_PREFIX}${senderId}`;
    const now = Date.now();

    try {
      const result = await redis.eval(
        `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local delay = tonumber(ARGV[2])

        local last_send = redis.call('GET', key)
        if last_send then
          local last_time = tonumber(last_send)
          local next_allowed = last_time + delay
          if now < next_allowed then
            local wait_time = next_allowed - now
            redis.call('SET', key, now)
            redis.call('EXPIRE', key, delay * 2)
            return wait_time
          end
        end

        redis.call('SET', key, now)
        redis.call('EXPIRE', key, delay * 2)
        return 0
        `,
        1,
        key,
        now,
        delayMs
      );

      const waitTime = result as number;

      if (waitTime > 0) {
        logger.info('Delay coordinator: waiting', {
          senderId,
          waitTime,
          delayMs,
        });

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } catch (error) {
      logger.error('Delay coordinator failed', { senderId, delayMs, error });
      throw error;
    }
  }

  static async getLastSendTime(senderId: string): Promise<number | null> {
    const key = `${DELAY_KEY_PREFIX}${senderId}`;
    try {
      const lastSend = await redis.get(key);
      return lastSend ? parseInt(lastSend) : null;
    } catch (error) {
      logger.error('Failed to get last send time', { senderId, error });
      return null;
    }
  }

  static async reset(senderId: string): Promise<void> {
    const key = `${DELAY_KEY_PREFIX}${senderId}`;
    try {
      await redis.del(key);
      logger.info('Delay coordinator reset', { senderId });
    } catch (error) {
      logger.error('Failed to reset delay coordinator', { senderId, error });
    }
  }
}
