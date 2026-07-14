import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { SocketDisconnectService } from '../../gateway/services/socket-disconnect.service';
import { throwApi } from '../../common/exceptions/api.exception';
import { AppNotificationsService } from '../../queue/services/app-notifications.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { UsersRepository } from '../repositories/users.repository';
import {
  ConnectionsQueryDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from '../dto/users.dto';

const PAGE_SIZE = 50;
const PROFILE_CACHE_TTL = 300;

type ProfileUser = NonNullable<
  Awaited<ReturnType<UsersRepository['findUserProfile']>>
>;

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly socketDisconnect: SocketDisconnectService,
    private readonly notifications: AppNotificationsService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const users = await this.repo.findActiveUsers(query.search);
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      arabicName: u.arabicName,
      avatar: u.avatar,
      verified: u.verified,
      bio: u.bio,
      country: u.country,
      followers: u._count.followers,
    }));
  }

  async getUser(id: string, viewer?: JwtPayload) {
    if (!id) throwApi(400, 'invalid_id', 'معرّف غير صالح');

    // Cache shared profile fields only — never cache viewer-specific isFollowing
    // Key versioned so stale entries that baked in isFollowing are ignored
    const cacheKey = `user:${id}:base`;
    let base = await this.redis.cacheGet<Record<string, unknown>>(cacheKey);
    if (!base) {
      const user = await this.repo.findUserProfile(id);
      if (!user) throwApi(404, 'not_found', 'المستخدم غير موجود');
      base = this.formatProfile(user);
      await this.redis.cacheSet(cacheKey, base, PROFILE_CACHE_TTL);
    }

    let isFollowing = false;
    if (viewer?.userId && viewer.userId !== id) {
      const follow = await this.repo.findFollow(viewer.userId, id);
      isFollowing = !!follow;
    }

    return { ...base, isFollowing };
  }

  async updateUser(id: string, user: JwtPayload, dto: UpdateUserDto) {
    if (id !== user.userId && user.role !== 'ADMIN') {
      throwApi(403, 'forbidden', 'غير مسموح');
    }

    if (dto.username) {
      const conflict = await this.repo.findByUsername(dto.username, id);
      if (conflict) {
        throwApi(409, 'username_taken', 'اسم المستخدم مستخدم بالفعل');
      }
    }

    try {
      const { fcmToken, ...profileData } = dto;
      const updated = await this.repo.updateUser(id, {
        ...profileData,
        ...(fcmToken !== undefined ? { fcmToken } : {}),
      });

      await this.redis.cacheDel(`user:${id}`, `user:${id}:base`);
      this.logger.info({ userId: id }, 'User profile updated');

      const reviewCount = updated.butcherProfile?.reviewCount ?? 0;
      return {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        arabicName: updated.arabicName,
        avatar: updated.avatar,
        coverImage: updated.coverImage,
        bio: updated.bio,
        verified: updated.verified,
        country: updated.country,
        rating: reviewCount > 0 ? updated.butcherProfile!.rating : null,
        reviewCount,
        followersCount: updated._count.followers,
        followingCount: updated._count.following,
      };
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002') {
        throwApi(409, 'username_taken', 'اسم المستخدم مستخدم بالفعل');
      }
      throw err;
    }
  }

  async deleteUser(id: string, user: JwtPayload) {
    if (id !== user.userId && user.role !== 'ADMIN') {
      throwApi(403, 'forbidden', 'غير مسموح');
    }

    await this.repo.deactivateUser(id);
    await this.socketDisconnect.disconnectUser(id);
    await this.redis.cacheDel(`user:${id}`, `user:${id}:base`);
    this.logger.info(
      { userId: id, by: user.userId },
      'User account deactivated',
    );
    return { deleted: true };
  }

  async toggleFollow(targetId: string, followerId: string) {
    if (targetId === followerId) {
      throwApi(400, 'invalid_action', 'لا يمكنك متابعة نفسك');
    }

    const target = await this.repo.findUserById(targetId, {
      id: true,
      arabicName: true,
    });
    if (!target) throwApi(404, 'not_found', 'المستخدم غير موجود');

    const existing = await this.repo.findFollow(followerId, targetId);
    if (existing) {
      await this.repo.deleteFollow(followerId, targetId);
      await this.redis.cacheDel(`user:${targetId}`, `user:${targetId}:base`);
      this.logger.info({ followerId, targetId }, 'User unfollowed');
      return { following: false };
    }

    await this.repo.createFollow(followerId, targetId);

    const follower = await this.repo.findUserById(followerId, {
      arabicName: true,
      avatar: true,
    });

    void this.notifications.notifyUser({
      userId: targetId,
      type: 'follow',
      titleAr: 'متابع جديد',
      bodyAr: `${follower?.arabicName || 'مستخدم'} بدأ متابعتك`,
      data: { actorId: followerId, actorAvatar: follower?.avatar },
    });

    await this.redis.cacheDel(`user:${targetId}`, `user:${targetId}:base`);
    this.logger.info({ followerId, targetId }, 'User followed');
    return { following: true };
  }

  async getConnections(
    id: string,
    query: ConnectionsQueryDto,
    viewer?: JwtPayload,
  ) {
    const type = query.type ?? 'followers';

    if (!id) throwApi(400, 'invalid_id', 'معرّف غير صالح');
    if (type !== 'followers' && type !== 'following') {
      throwApi(400, 'invalid_type', 'نوع القائمة غير صالح');
    }

    const target = await this.repo.findActiveUserId(id);
    if (!target) throwApi(404, 'not_found', 'المستخدم غير موجود');

    const rows =
      type === 'followers'
        ? await this.repo.findFollowers(id, PAGE_SIZE)
        : await this.repo.findFollowing(id, PAGE_SIZE);

    const users = rows.map((row) =>
      'follower' in row ? row.follower : row.following,
    );

    let followingSet = new Set<string>();
    if (viewer?.userId && users.length > 0) {
      const myFollows = await this.repo.findFollowsByViewer(
        viewer.userId,
        users.map((u) => u.id),
      );
      followingSet = new Set(myFollows.map((f) => f.followingId));
    }

    return {
      type,
      users: users.map((u) => ({
        ...u,
        isFollowing: viewer?.userId === u.id ? false : followingSet.has(u.id),
      })),
    };
  }

  private resolveAccountType(user: ProfileUser): 'USER' | 'BUTCHER' | 'LIVESTOCK_TRADER' {
    if (user.role === 'BUTCHER' || user.butcherProfile) return 'BUTCHER';
    if (user._count.listings > 0) return 'LIVESTOCK_TRADER';
    return 'USER';
  }

  private formatProfile(user: ProfileUser) {
    const reviewCount = user.butcherProfile?.reviewCount ?? 0;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      arabicName: user.arabicName,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      verified: user.verified,
      country: user.country,
      role: user.role,
      accountType: this.resolveAccountType(user),
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      rating: reviewCount > 0 ? user.butcherProfile!.rating : null,
      reviewCount,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      listingsCount: user._count.listings,
      postsCount: user._count.posts,
    };
  }
}
