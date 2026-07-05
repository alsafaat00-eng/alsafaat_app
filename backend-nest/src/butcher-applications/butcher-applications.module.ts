import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { CommonModule } from '../common/common.module';
import { ButcherApplicationsController } from './butcher-applications.controller';
import { ButcherApplicationUserService } from './services/application.service';
import { ButcherApplicationDocumentService } from './services/document.service';
import { ButcherApplicationAdminService } from './services/admin.service';
import { ButcherApplicationNotificationsService } from './services/butcher-application-notifications.service';
import { TransactionService } from './services/transaction.service';
import { ApplicationRepository } from './repositories/application.repository';
import { DocumentRepository } from './repositories/document.repository';

@Module({
  imports: [PrismaModule, QueueModule, CommonModule],
  controllers: [ButcherApplicationsController],
  providers: [
    ApplicationRepository,
    DocumentRepository,
    TransactionService,
    ButcherApplicationUserService,
    ButcherApplicationDocumentService,
    ButcherApplicationAdminService,
    ButcherApplicationNotificationsService,
  ],
  exports: [
    ApplicationRepository,
    ButcherApplicationUserService,
    ButcherApplicationDocumentService,
    ButcherApplicationAdminService,
  ],
})
export class ButcherApplicationsModule {}
