import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/services/redis-cache.service';
import { RedisSessionService } from '../redis/services/redis-session.service';
import { NotificationQueueService } from '../queue/services/notification-queue.service';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  pingDb() {
    return this.prisma.$queryRaw`SELECT 1`;
  }
}

@Injectable()
export class HealthService {
  constructor(
    private readonly repo: HealthRepository,
    private readonly cache: RedisCacheService,
    private readonly sessions: RedisSessionService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  async check() {
    const start = Date.now();
    const checks = {
      db: false,
      redis_cache: false,
      redis_session: false,
      queue: false,
    };

    const redisEnabled = this.cache.isEnabled();

    await Promise.allSettled([
      this.repo.pingDb().then(() => {
        checks.db = true;
      }),
      redisEnabled
        ? this.cache.ping().then((ok: boolean) => {
            if (ok) checks.redis_cache = true;
          })
        : Promise.resolve(),
      redisEnabled
        ? this.sessions.ping().then((ok: boolean) => {
            if (ok) checks.redis_session = true;
          })
        : Promise.resolve(),
      (async () => {
        if (this.notificationQueue.isEnabled()) {
          await this.notificationQueue.getJobCounts();
          checks.queue = true;
        }
      })(),
    ]);

    const healthy =
      checks.db &&
      (!redisEnabled || (checks.redis_cache && checks.redis_session));
    const duration = Date.now() - start;

    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      duration: `${duration}ms`,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      httpStatus: healthy ? 200 : 503,
    };
  }
}
