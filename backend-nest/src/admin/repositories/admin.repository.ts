import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  runCleanup(now: Date) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return Promise.all([
      this.prisma.userSession.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.notification.deleteMany({
        where: { isRead: true, createdAt: { lt: ninetyDaysAgo } },
      }),
      this.prisma.story.deleteMany({
        where: { expiresAt: { lt: thirtyDaysAgo } },
      }),
      this.prisma.butcherOffer.deleteMany({
        where: { validUntil: { lt: thirtyDaysAgo } },
      }),
    ]);
  }
}
