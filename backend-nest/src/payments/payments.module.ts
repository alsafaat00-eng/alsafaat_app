import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { RawBodyMiddleware } from '../common/middleware/raw-body.middleware';
import { PaymentRedirectController } from './payment-redirect.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  controllers: [PaymentsController, PaymentRedirectController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'payments/webhook', method: RequestMethod.POST });
  }
}
