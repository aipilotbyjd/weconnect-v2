import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsCollector } from './metrics.collector';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'metrics-collection',
    }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCollector],
  exports: [MetricsService],
})
export class MetricsModule {}
