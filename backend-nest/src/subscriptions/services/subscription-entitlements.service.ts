import { Injectable } from '@nestjs/common';
import { getPlanById, type PlanId } from '../../lib/plans';
import {
  getEffectivePlanId,
  getFeaturedLimit,
  getListingLimit,
  getMaxImages,
  hasPrioritySearch,
} from '../../lib/subscription-lifecycle';
import { throwApi } from '../../common/exceptions/api.exception';
import { SubscriptionLifecycleRepository } from '../repositories/subscription-lifecycle.repository';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

@Injectable()
export class SubscriptionEntitlementsService {
  constructor(
    private readonly repo: SubscriptionLifecycleRepository,
    private readonly lifecycle: SubscriptionLifecycleService,
  ) {}

  async getEffectivePlanForUser(userId: string): Promise<PlanId> {
    const view = await this.lifecycle.getForUser(userId);
    return view?.effectivePlanId ?? 'free';
  }

  async assertCanCreateListing(
    userId: string,
    params: { images: string[]; featured: boolean },
  ): Promise<PlanId> {
    const row = await this.repo.findByUserId(userId);
    if (!row) throwApi(404, 'ref_not_found', 'الاشتراك غير موجود');

    await this.lifecycle.expireIfNeeded(row);
    const fresh = await this.repo.findByUserId(userId);
    if (!fresh) throwApi(404, 'ref_not_found', 'الاشتراك غير موجود');

    const planId = getEffectivePlanId(fresh);
    const limit = getListingLimit(planId);

    if (fresh.listingsUsed >= limit) {
      throwApi(
        403,
        'listing_limit',
        `وصلت للحد الأقصى (${limit} إعلانات). يرجى ترقية الباقة.`,
      );
    }

    const maxImages = getMaxImages(planId);
    if (params.images.length > maxImages) {
      throwApi(
        400,
        'validation_error',
        `الحد الأقصى للصور في باقتك (${maxImages})`,
      );
    }

    if (params.featured) {
      const featuredLimit = getFeaturedLimit(planId);
      if (featuredLimit <= 0) {
        throwApi(403, 'plan_required', 'الإعلانات المميزة غير متاحة في باقتك');
      }
      const featuredCount = await this.repo.countActiveFeaturedListings(userId);
      if (featuredCount >= featuredLimit) {
        throw Object.assign(new Error(`featured_limit:${featuredLimit}`), {
          code: 'featured_limit',
          limit: featuredLimit,
        });
      }
    }

    return planId;
  }

  planPriorityBoost(planId: PlanId): number {
    if (!hasPrioritySearch(planId)) return 0;
    const plan = getPlanById(planId);
    return plan.id === 'vip' ? 3 : plan.id === 'pro' ? 2 : 1;
  }
}
