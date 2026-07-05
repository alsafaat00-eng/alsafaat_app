import { Injectable } from '@nestjs/common';
import type { PlanId } from '../../lib/plans';
import {
  daysUntilRenewDate,
  getEffectivePlanId,
  getSubscriptionStatus,
  hasPaidAccess,
  isPaidPlan,
  type SubscriptionStatus,
} from '../../lib/subscription-lifecycle';
import { LoggerService } from '../../common/services/logger.service';
import { AppNotificationsService } from '../../queue/services/app-notifications.service';
import { EmailQueueService } from '../../queue/services/email-queue.service';
import { SubscriptionLifecycleRepository } from '../repositories/subscription-lifecycle.repository';
import { SubscriptionCacheService } from './subscription-cache.service';

export type SubscriptionView = {
  id: string;
  planId: string;
  billingCycle: string;
  renewDate: Date;
  listingsUsed: number;
  liveMinutesUsed: number;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: SubscriptionStatus;
  effectivePlanId: PlanId;
  previousPlanId?: PlanId;
};

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly repo: SubscriptionLifecycleRepository,
    private readonly cache: SubscriptionCacheService,
    private readonly notifications: AppNotificationsService,
    private readonly emailQueue: EmailQueueService,
    private readonly logger: LoggerService,
  ) {}

  enrichSubscription(
    row: NonNullable<
      Awaited<ReturnType<SubscriptionLifecycleRepository['findByUserId']>>
    >,
    now: Date = new Date(),
    previousPlanId?: PlanId,
  ): SubscriptionView {
    const status = getSubscriptionStatus(row, now);
    const effectivePlanId = getEffectivePlanId(row, now);
    return {
      id: row.id,
      planId: row.planId,
      billingCycle: row.billingCycle,
      renewDate: row.renewDate,
      listingsUsed: row.listingsUsed,
      liveMinutesUsed: row.liveMinutesUsed,
      autoRenew: row.autoRenew,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status,
      effectivePlanId,
      ...(previousPlanId ? { previousPlanId } : {}),
    };
  }

  async activateFromPayment(params: {
    subscriptionId: string;
    userId: string;
    targetPlanId: PlanId;
    billingCycle: string;
    renewDate: Date;
    amount: number;
    currency: string;
    isRenewal: boolean;
  }): Promise<void> {
    await this.repo.activatePaidPlanTx({
      subscriptionId: params.subscriptionId,
      userId: params.userId,
      targetPlanId: params.targetPlanId,
      billingCycle: params.billingCycle,
      newRenewDate: params.renewDate,
      resetCounters: true,
    });
    await this.cache.invalidate(params.userId);
    await this.notifyRenewalSuccess(
      params.userId,
      params.targetPlanId,
      params.amount,
      params.currency,
    );
  }

  async expireIfNeededForUser(userId: string): Promise<void> {
    const row = await this.repo.findByUserId(userId);
    if (row) await this.expireIfNeeded(row);
  }

  async getForUser(userId: string, options?: { applyExpiration?: boolean }) {
    let row = await this.repo.findByUserId(userId);
    if (!row) return null;

    if (options?.applyExpiration !== false) {
      const expired = await this.expireIfNeeded(row);
      if (expired) {
        row = await this.repo.findByUserId(userId);
        if (!row) return null;
      }
    }

    return this.enrichSubscription(row);
  }

  async expireIfNeeded(
    row: NonNullable<
      Awaited<ReturnType<SubscriptionLifecycleRepository['findByUserId']>>
    >,
  ): Promise<boolean> {
    if (!isPaidPlan(row.planId)) return false;

    const status = getSubscriptionStatus(row);
    if (status !== 'expired') return false;

    await this.downgradeUser(row.userId, row.planId as PlanId, 'expiration');
    return true;
  }

  async downgradeUser(
    userId: string,
    previousPlanId: PlanId,
    reason: 'expiration' | 'refund' | 'manual',
  ): Promise<void> {
    if (!isPaidPlan(previousPlanId)) return;

    await this.repo.downgradeToFreeTx(userId, previousPlanId);
    await this.cache.invalidate(userId);

    const titleAr =
      reason === 'refund' ? 'تم استرداد مبلغ الاشتراك' : 'انتهى اشتراكك';
    const bodyAr =
      reason === 'refund'
        ? 'تم إلغاء اشتراكك بعد استرداد الدفع. يمكنك الاشتراك مجدداً في أي وقت.'
        : 'انتهت صلاحية اشتراكك وتمت العودة للباقة المجانية. جدّد اشتراكك للاستمرار بالمزايا.';

    await this.notifications.notifyUser({
      userId,
      type: reason === 'refund' ? 'system' : 'subscription_renew',
      titleAr,
      bodyAr,
      data: { reason, previousPlanId },
    });

    this.logger.info(
      { userId, previousPlanId, reason },
      'Subscription downgraded',
    );
  }

  async cancelAutoRenew(userId: string) {
    const row = await this.repo.findByUserId(userId);
    if (!row) return null;
    if (!isPaidPlan(row.planId)) {
      return this.enrichSubscription(row);
    }
    if (!hasPaidAccess(row)) {
      await this.expireIfNeeded(row);
      const updated = await this.repo.findByUserId(userId);
      return updated ? this.enrichSubscription(updated) : null;
    }

    const updated = await this.repo.setAutoRenew(userId, false);
    await this.cache.invalidate(userId);

    await this.notifications.notifyUser({
      userId,
      type: 'subscription_renew',
      titleAr: 'تم إلغاء التجديد التلقائي',
      bodyAr: `سيظل اشتراكك فعّالاً حتى ${updated.renewDate.toLocaleDateString('ar-SA')}.`,
      data: { renewDate: updated.renewDate.toISOString() },
    });

    return this.enrichSubscription(updated);
  }

  async sendRenewalReminder(
    row: NonNullable<
      Awaited<ReturnType<SubscriptionLifecycleRepository['findByUserId']>>
    >,
    daysLeft: number,
  ): Promise<void> {
    const kind = `d${daysLeft}`;
    const ttl = 8 * 24 * 60 * 60;
    const shouldSend = await this.cache.markReminderSent(row.userId, kind, ttl);
    if (!shouldSend) return;

    const titleAr =
      daysLeft <= 0
        ? 'انتهى اشتراكك'
        : `تذكير: اشتراكك ينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}`;
    const bodyAr =
      daysLeft <= 0
        ? 'انتهت صلاحية اشتراكك. جدّد الآن لاستعادة المزايا.'
        : `باقة ${row.planId} تنتهي في ${new Date(row.renewDate).toLocaleDateString('ar-SA')}. جدّد لتجنب انقطاع الخدمة.`;

    await this.notifications.notifyUser({
      userId: row.userId,
      type: 'subscription_renew',
      titleAr,
      bodyAr,
      data: {
        planId: row.planId,
        renewDate: row.renewDate.toISOString(),
        daysLeft: String(daysLeft),
      },
    });

    const user = await this.repo.findUserEmail(row.userId);
    if (user?.email) {
      await this.emailQueue.addEmail({
        to: user.email,
        subject: titleAr,
        template: 'subscription_renew',
        variables: {
          plan: row.planId,
          amount: '',
          daysLeft: String(daysLeft),
          body: bodyAr,
        },
      });
    }
  }

  async processReminderBatch(now: Date = new Date()): Promise<number> {
    let sent = 0;
    for (const days of [7, 3, 1]) {
      const rows = await this.repo.findPaidSubscriptionsRenewingWithin(
        days,
        now,
      );
      for (const row of rows) {
        const left = daysUntilRenewDate(row.renewDate, now);
        if (left > 0 && left <= days) {
          await this.sendRenewalReminder(row, left);
          sent++;
        }
      }
    }
    return sent;
  }

  async processExpirationBatch(now: Date = new Date()): Promise<number> {
    const rows = await this.repo.findExpirablePaidSubscriptions(now);
    let count = 0;
    for (const row of rows) {
      const status = getSubscriptionStatus(row, now);
      if (status === 'expired') {
        await this.downgradeUser(
          row.userId,
          row.planId as PlanId,
          'expiration',
        );
        count++;
        continue;
      }
      if (status === 'grace_period') {
        const left = daysUntilRenewDate(row.renewDate, now);
        if (left <= 0) {
          await this.sendRenewalReminder(row, 0);
        }
      }
    }
    return count;
  }

  async notifyRenewalSuccess(
    userId: string,
    planId: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    await this.notifications.notifyUser({
      userId,
      type: 'subscription_renew',
      titleAr: '✅ تم تجديد اشتراكك',
      bodyAr: `تم تفعيل باقة ${planId}. المبلغ: ${amount} ${currency}`,
      data: { planId, amount: String(amount) },
    });

    const user = await this.repo.findUserEmail(userId);
    if (user?.email) {
      await this.emailQueue.addEmail({
        to: user.email,
        subject: 'تم تجديد اشتراكك',
        template: 'subscription_renew',
        variables: {
          plan: planId,
          amount: String(amount),
          body: `تم تجديد اشتراكك بنجاح.`,
        },
      });
    }
  }

  async notifyRenewalFailed(userId: string, planId: string): Promise<void> {
    await this.notifications.notifyUser({
      userId,
      type: 'subscription_renew',
      titleAr: '❌ فشل تجديد الاشتراك',
      bodyAr: 'تعذر تجديد اشتراكك تلقائياً. يرجى الدفع يدوياً.',
      data: { planId },
    });
  }
}
