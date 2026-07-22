// Commission calculation — store exemption driven by plan permissions (storeCommission = 0)
import type { PlanPermissions } from '../plans/plan.types';
import { permissionNumber } from '../plans/plan.types';

export type ListingCat =
  | 'camels'
  | 'sheep'
  | 'goats'
  | 'cows'
  | 'horses'
  | 'birds'
  | 'feed'
  | 'equipment'
  | 'store';

/** @deprecated Use isStoreExemptFromPermissions */
export function isStoreExempt(planId: string): boolean {
  void planId;
  return false;
}

export function isStoreExemptFromPermissions(
  permissions?: PlanPermissions,
): boolean {
  if (!permissions) return false;
  return permissionNumber(permissions, 'storeCommission', 5) <= 0;
}

type RuleEntry =
  | { type: 'fixed'; value: number; unit: 'per_head' }
  | { type: 'percent'; value: number; unit: 'percent_of_price' }
  | { type: 'by_plan'; value: number; unit: 'by_plan' };

const RULES: Record<ListingCat, RuleEntry> = {
  sheep: { type: 'fixed', value: 20, unit: 'per_head' },
  goats: { type: 'fixed', value: 20, unit: 'per_head' },
  camels: { type: 'fixed', value: 60, unit: 'per_head' },
  horses: { type: 'percent', value: 2, unit: 'percent_of_price' },
  cows: { type: 'percent', value: 2, unit: 'percent_of_price' },
  birds: { type: 'percent', value: 2, unit: 'percent_of_price' },
  feed: { type: 'percent', value: 2, unit: 'percent_of_price' },
  equipment: { type: 'percent', value: 2, unit: 'percent_of_price' },
  store: { type: 'by_plan', value: 5, unit: 'by_plan' },
};

export interface CommissionResult {
  commission: number;
  isExempt: boolean;
  dueDate: Date;
  ruleDescription: string;
}

export function calculateCommission(
  category: ListingCat,
  price: number,
  quantity = 1,
  permissions?: PlanPermissions,
  audience: 'USER' | 'BUTCHER' = 'USER',
): CommissionResult {
  const noFee = {
    commission: 0,
    isExempt: true,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ruleDescription: 'لا رسوم',
  };

  // Commission applies only to non-subscribed butchers (store sales).
  if (audience !== 'BUTCHER' || category !== 'store') {
    return { ...noFee, ruleDescription: 'لا رسوم على إعلانات المواشي والمعدات' };
  }

  const rule = RULES.store;
  const isExempt = isStoreExemptFromPermissions(permissions);

  let commission = 0;
  let ruleDescription = '';

  if (isExempt) {
    ruleDescription = 'صفر عمولة — ملحمة باشتراك مدفوع';
  } else {
    const rate = permissions
      ? permissionNumber(permissions, 'storeCommission', rule.value)
      : rule.value;
    commission = Math.ceil((price * rate) / 100);
    ruleDescription = `${rate}% × ${price.toLocaleString('ar-SA')} ريال = ${commission} ريال`;
  }

  return {
    commission,
    isExempt,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ruleDescription,
  };
}

export function shouldCreateFee(
  category: ListingCat,
  permissions?: PlanPermissions,
  audience: 'USER' | 'BUTCHER' = 'USER',
): boolean {
  if (audience !== 'BUTCHER') return false;
  if (category !== 'store') return false;
  if (isStoreExemptFromPermissions(permissions)) return false;
  return true;
}

export const COMMISSION_TABLE = [
  {
    icon: '🏪',
    nameAr: 'ملحمة (بدون اشتراك)',
    nameEn: 'Butcher (no subscription)',
    ruleAr: '٥٪ من سعر البيع',
    ruleEn: '5% of sale',
    color: '#A855F7',
  },
  {
    icon: '✅',
    nameAr: 'ملحمة (باشتراك)',
    nameEn: 'Butcher (subscribed)',
    ruleAr: 'صفر عمولة',
    ruleEn: 'Zero commission',
    color: '#10B981',
  },
];
