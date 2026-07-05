import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import IORedis from 'ioredis';
import { LoggerService } from './logger.service';

export type RateLimitType = 'api' | 'auth' | 'payment';

const TRUSTED_PROXIES = new Set(
  (process.env.TRUSTED_PROXIES || '127.0.0.1,::1,172.0.0.0/8,10.0.0.0/8')
    .split(',')
    .map((s) => s.trim()),
);

@Injectable()
export class RateLimitService {
  private limiterInstance: RateLimiterRedis | RateLimiterMemory | null = null;
  private authLimiterInstance: RateLimiterRedis | RateLimiterMemory | null =
    null;
  private paymentLimiterInstance: RateLimiterRedis | RateLimiterMemory | null =
    null;
  private memoryLimiters: Record<string, RateLimiterMemory> = {};
  private redisClient: IORedis | null = null;

  constructor(private readonly logger: LoggerService) {}

  isRedisEnabled(): boolean {
    return process.env.REDIS_ENABLED !== 'false';
  }

  private getRedisClient(): IORedis {
    if (!this.redisClient) {
      this.redisClient = new IORedis({
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
      });
    }
    return this.redisClient;
  }

  getClientIp(req: Request): string {
    const directIp = req.socket.remoteAddress || 'unknown';
    const isTrustedProxy =
      TRUSTED_PROXIES.has(directIp) ||
      directIp.startsWith('172.') ||
      directIp.startsWith('10.');

    if (isTrustedProxy) {
      const forwarded = req.headers['x-forwarded-for'] as string | undefined;
      if (forwarded) {
        const ips = forwarded.split(',').map((s) => s.trim());
        return ips[ips.length - 1] || directIp;
      }
      const realIp = req.headers['x-real-ip'] as string | undefined;
      if (realIp) return realIp;
    }
    return directIp;
  }

  private getMemoryLimiter(
    points: number,
    duration: number,
    keyPrefix: string,
  ) {
    const key = `${keyPrefix}:${points}:${duration}`;
    if (!this.memoryLimiters[key]) {
      this.memoryLimiters[key] = new RateLimiterMemory({
        keyPrefix,
        points,
        duration,
      });
    }
    return this.memoryLimiters[key];
  }

  private getLimiter(
    points: number,
    duration: number,
    keyPrefix: string,
    blockDuration = 60,
  ) {
    if (!this.isRedisEnabled()) {
      return new RateLimiterMemory({ keyPrefix, points, duration });
    }
    try {
      return new RateLimiterRedis({
        storeClient: this.getRedisClient(),
        keyPrefix,
        points,
        duration,
        blockDuration,
      });
    } catch {
      this.logger.warn(
        { keyPrefix },
        'Redis unavailable at setup, falling back to memory rate limiter',
      );
      return new RateLimiterMemory({ keyPrefix, points, duration });
    }
  }

  private getApiLimiter() {
    if (!this.limiterInstance) {
      this.limiterInstance = this.getLimiter(
        parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) / 1000,
        'rl:api',
      );
    }
    return this.limiterInstance;
  }

  private getAuthLimiter() {
    if (!this.authLimiterInstance) {
      this.authLimiterInstance = this.getLimiter(5, 900, 'rl:auth', 900);
    }
    return this.authLimiterInstance;
  }

  private getPaymentLimiter() {
    if (!this.paymentLimiterInstance) {
      this.paymentLimiterInstance = this.getLimiter(
        10,
        3600,
        'rl:payment',
        3600,
      );
    }
    return this.paymentLimiterInstance;
  }

  async consume(
    req: Request,
    res: Response,
    type: RateLimitType = 'api',
  ): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const ip = this.getClientIp(req);
    const limits = { api: 100, auth: 5, payment: 10 };
    const windows = { api: 900, auth: 900, payment: 3600 };

    const redisClient = this.getRedisClient();
    const isRedisReady = redisClient.status === 'ready';

    try {
      let result;
      if (isRedisReady) {
        const limiterMap = {
          api: () => this.getApiLimiter(),
          auth: () => this.getAuthLimiter(),
          payment: () => this.getPaymentLimiter(),
        };
        result = await limiterMap[type]().consume(ip);
      } else {
        const memoryLimiter = this.getMemoryLimiter(
          limits[type],
          windows[type],
          `rl:mem:${type}`,
        );
        result = await memoryLimiter.consume(ip);
      }

      res.setHeader('X-RateLimit-Limit', limits[type]);
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + result.msBeforeNext).toISOString(),
      );
      return true;
    } catch (rejRes: unknown) {
      if (rejRes instanceof Error) {
        this.logger.error(
          { err: rejRes.message, ip, type },
          'Rate limiter Redis error, failing open',
        );
        return true;
      }

      const rateRes = rejRes as { msBeforeNext: number };
      this.logger.warn({ ip, type }, 'Rate limit exceeded');
      res.setHeader('Retry-After', Math.round(rateRes.msBeforeNext / 1000));
      res.status(429).json({
        error: 'too_many_requests',
        messageAr: 'طلبات كثيرة جداً، حاول لاحقاً',
        message: 'Too many requests, please try again later',
        retryAfter: Math.round(rateRes.msBeforeNext / 1000),
      });
      return false;
    }
  }
}
