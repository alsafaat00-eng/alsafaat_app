import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { LoggerService } from '../../common/services/logger.service';
import { RedisCacheService } from '../../redis/services/redis-cache.service';
import { QUEUE_NAMES } from '../constants';
import type { EmailJob } from '../types/queue.types';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAILS) private readonly queue: Queue,
    private readonly cache: RedisCacheService,
    private readonly logger: LoggerService,
  ) {}

  async addEmail(job: EmailJob) {
    if (!this.cache.isEnabled()) return null;
    try {
      return await this.queue.add('send', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    } catch (err) {
      this.logger.warn({ err }, 'Failed to enqueue email');
      return null;
    }
  }
}
