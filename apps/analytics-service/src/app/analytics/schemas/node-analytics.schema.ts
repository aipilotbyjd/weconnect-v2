import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NodeAnalyticsDocument = NodeAnalytics & Document;

@Schema({ timestamps: true, collection: 'node_analytics' })
export class NodeAnalytics {
  @Prop({ required: true, index: true })
  nodeId: string;

  @Prop({ required: true })
  nodeName: string;

  @Prop({ required: true })
  nodeType: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['success', 'error', 'skipped', 'timeout'] })
  status: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: 0 })
  duration: number; // in milliseconds

  @Prop({ type: Object })
  inputData: Record<string, any>;

  @Prop({ type: Object })
  outputData: Record<string, any>;

  @Prop({ type: Object })
  errorDetails: {
    error?: string;
    stack?: string;
    code?: string;
  };

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 0 })
  memoryUsage: number; // in MB

  @Prop({ default: 0 })
  cpuUsage: number; // percentage

  @Prop({ type: Object })
  performance: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ index: true })
  environment: string;
}

export const NodeAnalyticsSchema = SchemaFactory.createForClass(NodeAnalytics);
