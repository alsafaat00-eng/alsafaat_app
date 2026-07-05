// Subscription lifecycle helpers — single source of truth for gating + status
import type { PlanId } from './plans';
import { getPlanById } from './plans';

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'vip'];

export const SUBSCRIPTION_GRACE_DAYS = parseInt(
  process.env.SUBSCRIPTION_GRACE_DAYS || '3',
  10,
);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SubscriptionStatus =
  'active' | 'expired' | 'cancelled' | 'grace_period' | 'downgraded';

export type SubscriptionRow = {
  planId: string;
  renewDate: Date;
  autoRenew: boolean;
};

export function planTier(planId: string): number {
  const idx = PLAN_ORDER.indexOf(planId as PlanId);
  return idx >= 0 ? idx : 0;
}

export function isPaidPlan(planId: string): boolean {
  return planId !== 'free';
}

export function isUpgrade(fromPlanId: string, toPlanId: string): boolean {
  return planTier(toPlanId) > planTier(fromPlanId);
}

/** Paid access window: active until renewDate (+ grace if autoRenew). */
export function hasPaidAccess(
  sub: SubscriptionRow,
  now: Date = new Date(),
): boolean {
  if (!isPaidPlan(sub.planId)) return false;
  if (sub.renewDate > now) return true;
  if (!sub.autoRenew) return false;
  const graceEnd = new Date(
    sub.renewDate.getTime() + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY,
  );
  return now <= graceEnd;
}

export function getSubscriptionStatus(
  sub: SubscriptionRow,
  now: Date = new Date(),
): SubscriptionStatus {
  if (!isPaidPlan(sub.planId)) {
    return 'active';
  }

  if (sub.renewDate > now) {
    return sub.autoRenew ? 'active' : 'cancelled';
  }

  if (sub.autoRenew) {
    const graceEnd = new Date(
      sub.renewDate.getTime() + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY,
    );
    if (now <= graceEnd) return 'grace_period';
  }

  return 'expired';
}

/** Plan used for limits / features (free when expired). */
export function getEffectivePlanId(
  sub: SubscriptionRow,
  now: Date = new Date(),
): PlanId {
  if (hasPaidAccess(sub, now)) {
    return sub.planId as PlanId;
  }
  if (!isPaidPlan(sub.planId)) {
    return 'free';
  }
  const status = getSubscriptionStatus(sub, now);
  if (status === 'grace_period') {
    return sub.planId as PlanId;
  }
  return 'free';
}

/**
 * Block subscription payment only for early renewal of the same paid plan.
 * Free users may always upgrade; paid users may upgrade tier anytime.
 */
export function shouldBlockSubscriptionPayment(
  sub: SubscriptionRow,
  targetPlanId: PlanId,
  now: Date = new Date(),
): boolean {
  if (!isPaidPlan(sub.planId)) return false;
  if (isUpgrade(sub.planId, targetPlanId)) return false;
  if (sub.renewDate > now) return true;
  return false;
}

export function getListingLimit(planId: PlanId): number {
  const plan = getPlanById(planId);
  return plan.listingsPerMonth >= 999
    ? Number.MAX_SAFE_INTEGER
    : plan.listingsPerMonth;
}

export function getFeaturedLimit(planId: PlanId): number {
  const plan = getPlanById(planId);
  return plan.featuredListings >= 999
    ? Number.MAX_SAFE_INTEGER
    : plan.featuredListings;
}

export function getMaxImages(planId: PlanId): number {
  return getPlanById(planId).maxImages;
}

export function hasPrioritySearch(planId: PlanId): boolean {
  return getPlanById(planId).prioritySearch;
}

export function msUntilRenewDate(
  renewDate: Date,
  now: Date = new Date(),
): number {
  return renewDate.getTime() - now.getTime();
}

export function daysUntilRenewDate(
  renewDate: Date,
  now: Date = new Date(),
): number {
  return Math.ceil(msUntilRenewDate(renewDate, now) / MS_PER_DAY);
}
