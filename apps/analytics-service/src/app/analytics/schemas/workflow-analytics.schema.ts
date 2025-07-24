import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowAnalyticsDocument = WorkflowAnalytics & Document;

@Schema({ timestamps: true, collection: 'workflow_analytics' })
export class WorkflowAnalytics {
  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  workflowName: string;

  @Prop({ required: true, index: true })
  executionId: string;

  @Prop({ required: true, enum: ['success', 'error', 'cancelled', 'timeout'] })
  status: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: 0 })
  duration: number; // in milliseconds

  @Prop({ default: 0 })
  nodeCount: number;

  @Prop({ default: 0 })
  successfulNodes: number;

  @Prop({ default: 0 })
  failedNodes: number;

  @Prop({ type: Object })
  inputData: Record<string, any>;

  @Prop({ type: Object })
  outputData: Record<string, any>;

  @Prop({ type: Object })
  errorDetails: {
    nodeId?: string;
    error?: string;
    stack?: string;
  };

  @Prop({ default: 0 })
  memoryUsage: number; // in MB

  @Prop({ default: 0 })
  cpuUsage: number; // percentage

  @Prop({ enum: ['manual', 'webhook', 'schedule', 'api', 'test'] })
  triggerType: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop({ index: true })
  environment: string; // 'production', 'staging', 'development'
}

export const WorkflowAnalyticsSchema = SchemaFactory.createForClass(WorkflowAnalytics);
