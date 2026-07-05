import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { LoggerService } from '../../common/services/logger.service';

const DEFAULT_TTL = 300;

@Injectable()
export class RedisCacheService {
  private client: IORedis | null = null;
  private markedUnavailable = false;
  private unavailableLogged = false;

  constructor(private readonly logger: LoggerService) {}

  isEnabled(): boolean {
    if (process.env.REDIS_ENABLED === 'false') return false;
    if (this.markedUnavailable && process.env.NODE_ENV !== 'production')
      return false;
    return true;
  }

  private baseOpts() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: 0,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 3000,
      commandTimeout: 3000,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 2) return null;
        return Math.min(times * 200, 1000);
      },
    };
  }

  getClient(): IORedis {
    if (!this.isEnabled()) throw new Error('Redis disabled');
    if (!this.client) {
      this.client = new IORedis(this.baseOpts());
      this.client.on('error', (err) => {
        this.logger.error({ err: err.message }, 'Redis cache error');
        this.markUnavailable(err);
      });
      this.client.on('connect', () =>
        this.logger.info({}, 'Redis cache connected'),
      );
    }
    return this.client;
  }

  private markUnavailable(err?: unknown) {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.REDIS_ENABLED !== 'false'
    ) {
      this.markedUnavailable = true;
      if (!this.unavailableLogged) {
        this.unavailableLogged = true;
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'Redis unavailable — cache skipped (dev)',
        );
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;
    try {
      const val = await this.getClient().get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch (err) {
      this.markUnavailable(err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await this.getClient().set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.markUnavailable(err);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length || !this.isEnabled()) return;
    try {
      await this.getClient().del(...keys);
    } catch (err) {
      this.markUnavailable(err);
    }
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl = DEFAULT_TTL,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.isEnabled()) return 0;
    try {
      const redis = this.getClient();
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
      return deleted;
    } catch (err) {
      this.markUnavailable(err);
      return 0;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      await this.getClient().ping();
      return true;
    } catch {
      return false;
    }
  }

  readonly keys = {
    user: (id: string) => `user:${id}`,
    listing: (id: string) => `listing:${id}`,
    listings: (page: number, filters: string) => `listings:${page}:${filters}`,
    post: (id: string) => `post:${id}`,
    posts: (page: number) => `posts:${page}`,
    butcher: (id: string) => `butcher:${id}`,
    butchers: (country: string, page: number) => `butchers:${country}:${page}`,
    userFeed: (userId: string, page: number) => `feed:${userId}:${page}`,
    liveStreams: () => 'streams:live',
  };
}
