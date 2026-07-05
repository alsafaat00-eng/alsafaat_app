import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../constants';
import type { SubscriptionJob } from '../types/queue.types';

@Injectable()
export class SubscriptionQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.SUBSCRIPTIONS)
    private readonly queue: Queue<SubscriptionJob>,
  ) {}

  async addSubscriptionJob(
    job: SubscriptionJob,
    opts?: { delay?: number },
  ): Promise<void> {
    await this.queue.add(job.kind, job, {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      ...opts,
    });
  }
}
