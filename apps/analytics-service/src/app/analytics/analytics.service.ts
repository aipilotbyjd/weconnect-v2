import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

import { WorkflowAnalytics, WorkflowAnalyticsDocument } from './schemas/workflow-analytics.schema';
import { NodeAnalytics, NodeAnalyticsDocument } from './schemas/node-analytics.schema';
import { UserAnalytics, UserAnalyticsDocument } from './schemas/user-analytics.schema';
import { SystemAnalytics, SystemAnalyticsDocument } from './schemas/system-analytics.schema';

export interface WorkflowExecutionEvent {
  workflowId: string;
  userId: string;
  workflowName: string;
  executionId: string;
  status: 'success' | 'error' | 'cancelled' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodeCount: number;
  successfulNodes: number;
  failedNodes: number;
  inputData?: any;
  outputData?: any;
  errorDetails?: any;
  memoryUsage?: number;
  cpuUsage?: number;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'api' | 'test';
  metadata?: any;
  tags?: string[];
  environment?: string;
}

export interface NodeExecutionEvent {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  workflowId: string;
  executionId: string;
  userId: string;
  status: 'success' | 'error' | 'skipped' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputData?: any;
  outputData?: any;
  errorDetails?: any;
  retryCount?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  performance?: any;
  metadata?: any;
  environment?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(WorkflowAnalytics.name)
    private workflowAnalyticsModel: Model<WorkflowAnalyticsDocument>,
    @InjectModel(NodeAnalytics.name)
    private nodeAnalyticsModel: Model<NodeAnalyticsDocument>,
    @InjectModel(UserAnalytics.name)
    private userAnalyticsModel: Model<UserAnalyticsDocument>,
    @InjectModel(SystemAnalytics.name)
    private systemAnalyticsModel: Model<SystemAnalyticsDocument>,
    @InjectQueue('analytics-processing')
    private analyticsQueue: Queue,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Track workflow execution
   */
  async trackWorkflowExecution(event: WorkflowExecutionEvent): Promise<void> {
    try {
      // Store in database
      const workflowAnalytics = new this.workflowAnalyticsModel(event);
      await workflowAnalytics.save();

      // Queue for further processing
      await this.analyticsQueue.add('process-workflow-execution', event, {
        priority: 5,
        attempts: 3,
      });

      // Update cache for quick access
      const cacheKey = `workflow:${event.workflowId}:latest`;
      await this.cacheManager.set(cacheKey, event, 300); // 5 minutes

      this.logger.log(`Tracked workflow execution: ${event.executionId}`);
    } catch (error) {
      this.logger.error(`Failed to track workflow execution: ${error.message}`, error.stack);
    }
  }

  /**
   * Track node execution
   */
  async trackNodeExecution(event: NodeExecutionEvent): Promise<void> {
    try {
      // Store in database
      const nodeAnalytics = new this.nodeAnalyticsModel(event);
      await nodeAnalytics.save();

      // Queue for further processing
      await this.analyticsQueue.add('process-node-execution', event, {
        priority: 3,
        attempts: 3,
      });

      this.logger.debug(`Tracked node execution: ${event.nodeId}`);
    } catch (error) {
      this.logger.error(`Failed to track node execution: ${error.message}`, error.stack);
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(
    workflowId?: string,
    userId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit = 100,
  ): Promise<WorkflowAnalyticsDocument[]> {
    const query: any = {};
    
    if (workflowId) query.workflowId = workflowId;
    if (userId) query.userId = userId;
    if (dateFrom || dateTo) {
      query.startTime = {};
      if (dateFrom) query.startTime.$gte = dateFrom;
      if (dateTo) query.startTime.$lte = dateTo;
    }

    return this.workflowAnalyticsModel
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get node analytics
   */
  async getNodeAnalytics(
    nodeType?: string,
    workflowId?: string,
    userId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit = 100,
  ): Promise<NodeAnalyticsDocument[]> {
    const query: any = {};
    
    if (nodeType) query.nodeType = nodeType;
    if (workflowId) query.workflowId = workflowId;
    if (userId) query.userId = userId;
    if (dateFrom || dateTo) {
      query.startTime = {};
      if (dateFrom) query.startTime.$gte = dateFrom;
      if (dateTo) query.startTime.$lte = dateTo;
    }

    return this.nodeAnalyticsModel
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId?: string): Promise<any> {
    const cacheKey = `dashboard:stats:${userId || 'global'}`;
    let stats = await this.cacheManager.get(cacheKey);

    if (!stats) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30); // Last 30 days

      const workflowQuery = userId ? { userId } : {};
      const nodeQuery = userId ? { userId } : {};

      const [
        totalWorkflows,
        successfulWorkflows,
        failedWorkflows,
        totalNodes,
        popularNodeTypes,
        averageExecutionTime,
      ] = await Promise.all([
        this.workflowAnalyticsModel.countDocuments({
          ...workflowQuery,
          startTime: { $gte: dateFrom },
        }),
        this.workflowAnalyticsModel.countDocuments({
          ...workflowQuery,
          status: 'success',
          startTime: { $gte: dateFrom },
        }),
        this.workflowAnalyticsModel.countDocuments({
          ...workflowQuery,
          status: 'error',
          startTime: { $gte: dateFrom },
        }),
        this.nodeAnalyticsModel.countDocuments({
          ...nodeQuery,
          startTime: { $gte: dateFrom },
        }),
        this.nodeAnalyticsModel.aggregate([
          {
            $match: {
              ...nodeQuery,
              startTime: { $gte: dateFrom },
            },
          },
          {
            $group: {
              _id: '$nodeType',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        this.workflowAnalyticsModel.aggregate([
          {
            $match: {
              ...workflowQuery,
              startTime: { $gte: dateFrom },
              duration: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' },
            },
          },
        ]),
      ]);

      stats = {
        totalWorkflows,
        successfulWorkflows,
        failedWorkflows,
        successRate: totalWorkflows > 0 ? (successfulWorkflows / totalWorkflows) * 100 : 0,
        totalNodes,
        popularNodeTypes,
        averageExecutionTime: averageExecutionTime[0]?.avgDuration || 0,
        generatedAt: new Date(),
      };

      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, stats, 300);
    }

    return stats;
  }

  /**
   * Get workflow performance metrics
   */
  async getWorkflowPerformance(workflowId: string): Promise<any> {
    const cacheKey = `workflow:performance:${workflowId}`;
    let performance = await this.cacheManager.get(cacheKey);

    if (!performance) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7); // Last 7 days

      const [executions, averageMetrics, errorAnalysis] = await Promise.all([
        this.workflowAnalyticsModel
          .find({
            workflowId,
            startTime: { $gte: dateFrom },
          })
          .sort({ startTime: -1 })
          .limit(50),

        this.workflowAnalyticsModel.aggregate([
          {
            $match: {
              workflowId,
              startTime: { $gte: dateFrom },
              duration: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' },
              avgMemory: { $avg: '$memoryUsage' },
              avgCpu: { $avg: '$cpuUsage' },
              totalExecutions: { $sum: 1 },
            },
          },
        ]),

        this.workflowAnalyticsModel.aggregate([
          {
            $match: {
              workflowId,
              status: 'error',
              startTime: { $gte: dateFrom },
            },
          },
          {
            $group: {
              _id: '$errorDetails.nodeId',
              count: { $sum: 1 },
              latestError: { $last: '$errorDetails' },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

      performance = {
        recentExecutions: executions,
        averageMetrics: averageMetrics[0] || {},
        errorAnalysis,
        generatedAt: new Date(),
      };

      // Cache for 2 minutes
      await this.cacheManager.set(cacheKey, performance, 120);
    }

    return performance;
  }

  /**
   * Update user analytics daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateDailyUserAnalytics(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Get unique users from yesterday
      const uniqueUsers = await this.workflowAnalyticsModel
        .distinct('userId', {
          startTime: { $gte: yesterday, $lt: today },
        });

      for (const userId of uniqueUsers) {
        await this.updateUserAnalyticsForDate(userId, yesterday);
      }

      this.logger.log(`Updated daily analytics for ${uniqueUsers.length} users`);
    } catch (error) {
      this.logger.error('Failed to update daily user analytics', error.stack);
    }
  }

  /**
   * Update user analytics for specific date
   */
  private async updateUserAnalyticsForDate(userId: string, date: Date): Promise<void> {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const [workflowStats, nodeStats] = await Promise.all([
      this.workflowAnalyticsModel.aggregate([
        {
          $match: {
            userId,
            startTime: { $gte: date, $lt: nextDay },
          },
        },
        {
          $group: {
            _id: null,
            totalExecutions: { $sum: 1 },
            successfulExecutions: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            failedExecutions: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
            },
            totalExecutionTime: { $sum: '$duration' },
          },
        },
      ]),

      this.nodeAnalyticsModel.aggregate([
        {
          $match: {
            userId,
            startTime: { $gte: date, $lt: nextDay },
          },
        },
        {
          $group: {
            _id: null,
            totalNodes: { $sum: 1 },
            uniqueNodeTypes: { $addToSet: '$nodeType' },
          },
        },
      ]),
    ]);

    const workflowData = workflowStats[0] || {};
    const nodeData = nodeStats[0] || {};

    await this.userAnalyticsModel.findOneAndUpdate(
      { userId, date },
      {
        userId,
        date,
        workflowsExecuted: workflowData.totalExecutions || 0,
        successfulExecutions: workflowData.successfulExecutions || 0,
        failedExecutions: workflowData.failedExecutions || 0,
        totalExecutionTime: workflowData.totalExecutionTime || 0,
        nodesUsed: nodeData.totalNodes || 0,
        uniqueNodeTypes: nodeData.uniqueNodeTypes || [],
        environment: process.env.NODE_ENV || 'development',
      },
      { upsert: true, new: true },
    );
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<UserAnalyticsDocument[]> {
    const query: any = { userId };
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    return this.userAnalyticsModel
      .find(query)
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Get system analytics
   */
  async getSystemAnalytics(dateFrom?: Date, dateTo?: Date): Promise<SystemAnalyticsDocument[]> {
    const query: any = {};
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    return this.systemAnalyticsModel
      .find(query)
      .sort({ date: -1 })
      .exec();
  }
}
