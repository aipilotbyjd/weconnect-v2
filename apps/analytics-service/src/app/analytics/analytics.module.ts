import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { WorkflowAnalytics, WorkflowAnalyticsSchema } from './schemas/workflow-analytics.schema';
import { NodeAnalytics, NodeAnalyticsSchema } from './schemas/node-analytics.schema';
import { UserAnalytics, UserAnalyticsSchema } from './schemas/user-analytics.schema';
import { SystemAnalytics, SystemAnalyticsSchema } from './schemas/system-analytics.schema';
import { AnalyticsProcessor } from './analytics.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowAnalytics.name, schema: WorkflowAnalyticsSchema },
      { name: NodeAnalytics.name, schema: NodeAnalyticsSchema },
      { name: UserAnalytics.name, schema: UserAnalyticsSchema },
      { name: SystemAnalytics.name, schema: SystemAnalyticsSchema },
    ]),
    BullModule.registerQueue({
      name: 'analytics-processing',
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
