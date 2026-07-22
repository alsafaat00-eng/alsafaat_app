
export type ListingCategory =
  | 'camels'
  | 'sheep'
  | 'goats'
  | 'cows'
  | 'horses'
  | 'birds'
  | 'feed'
  | 'equipment'
  | 'store';    // متجر / ملحمة → 5% بدون اشتراك، صفر مع اشتراك

export function isStoreExempt(permissions?: Record<string, unknown>): boolean {
  const v = permissions?.storeCommission;
  if (typeof v === 'number') return v <= 0;
  return false;
}

export interface CommissionRule {
  category: ListingCategory;
  nameAr: string;
  nameEn: string;
  icon: string;
  type: 'fixed' | 'percentage' | 'exempt_if_subscribed';
  value: number;
  unit: 'per_head' | 'percent_of_price' | 'on_request' | 'by_plan';
  descriptionAr: string;
  descriptionEn: string;
  subscriptionNote?: string; // ملاحظة خاصة بالاشتراك
  examplesAr?: string[];
}

export const COMMISSION_RULES: CommissionRule[] = [
  {
    category: 'sheep',
    nameAr: 'الأغنام',
    nameEn: 'Sheep',
    icon: '🐑',
    type: 'fixed',
    value: 20,
    unit: 'per_head',
    descriptionAr: '٢٠ ريال للرأس — جميع الأنواع',
    descriptionEn: '20 SAR per head — all breeds',
    examplesAr: ['نجدية', 'عواس', 'برقي', 'هجين', 'صفصافي', 'سمانة'],
  },
  {
    category: 'goats',
    nameAr: 'الماعز',
    nameEn: 'Goats',
    icon: '🐐',
    type: 'fixed',
    value: 20,
    unit: 'per_head',
    descriptionAr: '٢٠ ريال للرأس — جميع الأنواع',
    descriptionEn: '20 SAR per head — all breeds',
    examplesAr: ['شامي', 'بلدي', 'ماعز حليب', 'لبنى'],
  },
  {
    category: 'camels',
    nameAr: 'الإبل',
    nameEn: 'Camels',
    icon: '🐪',
    type: 'fixed',
    value: 60,
    unit: 'per_head',
    descriptionAr: '٦٠ ريال للرأس — جميع الأنواع',
    descriptionEn: '60 SAR per head — all breeds',
    examplesAr: ['نجدية', 'مجاهيم', 'مغاتير', 'شعل', 'ذلول', 'وضح'],
  },
  {
    category: 'horses',
    nameAr: 'الخيول',
    nameEn: 'Horses',
    icon: '🐎',
    type: 'percentage',
    value: 2,
    unit: 'percent_of_price',
    descriptionAr: '٢٪ من سعر الإعلان',
    descriptionEn: '2% of listing price',
    examplesAr: ['خيول عربية', 'خيول هجين', 'حمير', 'بغال'],
  },
  {
    category: 'cows',
    nameAr: 'الأبقار',
    nameEn: 'Cattle',
    icon: '🐄',
    type: 'percentage',
    value: 2,
    unit: 'percent_of_price',
    descriptionAr: '٢٪ من سعر الإعلان',
    descriptionEn: '2% of listing price',
    examplesAr: ['هولشتاين', 'فريزيان', 'بلدي', 'أبقار حليب'],
  },
  {
    category: 'birds',
    nameAr: 'الطيور والصقور',
    nameEn: 'Birds & Falcons',
    icon: '🦅',
    type: 'percentage',
    value: 2,
    unit: 'percent_of_price',
    descriptionAr: '٢٪ من سعر الإعلان',
    descriptionEn: '2% of listing price',
    examplesAr: ['صقور', 'حبارى', 'دجاج', 'طيور زينة'],
  },
  {
    category: 'feed',
    nameAr: 'الأعلاف والمؤن',
    nameEn: 'Feed & Fodder',
    icon: '🌾',
    type: 'percentage',
    value: 2,
    unit: 'percent_of_price',
    descriptionAr: '٢٪ من سعر الإعلان',
    descriptionEn: '2% of listing price',
  },
  {
    category: 'equipment',
    nameAr: 'المعدات والأدوات',
    nameEn: 'Equipment & Tools',
    icon: '⚙️',
    type: 'percentage',
    value: 2,
    unit: 'percent_of_price',
    descriptionAr: '٢٪ من سعر الإعلان',
    descriptionEn: '2% of listing price',
  },
  {
    category: 'store',
    nameAr: 'المتجر',
    nameEn: 'Store',
    icon: '🏪',
    type: 'exempt_if_subscribed',
    value: 5,
    unit: 'by_plan',
    descriptionAr: '٥٪ من سعر البيع (للمتجر بدون اشتراك)',
    descriptionEn: '5% of sale price (unsubscribed store)',
    subscriptionNote: 'المتجر الموثّق بـ اشتراك مدفوع = صفر عمولة',
  },
];

// ─── حساب العمولة ────────────────────────────────────────────────────────────

export interface CommissionCalcResult {
  category: ListingCategory;
  ruleNameAr: string;
  type: CommissionRule['type'];
  value: number;
  unit: string;
  quantity: number;
  price: number;
  commission: number;
  netAfterCommission: number;
  descriptionAr: string;

  isExempt: boolean;       // صفر عمولة بسبب الاشتراك
}

/**
 * احسب العمولة
 * @param category   فئة الإعلان
 * @param price      سعر الإعلان بالريال
 * @param quantity   عدد الرؤوس (للإبل والأغنام والماعز)
 * @param permissions  صلاحيات الاشتراك (للمتاجر)
 */
export function calculateCommission(
  category: ListingCategory,
  price: number,
  quantity: number = 1,
  permissions?: Record<string, unknown>,
): CommissionCalcResult {
  // Regular listings are free — commission applies to store/butcher only.
  if (category !== 'store') {
    return {
      category,
      ruleNameAr: 'إعلان عادي',
      type: 'fixed',
      value: 0,
      unit: 'per_head',
      quantity,
      price,
      commission: 0,
      netAfterCommission: price,
      descriptionAr: 'لا رسوم على إعلانات المواشي والمعدات',
      isExempt: true,
    };
  }

  const rule = COMMISSION_RULES.find((r) => r.category === 'store')!;

  let commission = 0;

  const isExempt = isStoreExempt(permissions);

  if (!isExempt) {
    const rate =
      typeof permissions?.storeCommission === 'number'
        ? (permissions.storeCommission as number)
        : rule.value;
    commission = Math.ceil((price * rate) / 100);
  }

  const displayDesc = isExempt
    ? 'صفر عمولة — ملحمة باشتراك مدفوع ✅'
    : `${rule.value}% من سعر البيع`;

  return {
    category,
    ruleNameAr: rule.nameAr,
    type: rule.type,
    value: rule.value,
    unit: rule.unit,
    quantity,
    price,
    commission,
    netAfterCommission: price - commission,
    descriptionAr: displayDesc,
    isExempt,
  };
}

// ─── جدول العمولات للعرض ─────────────────────────────────────────────────────

export interface CommissionTableRow {
  icon: string;
  nameAr: string;
  nameEn: string;
  ruleAr: string;
  ruleEn: string;
  color: string;
  note?: string;
}

export const COMMISSION_TABLE: CommissionTableRow[] = [
  { icon: '🏪', nameAr: 'ملحمة (بدون اشتراك)', nameEn: 'Butcher (no sub)', ruleAr: '٥٪ من سعر البيع', ruleEn: '5% of sale', color: '#A855F7' },
  { icon: '🏪✅', nameAr: 'ملحمة (باشتراك)', nameEn: 'Butcher (subscribed)', ruleAr: 'صفر عمولة', ruleEn: 'Zero commission', color: '#10B981', note: 'باقة Growth أو أعلى' },
];

// ─── نماذج رسوم تجريبية ──────────────────────────────────────────────────────

export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export interface PendingFee {
  id: string;
  listingId: string;
  listingTitleAr: string;
  category: ListingCategory;
  icon: string;
  quantity: number;
  price: number;
  commission: number;
  status: FeeStatus;
  dueDate: string;
  paidAt?: string;
  transactionId?: string;
}

// ─── ملخص الرسوم ─────────────────────────────────────────────────────────────

export interface FeesSummary {
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
}

export function getFeesSummary(fees: PendingFee[]): FeesSummary {
  const pending = fees.filter((f) => f.status === 'pending');
  const overdue = fees.filter((f) => f.status === 'overdue');
  const paid = fees.filter((f) => f.status === 'paid');
  return {
    totalPending: pending.reduce((s, f) => s + f.commission, 0),
    totalOverdue: overdue.reduce((s, f) => s + f.commission, 0),
    totalPaid: paid.reduce((s, f) => s + f.commission, 0),
    pendingCount: pending.length,
    overdueCount: overdue.length,
    paidCount: paid.length,
  };
}

export function formatDueDate(isoDate: string): { label: string; isOverdue: boolean; urgent: boolean } {
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 864e5);
  if (days < 0) return { label: `متأخر ${Math.abs(days)} يوم`, isOverdue: true, urgent: true };
  if (days === 0) return { label: 'اليوم آخر موعد', isOverdue: false, urgent: true };
  if (days === 1) return { label: 'غداً', isOverdue: false, urgent: true };
  if (days <= 3) return { label: `خلال ${days} أيام`, isOverdue: false, urgent: true };
  return { label: `خلال ${days} يومًا`, isOverdue: false, urgent: false };
}
