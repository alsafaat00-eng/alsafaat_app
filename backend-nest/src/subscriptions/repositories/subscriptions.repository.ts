import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SUBSCRIPTION_SELECT = {
  id: true,
  planId: true,
  billingCycle: true,
  renewDate: true,
  listingsUsed: true,
  liveMinutesUsed: true,
  autoRenew: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      select: SUBSCRIPTION_SELECT,
    });
  }

  upsertFree(userId: string) {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        planId: 'free',
        renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      select: SUBSCRIPTION_SELECT,
    });
  }
}
