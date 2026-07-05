import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerService } from '../../common/services/logger.service';
import { PushQueueService } from './push-queue.service';
import { NotificationRepository } from '../repositories/notification.repository';
import type { NotificationJob } from '../types/queue.types';

@Injectable()
export class NotificationPersistService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly pushQueue: PushQueueService,
    private readonly logger: LoggerService,
  ) {}

  async enqueuePushAfterPersist(params: {
    userId: string;
    notificationId: string;
    type: string;
    titleAr: string;
    bodyAr: string;
    data: Record<string, string>;
  }): Promise<void> {
    try {
      const user = await this.notifications.findUserFcmToken(params.userId);
      if (!user?.fcmToken) return;

      await this.pushQueue.addPush({
        fcmToken: user.fcmToken,
        titleAr: params.titleAr,
        bodyAr: params.bodyAr,
        data: params.data,
      });
    } catch (err) {
      this.logger.warn(
        { err, userId: params.userId, notificationId: params.notificationId },
        'Failed to enqueue push after notification persist',
      );
    }
  }

  async persistNotificationAndEnqueuePush(
    job: NotificationJob,
  ): Promise<string> {
    const notificationId = randomUUID();
    const data: Record<string, string> = {
      ...(job.data || {}),
      notificationId,
    };

    await this.notifications.createNotification({
      id: notificationId,
      userId: job.userId,
      type: job.type,
      titleAr: job.titleAr,
      bodyAr: job.bodyAr,
      data,
    });

    await this.enqueuePushAfterPersist({
      userId: job.userId,
      notificationId,
      type: job.type,
      titleAr: job.titleAr,
      bodyAr: job.bodyAr,
      data: { ...data, type: job.type },
    });

    return notificationId;
  }
}
