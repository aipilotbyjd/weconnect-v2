import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemAnalyticsDocument = SystemAnalytics & Document;

@Schema({ timestamps: true, collection: 'system_analytics' })
export class SystemAnalytics {
  @Prop({ default: 0, index: true })
  date: Date;

  @Prop({ required: true, default: 0 })
  totalRequests: number;

  @Prop({ default: 0 })
  successfulRequests: number;

  @Prop({ default: 0 })
  failedRequests: number;

  @Prop({ default: 0 })
  averageResponseTime: number; // in milliseconds

  @Prop({ default: 0 })
  peakRequestTime: Date;

  @Prop({ default: 0 })
  peakRequestCount: number;

  @Prop({ default: 0 })
  totalTraffic: number; // in MB

  @Prop({ type: Object })
  errors: {
    [errorType: string]: {
      count: number;
      latestOccurrence: Date;
    };
  };

  @Prop({ type: [String] })
  activeUsers: string[];

  @Prop({ default: 0 })
  uniqueUsers: number;

  @Prop({ default: 0 })
  averageUptime: number; // in percent

  @Prop({ type: Object })
  performance: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
  };

  @Prop({ type: Object })
  infrastructure: {
    totalInstances: number;
    healthyInstances: number;
    serviceBreakdown: Record<string, number>;
  };

  @Prop({ type: Object })
  systemEvents: {
    [eventType: string]: {
      count: number;
      latestOccurrence: Date;
    };
  };
}

export const SystemAnalyticsSchema = SchemaFactory.createForClass(SystemAnalytics);
