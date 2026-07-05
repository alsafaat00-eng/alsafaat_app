import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../common/services/logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../constants';
import type { FeeCheckJob } from '../types/queue.types';
import { AppNotificationsService } from '../services/app-notifications.service';

@Injectable()
@Processor(QUEUE_NAMES.FEE_CHECKS, { concurrency: 5 })
export class FeeCheckProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AppNotificationsService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<FeeCheckJob>): Promise<void> {
    if (job.name !== 'check') return;

    const { listingFeeId, userId, amount } = job.data;
    let overdueListingId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const fee = await tx.listingFee.findUnique({
        where: { id: listingFeeId },
        select: { status: true, dueDate: true, listingId: true },
      });

      if (!fee || fee.status !== 'pending') return;

      if (new Date() > fee.dueDate) {
        await tx.listingFee.update({
          where: { id: listingFeeId },
          data: { status: 'overdue' },
        });
        await tx.listing.update({
          where: { id: fee.listingId },
          data: { status: 'pending_fee' },
        });
        overdueListingId = fee.listingId;
        this.logger.warn({ listingFeeId, userId }, 'Fee marked overdue');
      }
    });

    if (overdueListingId) {
      await this.notifications.notifyUser({
        userId,
        type: 'fee_due',
        titleAr: 'رسوم متأخرة',
        bodyAr: `رسوم إعلانك (${amount} ريال) متأخرة. سيُوقف الإعلان حتى السداد.`,
        data: {
          feeId: listingFeeId,
          listingId: overdueListingId,
          amount,
        },
      });
    }
  }
}
