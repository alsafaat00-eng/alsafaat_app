import '../load-env';
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '../common/services/logger.service';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, { logger: false });
  await app.init();

  const port = parseInt(process.env.SOCKET_PORT || '3002', 10);
  const logger = app.get(LoggerService);
  logger.info({ port }, '🔌 Socket.IO server running');
}

bootstrap().catch((err) => {
  console.error('Socket server failed', err);
  process.exit(1);
});
