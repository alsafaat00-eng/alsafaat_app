import { Injectable } from '@nestjs/common';
import { throwApi } from '../common/exceptions/api.exception';
import { LoggerService } from '../common/services/logger.service';
import { AppNotificationsService } from '../queue/services/app-notifications.service';
import type { JwtPayload } from '../common/types/jwt-payload.interface';
import { SendMessageDto, ThreadMessagesQueryDto } from './dto/messages.dto';
import { MessagesRepository } from './repositories/messages.repository';

const PAGE_SIZE = 40;

@Injectable()
export class MessagesService {
  constructor(
    private readonly repo: MessagesRepository,
    private readonly logger: LoggerService,
    private readonly notifications: AppNotificationsService,
  ) {}

  async getThreads(user: JwtPayload) {
    const { userId } = user;

    const threads = await this.repo.findThreadsForUser(userId);

    const otherIds = threads.map((t) =>
      t.participant1 === userId ? t.participant2 : t.participant1,
    );

    const participants = await this.repo.findParticipants(otherIds);
    const participantMap = new Map(participants.map((p) => [p.id, p]));

    const unreadCounts = await this.repo.countUnreadByThread(
      userId,
      threads.map((t) => t.id),
    );
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.threadId, u._count.id]),
    );

    return threads.map((t) => {
      const otherId =
        t.participant1 === userId ? t.participant2 : t.participant1;
      const other = participantMap.get(otherId);
      const lastMsg = t.messages[0];
      return {
        id: t.id,
        participant: other ?? null,
        lastMessage:
          lastMsg?.text ||
          (lastMsg?.videoUrl ? '[فيديو]' : lastMsg?.imageUrl ? '[صورة]' : null),
        lastMessageAt: t.lastMessageAt,
        unread: unreadMap.get(t.id) ?? 0,
        isMine: lastMsg?.senderId === userId,
      };
    });
  }

  async sendMessage(user: JwtPayload, dto: SendMessageDto) {
    const { receiverId, text, imageUrl, videoUrl, orderId } = dto;
    const senderId = user.userId;

    const bodyText = text?.trim() || undefined;
    if (!bodyText && !imageUrl && !videoUrl) {
      throwApi(400, 'empty_message', 'يجب إرسال نص أو صورة أو فيديو');
    }

    if (receiverId === senderId) {
      throwApi(400, 'invalid_action', 'لا يمكنك مراسلة نفسك');
    }

    const receiver = await this.repo.findUserById(receiverId);
    if (!receiver) throwApi(404, 'not_found', 'المستخدم غير موجود');

    const [p1, p2] = [senderId, receiverId].sort();
    const thread = await this.repo.upsertThread(p1, p2);

    const message = await this.repo.createMessage({
      threadId: thread.id,
      senderId,
      receiverId,
      text: bodyText,
      imageUrl,
      videoUrl,
      orderId,
    });

    const senderName =
      message.sender.arabicName ||
      message.sender.displayName ||
      user.username ||
      'مستخدم';
    const notifyBody = bodyText
      ? bodyText
      : videoUrl
        ? 'أرسل فيديو'
        : 'أرسل صورة';
    void this.notifications.notifyUser({
      userId: receiverId,
      type: 'new_message',
      titleAr: senderName,
      bodyAr: notifyBody,
      data: {
        threadId: thread.id,
        messageId: message.id,
        senderId,
        actorId: senderId,
        actorAvatar: message.sender.avatar,
        ...(orderId ? { orderId } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(videoUrl ? { videoUrl } : {}),
      },
    });

    this.logger.info(
      { messageId: message.id, senderId, receiverId },
      'Message sent',
    );
    return { message, threadId: thread.id };
  }

  async getThreadMessages(
    user: JwtPayload,
    threadId: string,
    query: ThreadMessagesQueryDto,
  ) {
    const { userId } = user;
    const { cursor } = query;

    const thread = await this.repo.findThreadForUser(threadId, userId);
    if (!thread) throwApi(404, 'not_found', 'المحادثة غير موجودة');

    const messages = await this.repo.findMessages(
      threadId,
      PAGE_SIZE + 1,
      cursor,
    );

    const hasMore = messages.length > PAGE_SIZE;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    await this.repo.markThreadRead(threadId, userId);

    return { messages: items.reverse(), nextCursor, hasMore };
  }
}
