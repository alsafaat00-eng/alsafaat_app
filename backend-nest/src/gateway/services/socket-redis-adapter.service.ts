import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { Server } from 'socket.io';
import { LoggerService } from '../../common/services/logger.service';

const IS_DEV = process.env.NODE_ENV !== 'production';
const FORCE_MEMORY = process.env.SOCKET_USE_MEMORY_ADAPTER === 'true';

@Injectable()
export class SocketRedisAdapterService implements OnModuleDestroy {
  private pubClient: IORedis | null = null;
  private subClient: IORedis | null = null;

  constructor(private readonly logger: LoggerService) {}

  async setupAdapter(server: Server): Promise<void> {
    if (FORCE_MEMORY) {
      this.logger.warn(
        {},
        'SOCKET_USE_MEMORY_ADAPTER=true — using in-memory Socket.IO adapter',
      );
      return;
    }

    const redisOpts = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: 3,
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: null as null,
      retryStrategy: () => null,
    };

    const probe = new IORedis(redisOpts);
    probe.on('error', () => {});

    try {
      await probe.connect();
      await probe.ping();
    } catch (err) {
      if (!IS_DEV) {
        probe.disconnect();
        throw err;
      }
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Redis unavailable — using in-memory Socket.IO adapter (dev single-instance)',
      );
      probe.disconnect();
      return;
    }

    probe.disconnect();

    this.pubClient = new IORedis({
      ...redisOpts,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
    this.subClient = this.pubClient.duplicate();

    await this.pubClient.connect();
    await this.subClient.connect();

    server.adapter(createAdapter(this.pubClient, this.subClient));

    this.pubClient.on('error', (err) =>
      this.logger.error({ err: err.message }, 'Socket Redis pub error'),
    );
    this.subClient.on('error', (err) =>
      this.logger.error({ err: err.message }, 'Socket Redis sub error'),
    );
    this.logger.info({}, 'Socket.IO Redis adapter connected');
  }

  onModuleDestroy() {
    this.pubClient?.disconnect();
    this.subClient?.disconnect();
  }
}
