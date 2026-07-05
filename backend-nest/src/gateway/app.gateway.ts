import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../common/types/jwt-payload.interface';
import { LoggerService } from '../common/services/logger.service';
import {
  ChatReadDto,
  ChatSendDto,
  ChatTypingDto,
  LiveCommentDto,
  OrderStatusDto,
} from './dto/socket-events.dto';
import { SocketEmitService } from './services/socket-emit.service';
import { SocketGatewayService } from './services/socket-gateway.service';
import { SocketRedisAdapterService } from './services/socket-redis-adapter.service';

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3002', 10);
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:8081'
).split(',');

interface AuthenticatedSocket extends Socket {
  data: { user?: JwtPayload; streamId?: string };
}

@Injectable()
@WebSocketGateway(SOCKET_PORT, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketService: SocketGatewayService,
    private readonly emitService: SocketEmitService,
    private readonly redisAdapter: SocketRedisAdapterService,
    private readonly logger: LoggerService,
  ) {}

  async afterInit(server: Server) {
    await this.redisAdapter.setupAdapter(server);
    this.emitService.setServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = await this.socketService.authenticate(client);
      client.data.user = user;
      this.logger.info(
        { userId: user.userId, socketId: client.id },
        'Socket connected',
      );
      void client.join(`user:${user.userId}`);
      await this.socketService.onUserConnected(user.userId, client.id);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;

    this.logger.info({ userId: user.userId }, 'Socket disconnected');
    this.socketService.onUserDisconnected(user.userId);
  }

  @SubscribeMessage('chat:join')
  async onChatJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() threadId: unknown,
  ) {
    const parsed = this.socketService.parseUuid(threadId);
    if (!parsed)
      return this.emitErr(client, 'invalid_input', 'Invalid threadId');

    const err = await this.socketService.handleChatJoin(
      parsed,
      client.data.user!.userId,
    );
    if (err) return this.emitErr(client, err.code, err.message);

    void client.join(`thread:${parsed}`);
  }

  @SubscribeMessage('chat:leave')
  onChatLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() threadId: unknown,
  ) {
    const parsed = this.socketService.parseUuid(threadId);
    if (!parsed) return;
    void client.leave(`thread:${parsed}`);
  }

  @SubscribeMessage('chat:send')
  async onChatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const data = this.socketService.validateDto(ChatSendDto, raw);
    if (!data)
      return this.emitErr(client, 'invalid_input', 'Invalid message data');

    const err = await this.socketService.handleChatSend(
      client.data.user!,
      data,
    );
    if (err) this.emitErr(client, err.code, err.message);
  }

  @SubscribeMessage('chat:typing')
  onChatTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const data = this.socketService.validateDto(ChatTypingDto, raw);
    if (!data) return;

    this.socketService.handleChatTyping(client.data.user!, data);
  }

  @SubscribeMessage('chat:read')
  async onChatRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const data = this.socketService.validateDto(ChatReadDto, raw);
    if (!data) return;

    await this.socketService.handleChatRead(client.data.user!, data);
  }

  @SubscribeMessage('live:join')
  async onLiveJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() streamId: unknown,
  ) {
    const parsed = this.socketService.parseUuid(streamId);
    if (!parsed)
      return this.emitErr(client, 'invalid_input', 'Invalid streamId');

    const user = client.data.user!;
    const result = await this.socketService.handleLiveJoin(
      parsed,
      user,
      (event, data) => client.emit(event, data),
    );

    if ('code' in result) {
      return this.emitErr(client, result.code, result.message);
    }

    void client.join(`stream:${parsed}`);
    client.data.streamId = parsed;
  }

  @SubscribeMessage('live:leave')
  async onLiveLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() streamId: unknown,
  ) {
    const parsed = this.socketService.parseUuid(streamId);
    if (!parsed) return;

    void client.leave(`stream:${parsed}`);
    await this.socketService.handleLiveLeave(parsed);
  }

  @SubscribeMessage('live:comment')
  async onLiveComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const data = this.socketService.validateDto(LiveCommentDto, raw);
    if (!data)
      return this.emitErr(client, 'invalid_input', 'Invalid comment data');

    const err = await this.socketService.handleLiveComment(
      client.data.user!,
      data,
    );
    if (err) this.emitErr(client, err.code, err.message);
  }

  @SubscribeMessage('live:like')
  async onLiveLike(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() streamId: unknown,
  ) {
    const parsed = this.socketService.parseUuid(streamId);
    if (!parsed) return;

    await this.socketService.handleLiveLike(parsed, client.data.user!);
  }

  @SubscribeMessage('order:status')
  async onOrderStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const data = this.socketService.validateDto(OrderStatusDto, raw);
    if (!data)
      return this.emitErr(client, 'invalid_input', 'Invalid order data');

    const err = await this.socketService.handleOrderStatus(
      client.data.user!,
      data,
    );
    if (err) this.emitErr(client, err.code, err.message);
  }

  @SubscribeMessage('presence:ping')
  onPresencePing(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user!;
    this.socketService.onPresencePing(user.userId, client.id);
  }

  @SubscribeMessage('notifications:read')
  async onNotificationsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    await this.socketService.handleNotificationsRead(
      client.data.user!.userId,
      raw,
    );
  }

  private emitErr(client: Socket, code: string, message: string) {
    client.emit('error', { code, message });
  }
}
