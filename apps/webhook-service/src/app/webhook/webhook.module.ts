import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { DynamicWebhookController } from './dynamic-webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import { WorkflowProcessor } from './workflow.processor';
import { WebhookValidationService } from './webhook-validation.service';
import { WebhookSecurityService } from './webhook-security.service';
import { DatabaseModule } from '../../../../../libs/src/lib/database.module';

@Module({
  imports: [
    DatabaseModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    BullModule.registerQueue({
      name: 'webhook-queue',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    BullModule.registerQueue({
      name: 'workflow-trigger-queue',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  controllers: [WebhookController, DynamicWebhookController],
  providers: [
    WebhookService,
    WebhookProcessor,
    WorkflowProcessor,
    WebhookValidationService,
    WebhookSecurityService,
  ],
  exports: [WebhookService, WebhookSecurityService, WebhookValidationService],
})
export class WebhookModule {}
