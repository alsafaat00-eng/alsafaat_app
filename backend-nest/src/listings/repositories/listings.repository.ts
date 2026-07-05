import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PlanId } from '../../lib/plans';
import { getListingLimit } from '../../lib/subscription-lifecycle';
import { PrismaService } from '../../prisma/prisma.service';

const SELLER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  arabicName: true,
  avatar: true,
  verified: true,
  country: true,
} as const;

const SELLER_DETAIL_SELECT = {
  ...SELLER_SELECT,
  bio: true,
} as const;

@Injectable()
export class ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: {
    where: Prisma.ListingWhereInput;
    take: number;
    cursor?: string;
    orderBy: Prisma.ListingOrderByWithRelationInput[];
  }) {
    return this.prisma.listing.findMany({
      where: params.where,
      take: params.take,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      orderBy: params.orderBy,
      include: {
        seller: {
          select: {
            ...SELLER_SELECT,
            subscription: { select: { planId: true } },
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        seller: { select: SELLER_DETAIL_SELECT },
        fee: { select: { status: true, commission: true, dueDate: true } },
      },
    });
  }

  findOwnerMeta(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true, category: true, country: true },
    });
  }

  findSellerId(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true },
    });
  }

  incrementViews(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  update(id: string, data: Prisma.ListingUpdateInput) {
    return this.prisma.listing.update({ where: { id }, data });
  }

  markSold(id: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'sold' },
    });
  }

  createListingWithFee(params: {
    userId: string;
    effectivePlanId: PlanId;
    data: Omit<Prisma.ListingUncheckedCreateInput, 'sellerId'>;
    commission: number;
    dueDate: Date;
    category: string;
    quantity: number;
    price: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { userId: params.userId },
        select: { planId: true, listingsUsed: true },
      });

      const limit = getListingLimit(params.effectivePlanId);
      if (limit < Number.MAX_SAFE_INTEGER && sub) {
        if (sub.listingsUsed >= limit) {
          throw Object.assign(new Error(`listing_limit:${limit}`), {
            code: 'listing_limit',
            limit,
          });
        }
      }

      const created = await tx.listing.create({
        data: {
          ...params.data,
          sellerId: params.userId,
          fee: {
            create: {
              userId: params.userId,
              category: params.category,
              quantity: params.quantity,
              price: params.price,
              commission: params.commission,
              dueDate: params.dueDate,
              status: 'pending',
            },
          },
        },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              displayName: true,
              arabicName: true,
              avatar: true,
            },
          },
          fee: true,
        },
      });

      if (sub) {
        await tx.subscription.update({
          where: { userId: params.userId },
          data: { listingsUsed: { increment: 1 } },
        });
      }

      return created;
    });
  }
}
