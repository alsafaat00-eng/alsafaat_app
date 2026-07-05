import { Global, Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { SubscriptionLifecycleRepository } from './repositories/subscription-lifecycle.repository';
import { SubscriptionCacheService } from './services/subscription-cache.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { SubscriptionEntitlementsService } from './services/subscription-entitlements.service';

@Global()
@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsRepository,
    SubscriptionLifecycleRepository,
    SubscriptionCacheService,
    SubscriptionLifecycleService,
    SubscriptionEntitlementsService,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionCacheService,
    SubscriptionLifecycleService,
    SubscriptionEntitlementsService,
    SubscriptionLifecycleRepository,
  ],
})
export class SubscriptionsModule {}
