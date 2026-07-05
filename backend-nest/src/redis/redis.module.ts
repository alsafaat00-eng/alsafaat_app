import { Global, Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { RedisService } from './redis.service';
import { RedisCacheService } from './services/redis-cache.service';
import { RedisSessionService } from './services/redis-session.service';

@Global()
@Module({
  imports: [CommonModule],
  providers: [RedisService, RedisCacheService, RedisSessionService],
  exports: [RedisService, RedisCacheService, RedisSessionService],
})
export class RedisModule {}
