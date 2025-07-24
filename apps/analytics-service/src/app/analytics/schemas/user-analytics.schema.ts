import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserAnalyticsDocument = UserAnalytics & Document;

@Schema({ timestamps: true, collection: 'user_analytics' })
export class UserAnalytics {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  date: Date; // Daily aggregation

  @Prop({ default: 0 })
  workflowsCreated: number;

  @Prop({ default: 0 })
  workflowsExecuted: number;

  @Prop({ default: 0 })
  successfulExecutions: number;

  @Prop({ default: 0 })
  failedExecutions: number;

  @Prop({ default: 0 })
  totalExecutionTime: number; // in milliseconds

  @Prop({ default: 0 })
  webhooksCreated: number;

  @Prop({ default: 0 })
  webhooksCalled: number;

  @Prop({ default: 0 })
  nodesUsed: number;

  @Prop({ type: [String] })
  uniqueNodeTypes: string[];

  @Prop({ default: 0 })
  apiCalls: number;

  @Prop({ default: 0 })
  sessionDuration: number; // in minutes

  @Prop({ type: Object })
  usage: {
    cpu: number;
    memory: number;
    storage: number;
  };

  @Prop({ type: Object })
  preferences: {
    theme?: string;
    language?: string;
    timezone?: string;
  };

  @Prop({ type: Object })
  features: {
    [feature: string]: {
      used: boolean;
      count: number;
      lastUsed: Date;
    };
  };

  @Prop({ index: true })
  environment: string;
}

export const UserAnalyticsSchema = SchemaFactory.createForClass(UserAnalytics);
