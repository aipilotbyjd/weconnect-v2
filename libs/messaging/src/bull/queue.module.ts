import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EnhancedQueueService } from './enhanced-queue.service';
import {
  WorkflowExecutionProcessor,
  NodeExecutionProcessor,
  WebhookProcessingProcessor,
  NotificationProcessor,
  AnalyticsProcessor,
} from './queue-processors.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    
    // Configure BullMQ with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
        settings: {
          stalledInterval: 30 * 1000,
          maxStalledCount: 1,
        },
      }),
      inject: [ConfigService],
    }),

    // Define individual queues
    BullModule.registerQueue(
      {
        name: 'workflow-execution',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      },
      {
        name: 'node-execution',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 300,
        },
      },
      {
        name: 'webhook-processing',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      },
      {
        name: 'notification',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 300,
        },
      },
      {
        name: 'analytics',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: 200,
          removeOnFail: 100,
        },
      },
    ),
  ],
  providers: [
    EnhancedQueueService,
    WorkflowExecutionProcessor,
    NodeExecutionProcessor,
    WebhookProcessingProcessor,
    NotificationProcessor,
    AnalyticsProcessor,
  ],
  exports: [
    EnhancedQueueService,
    BullModule,
  ],
})
export class QueueModule {}
