import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { LoggerService } from '../../common/services/logger.service';

@Injectable()
export class RedisSessionService {
  private client: IORedis | null = null;
  private markedUnavailable = false;

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
      db: 2,
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
        this.logger.error({ err: err.message }, 'Redis session error');
        if (process.env.NODE_ENV !== 'production')
          this.markedUnavailable = true;
      });
    }
    return this.client;
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await this.getClient().set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') this.markedUnavailable = true;
      else throw err;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;
    try {
      const val = await this.getClient().get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length || !this.isEnabled()) return;
    try {
      await this.getClient().del(...keys);
    } catch {
      /* non-critical */
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
}
