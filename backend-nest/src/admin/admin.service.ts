import { Injectable } from '@nestjs/common';
import { AdminRepository } from './repositories/admin.repository';
import { ButcherApplicationAdminService } from '../butcher-applications/services/admin.service';
import { ApplicationRepository } from '../butcher-applications/repositories/application.repository';
import { JwtTokenService } from '../auth/services/jwt-token.service';
import { RedisSessionService } from '../redis/services/redis-session.service';
import { AuthRepository } from '../auth/repositories/auth.repository';
import { LoggerService } from '../common/services/logger.service';
import { throwApi, ApiException } from '../common/exceptions/api.exception';
import { parseApplicationId } from '../butcher-applications/routes/parseRequest';
import {
  adminListQuerySchema,
  approveBodySchema,
  rejectBodySchema,
  commentBodySchema,
} from '../butcher-applications/routes/schemas';
import type { JwtPayload } from '../common/types/jwt-payload.interface';
import type {
  ApproveApplicationBodyDto,
  CommentApplicationBodyDto,
  RejectApplicationBodyDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly butcherApplications: ButcherApplicationAdminService,
    private readonly applicationRepo: ApplicationRepository,
    private readonly jwt: JwtTokenService,
    private readonly sessions: RedisSessionService,
    private readonly authRepo: AuthRepository,
    private readonly logger: LoggerService,
  ) {}

  async runCleanup() {
    const now = new Date();

    this.logger.info({}, 'Running scheduled cleanup');

    const [sessions, notifications, stories, offers] =
      await this.repo.runCleanup(now);

    const stats = {
      expiredSessions: sessions.count,
      oldNotifications: notifications.count,
      expiredStories: stories.count,
      expiredOffers: offers.count,
    };

    this.logger.info({ stats }, 'Cleanup complete');
    return stats;
  }

  async assertAdminBearer(authHeader: string | undefined): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) {
      throwApi(403, 'forbidden', 'غير مسموح');
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwt.verifyAccessToken(token);

      const blacklisted = await this.sessions.get<boolean>(
        `blacklist:${token}`,
      );
      if (blacklisted) throwApi(403, 'forbidden', 'غير مسموح');

      const user = await this.authRepo.getPasswordVersion(payload.userId);
      if (!user || (payload.passwordVersion ?? 0) !== user.passwordVersion) {
        throwApi(403, 'forbidden', 'غير مسموح');
      }

      const active = await this.authRepo.isUserActive(payload.userId);
      if (!active?.isActive) throwApi(403, 'forbidden', 'غير مسموح');

      if (payload.role !== 'ADMIN') throwApi(403, 'forbidden', 'غير مسموح');
    } catch (err) {
      if (err instanceof ApiException) throw err;
      throwApi(403, 'forbidden', 'غير مسموح');
    }
  }

  async runCleanupAuthorized(cronSecret?: string, authHeader?: string) {
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      return this.runCleanup();
    }
    await this.assertAdminBearer(authHeader);
    return this.runCleanup();
  }

  async listButcherApplications(query: Record<string, unknown>) {
    const parsed = adminListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throwApi(
        400,
        'validation_error',
        'بيانات غير صحيحة',
        parsed.error.flatten(),
      );
    }

    const [page, draft] = await Promise.all([
      this.butcherApplications.listApplications(parsed.data),
      this.applicationRepo.countDraftApplications(),
    ]);

    return {
      applications: page.items,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      counts: { submitted: page.counts.submitted, draft },
    };
  }

  async getButcherApplication(id: string) {
    const applicationId = parseApplicationId({ id });
    if (!applicationId) throwApi(400, 'invalid_id', 'معرّف غير صالح');
    return this.butcherApplications.getApplication(applicationId);
  }

  async approveButcherApplication(
    user: JwtPayload,
    id: string,
    body: ApproveApplicationBodyDto,
  ) {
    const applicationId = parseApplicationId({ id });
    if (!applicationId) throwApi(400, 'invalid_id', 'معرّف غير صحيح');

    const parsed = approveBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throwApi(
        400,
        'validation_error',
        'بيانات غير صحيحة',
        parsed.error.flatten(),
      );
    }

    return this.butcherApplications.approveApplication(
      user.userId,
      applicationId,
      parsed.data as ApproveApplicationBodyDto,
    );
  }

  async rejectButcherApplication(
    user: JwtPayload,
    id: string,
    body: RejectApplicationBodyDto,
  ) {
    const applicationId = parseApplicationId({ id });
    if (!applicationId) throwApi(400, 'invalid_id', 'معرّف غير صحيح');

    const parsed = rejectBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throwApi(
        400,
        'validation_error',
        'بيانات غير صحيحة',
        parsed.error.flatten(),
      );
    }

    return this.butcherApplications.rejectApplication(
      user.userId,
      applicationId,
      parsed.data as RejectApplicationBodyDto,
    );
  }

  async addButcherApplicationComment(
    user: JwtPayload,
    id: string,
    body: CommentApplicationBodyDto,
  ) {
    const applicationId = parseApplicationId({ id });
    if (!applicationId) throwApi(400, 'invalid_id', 'معرّف غير صحيح');

    const parsed = commentBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throwApi(
        400,
        'validation_error',
        'بيانات غير صحيحة',
        parsed.error.flatten(),
      );
    }

    const timelineEvent = await this.butcherApplications.addComment(
      user.userId,
      applicationId,
      parsed.data as CommentApplicationBodyDto,
    );
    return { timelineEvent };
  }
}
