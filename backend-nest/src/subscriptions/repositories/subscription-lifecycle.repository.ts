import { Injectable } from '@nestjs/common';
import { PlanId, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SUBSCRIPTION_SELECT = {
  id: true,
  userId: true,
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
export class SubscriptionLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      select: SUBSCRIPTION_SELECT,
    });
  }

  findById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      select: SUBSCRIPTION_SELECT,
    });
  }

  findExpirablePaidSubscriptions(now: Date) {
    return this.prisma.subscription.findMany({
      where: {
        planId: { not: 'free' },
        renewDate: { lt: now },
      },
      select: SUBSCRIPTION_SELECT,
    });
  }

  findPaidSubscriptionsRenewingWithin(days: number, now: Date) {
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.findMany({
      where: {
        planId: { not: 'free' },
        renewDate: { gt: now, lte: end },
        autoRenew: true,
      },
      select: SUBSCRIPTION_SELECT,
    });
  }

  countActiveFeaturedListings(userId: string) {
    return this.prisma.listing.count({
      where: { sellerId: userId, featured: true, status: 'active' },
    });
  }

  downgradeToFreeTx(
    userId: string,
    previousPlanId: PlanId,
  ): Promise<{ previousPlanId: PlanId }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { userId },
        data: {
          planId: 'free',
          listingsUsed: 0,
          liveMinutesUsed: 0,
        },
      });

      if (previousPlanId === 'vip') {
        await tx.user
          .update({
            where: { id: userId },
            data: { verified: false },
          })
          .catch(() => {});
      }

      await tx.butcher
        .updateMany({
          where: { userId },
          data: {
            subscriptionActive: false,
            subscriptionExpiry: null,
          },
        })
        .catch(() => {});

      return { previousPlanId };
    });
  }

  activatePaidPlanTx(params: {
    subscriptionId: string;
    userId: string;
    targetPlanId: PlanId;
    billingCycle: string;
    newRenewDate: Date;
    resetCounters: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.SubscriptionUpdateInput = {
        planId: params.targetPlanId,
        billingCycle: params.billingCycle,
        renewDate: params.newRenewDate,
        autoRenew: true,
      };
      if (params.resetCounters) {
        updateData.listingsUsed = 0;
        updateData.liveMinutesUsed = 0;
      }

      await tx.subscription.update({
        where: { id: params.subscriptionId },
        data: updateData,
      });

      if (params.targetPlanId === 'vip') {
        await tx.user.update({
          where: { id: params.userId },
          data: { verified: true },
        });
      }

      await tx.butcher
        .updateMany({
          where: { userId: params.userId },
          data: {
            subscriptionActive: true,
            subscriptionExpiry: params.newRenewDate,
          },
        })
        .catch(() => {});
    });
  }

  setAutoRenew(userId: string, autoRenew: boolean) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { autoRenew },
      select: SUBSCRIPTION_SELECT,
    });
  }

  resetUsageCounters(userId: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { listingsUsed: 0, liveMinutesUsed: 0 },
    });
  }

  findUserEmail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, arabicName: true },
    });
  }
}
