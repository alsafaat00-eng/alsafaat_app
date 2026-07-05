import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserFcmToken(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
  }

  createNotification(data: {
    id: string;
    userId: string;
    type: string;
    titleAr: string;
    bodyAr: string;
    data: Record<string, string>;
  }) {
    return this.prisma.notification.create({
      data: {
        id: data.id,
        userId: data.userId,
        type: data.type as never,
        titleAr: data.titleAr,
        bodyAr: data.bodyAr,
        data: data.data,
      },
    });
  }
}
