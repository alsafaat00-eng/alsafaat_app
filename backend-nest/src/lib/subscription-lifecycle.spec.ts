import {
  getEffectivePlanId,
  getSubscriptionStatus,
  hasPaidAccess,
  isUpgrade,
  shouldBlockSubscriptionPayment,
  planTier,
} from './subscription-lifecycle';

describe('subscription-lifecycle', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const future = new Date('2026-07-01T12:00:00Z');
  const past = new Date('2026-05-01T12:00:00Z');

  it('allows free users to upgrade regardless of renewDate', () => {
    const sub = { planId: 'free', renewDate: future, autoRenew: true };
    expect(shouldBlockSubscriptionPayment(sub, 'starter', now)).toBe(false);
    expect(shouldBlockSubscriptionPayment(sub, 'pro', now)).toBe(false);
  });

  it('blocks early renewal of the same paid plan', () => {
    const sub = { planId: 'starter', renewDate: future, autoRenew: true };
    expect(shouldBlockSubscriptionPayment(sub, 'starter', now)).toBe(true);
  });

  it('allows paid tier upgrades before renewDate', () => {
    const sub = { planId: 'starter', renewDate: future, autoRenew: true };
    expect(shouldBlockSubscriptionPayment(sub, 'pro', now)).toBe(false);
    expect(isUpgrade('starter', 'pro')).toBe(true);
    expect(planTier('pro')).toBeGreaterThan(planTier('starter'));
  });

  it('allows renewal after renewDate passes', () => {
    const sub = { planId: 'pro', renewDate: past, autoRenew: true };
    expect(shouldBlockSubscriptionPayment(sub, 'pro', now)).toBe(false);
  });

  it('downgrades effective plan when expired', () => {
    const sub = { planId: 'pro', renewDate: past, autoRenew: false };
    expect(getSubscriptionStatus(sub, now)).toBe('expired');
    expect(getEffectivePlanId(sub, now)).toBe('free');
    expect(hasPaidAccess(sub, now)).toBe(false);
  });

  it('keeps paid access during grace with autoRenew', () => {
    const renewDate = new Date('2026-05-30T12:00:00Z');
    const sub = { planId: 'starter', renewDate, autoRenew: true };
    expect(getSubscriptionStatus(sub, now)).toBe('grace_period');
    expect(getEffectivePlanId(sub, now)).toBe('starter');
    expect(hasPaidAccess(sub, now)).toBe(true);
  });

  it('marks cancelled but active subscriptions', () => {
    const sub = { planId: 'pro', renewDate: future, autoRenew: false };
    expect(getSubscriptionStatus(sub, now)).toBe('cancelled');
    expect(hasPaidAccess(sub, now)).toBe(true);
  });
});
