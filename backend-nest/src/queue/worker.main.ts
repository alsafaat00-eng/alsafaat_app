import '../load-env';
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '../common/services/logger.service';
import { WorkerModule } from './queue.module';
import { WorkerCronService } from './services/worker-cron.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
  });
  app.get(WorkerCronService);
  const logger = app.get(LoggerService);
  logger.info({}, 'Worker application context started');
}

bootstrap().catch((err) => {
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
