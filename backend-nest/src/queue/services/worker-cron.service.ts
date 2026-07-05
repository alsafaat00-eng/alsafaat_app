import { Injectable, OnModuleDestroy } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from '../../common/services/logger.service';
import { WorkerCronRepository } from '../repositories/worker-cron.repository';
import { RedisCacheService } from '../../redis/services/redis-cache.service';
import { FeeCheckQueueService } from './fee-check-queue.service';
import { SubscriptionQueueService } from './subscription-queue.service';

@Injectable()
export class WorkerCronService implements OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly lastRun: Record<string, string> = {};

  constructor(
    private readonly cronRepo: WorkerCronRepository,
    private readonly cache: RedisCacheService,
    private readonly feeCheckQueue: FeeCheckQueueService,
    private readonly subscriptionQueue: SubscriptionQueueService,
    private readonly logger: LoggerService,
  ) {
    this.interval = setInterval(() => void this.tick(), 60 * 60 * 1000);
    this.logger.info({}, '🔧 Workers started');
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private shouldRun(key: string, hour: number): boolean {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currHour = now.getHours();
    if (currHour === hour && this.lastRun[key] !== today) {
      this.lastRun[key] = today;
      return true;
    }
    return false;
  }

  private async withLock(
    key: string,
    ttl: number,
    fn: () => Promise<void>,
  ): Promise<void> {
    if (!this.cache.isEnabled()) return;
    try {
      const redis = this.cache.getClient();
      const acquired = await redis.set(key, '1', 'EX', ttl, 'NX');
      if (!acquired) {
        this.logger.debug(
          { key },
          'Cron lock not acquired — another instance running',
        );
        return;
      }
      await fn();
    } catch (err) {
      this.logger.error({ err, key }, 'Cron job error');
    }
  }

  private async runFeeCheckCron(): Promise<void> {
    if (!this.cache.isEnabled()) return;

    const lockKey = 'cron:fee_check:lock';
    const lockTTL = 120;

    try {
      const redis = this.cache.getClient();
      const acquired = await redis.set(lockKey, '1', 'EX', lockTTL, 'NX');
      if (!acquired) {
        this.logger.debug(
          {},
          'Fee check cron: lock not acquired, another worker is running it',
        );
        return;
      }

      this.logger.info({}, 'Running daily fee check cron');
      const overdueFees = await this.cronRepo.findOverdueListingFees();

      if (overdueFees.length > 0) {
        await Promise.all(
          overdueFees.map((fee) =>
            this.feeCheckQueue.addFeeCheck({
              listingFeeId: fee.id,
              userId: fee.userId,
              amount: fee.commission,
            }),
          ),
        );
        this.logger.info(
          { count: overdueFees.length },
          'Fee check jobs queued',
        );
      }
    } catch (err) {
      this.logger.error({ err }, 'Fee check cron error');
    }
  }

  private async runDbCleanupCron(): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    await this.withLock('cron:db_cleanup:lock', 300, async () => {
      this.logger.info({}, 'Running daily database cleanup');
      try {
        await axios.post(
          `${appUrl}/api/admin/cleanup`,
          {},
          {
            headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
            timeout: 30000,
          },
        );
        this.logger.info({}, 'Database cleanup triggered via API');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error({ err: message }, 'DB cleanup cron failed');
      }
    });
  }

  private async runSubscriptionCron(): Promise<void> {
    await this.withLock('cron:subscription:lock', 300, async () => {
      this.logger.info({}, 'Running subscription maintenance cron');
      await Promise.all([
        this.subscriptionQueue.addSubscriptionJob({ kind: 'expire' }),
        this.subscriptionQueue.addSubscriptionJob({ kind: 'reminders' }),
      ]);
    });
  }

  private async runWeeklyLiveMinutesReset(): Promise<void> {
    await this.withLock('cron:subscription:weekly_reset', 300, async () => {
      await this.subscriptionQueue.addSubscriptionJob({
        kind: 'reset_live_minutes',
      });
    });
  }

  private async tick(): Promise<void> {
    if (this.shouldRun('fee_check', 9)) {
      await this.runFeeCheckCron();
    }
    if (this.shouldRun('db_cleanup', 3)) {
      await this.runDbCleanupCron();
    }
    if (this.shouldRun('subscription', 6)) {
      await this.runSubscriptionCron();
    }
    const now = new Date();
    if (now.getDay() === 1 && this.shouldRun('subscription_weekly', 4)) {
      await this.runWeeklyLiveMinutesReset();
    }
  }
}
