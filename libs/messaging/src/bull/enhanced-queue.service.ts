import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WorkflowExecutionJobData {
  workflowId: string;
  executionId: string;
  userId: string;
  inputData?: any;
  priority?: number;
  delay?: number;
  executionMode?: 'sync' | 'async';
  triggerType?: 'manual' | 'webhook' | 'schedule' | 'api';
}

export interface NodeExecutionJobData {
  nodeId: string;
  executionId: string;
  workflowId: string;
  nodeType: string;
  inputData: any;
  configuration: any;
  credentials?: any;
  isRetry?: boolean;
  maxRetries?: number;
  delay?: number;
  timeout?: number;
}

export interface WebhookProcessingJobData {
  webhookId: string;
  workflowId: string;
  payload: any;
  headers: Record<string, string>;
  method: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
}

export interface NotificationJobData {
  type: 'email' | 'sms' | 'push' | 'webhook';
  recipient: string;
  subject?: string;
  message: string;
  data?: any;
  priority?: number;
}

export interface AnalyticsJobData {
  event: string;
  entityType: 'workflow' | 'node' | 'execution' | 'user';
  entityId: string;
  userId?: string;
  organizationId?: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class EnhancedQueueService {
  private readonly logger = new Logger(EnhancedQueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @InjectQueue('workflow-execution') private workflowQueue: Queue,
    @InjectQueue('node-execution') private nodeQueue: Queue,
    @InjectQueue('webhook-processing') private webhookQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.setupQueues();
    this.setupQueueMonitoring();
  }

  private setupQueues(): void {
    // Store queues for easy access
    this.queues.set('workflow-execution', this.workflowQueue);
    this.queues.set('node-execution', this.nodeQueue);
    this.queues.set('webhook-processing', this.webhookQueue);
    this.queues.set('notification', this.notificationQueue);
    this.queues.set('analytics', this.analyticsQueue);

    this.logger.log('Enhanced queue service initialized with 5 queues');
  }

  // Workflow Execution Queue
  async addWorkflowExecution(data: WorkflowExecutionJobData): Promise<Job> {
    const jobOptions = {
      priority: data.priority || 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      delay: data.delay || 0,
    };

    if (data.executionMode === 'sync') {
      jobOptions.priority = 10; // Higher priority for sync executions
    }

    const job = await this.workflowQueue.add('execute-workflow', data, jobOptions);
    
    this.logger.log(`Added workflow execution job: ${job.id} for workflow: ${data.workflowId}`);
    
    // Emit event for real-time updates
    this.eventEmitter.emit('job.queued', {
      jobId: job.id,
      type: 'workflow-execution',
      workflowId: data.workflowId,
      executionId: data.executionId,
    });

    return job;
  }

  // Node Execution Queue
  async addNodeExecution(data: NodeExecutionJobData): Promise<Job> {
    const jobOptions = {
      priority: data.isRetry ? 10 : 0,
      attempts: data.maxRetries || 3,
      backoff: { type: 'exponential', delay: 1000 },
      delay: data.delay || 0,
      timeout: data.timeout || 30000,
    };

    const job = await this.nodeQueue.add('execute-node', data, jobOptions);
    
    this.logger.log(`Added node execution job: ${job.id} for node: ${data.nodeId}`);

    return job;
  }

  async addBatchNodeExecution(nodes: NodeExecutionJobData[]): Promise<Job[]> {
    const jobs = nodes.map(node => ({
      name: 'execute-node',
      data: node,
      opts: {
        priority: node.isRetry ? 10 : 0,
        attempts: node.maxRetries || 3,
        backoff: { type: 'exponential', delay: 1000 },
        delay: node.delay || 0,
        timeout: node.timeout || 30000,
      },
    }));

    const createdJobs = await this.nodeQueue.addBulk(jobs);
    
    this.logger.log(`Added ${createdJobs.length} node execution jobs in batch`);

    return createdJobs;
  }

  // Webhook Processing Queue
  async addWebhookProcessing(data: WebhookProcessingJobData): Promise<Job> {
    const job = await this.webhookQueue.add('process-webhook', data, {
      priority: 5, // Medium priority
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 50,
      removeOnFail: 200,
    });

    this.logger.log(`Added webhook processing job: ${job.id} for webhook: ${data.webhookId}`);

    return job;
  }

  // Notification Queue
  async addNotification(data: NotificationJobData): Promise<Job> {
    const job = await this.notificationQueue.add('send-notification', data, {
      priority: data.priority || 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 300,
    });

    this.logger.log(`Added notification job: ${job.id} of type: ${data.type}`);

    return job;
  }

  // Analytics Queue
  async addAnalyticsEvent(data: AnalyticsJobData): Promise<Job> {
    const job = await this.analyticsQueue.add('process-analytics', data, {
      priority: -5, // Lower priority for analytics
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    });

    return job;
  }

  // Queue Management
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();
    this.logger.log(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();
    this.logger.log(`Queue resumed: ${queueName}`);
  }

  async clearQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.empty();
    this.logger.log(`Queue cleared: ${queueName}`);
  }

  // Job Management
  async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    return queue.getJob(jobId);
  }

  async cancelJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job cancelled: ${jobId} from queue: ${queueName}`);
    }
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Job retried: ${jobId} from queue: ${queueName}`);
    }
  }

  // Queue Statistics
  async getQueueStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];

    for (const [name, queue] of this.queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      const isPaused = await queue.isPaused();

      stats.push({
        name,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: isPaused,
      });
    }

    return stats;
  }

  async getQueueStat(queueName: string): Promise<QueueStats | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    const isPaused = await queue.isPaused();

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: isPaused,
    };
  }

  // Queue Monitoring
  private setupQueueMonitoring(): void {
    const queues = [
      { name: 'workflow-execution', queue: this.workflowQueue },
      { name: 'node-execution', queue: this.nodeQueue },
      { name: 'webhook-processing', queue: this.webhookQueue },
      { name: 'notification', queue: this.notificationQueue },
      { name: 'analytics', queue: this.analyticsQueue },
    ];

    queues.forEach(({ name, queue }) => {
      // Job started
      queue.on('active', (job) => {
        this.logger.debug(`Job started: ${job.id} in queue: ${name}`);
        this.eventEmitter.emit('job.started', {
          jobId: job.id,
          queue: name,
          jobType: job.name,
          data: job.data,
        });
      });

      // Job completed
      queue.on('completed', (job, result) => {
        this.logger.debug(`Job completed: ${job.id} in queue: ${name}`);
        this.eventEmitter.emit('job.completed', {
          jobId: job.id,
          queue: name,
          jobType: job.name,
          result,
          duration: Date.now() - job.processedOn,
        });
      });

      // Job failed
      queue.on('failed', (job, error) => {
        this.logger.error(`Job failed: ${job.id} in queue: ${name} - ${error.message}`);
        this.eventEmitter.emit('job.failed', {
          jobId: job.id,
          queue: name,
          jobType: job.name,
          error: error.message,
          attempts: job.attemptsMade,
          failedReason: job.failedReason,
        });
      });

      // Job stalled
      queue.on('stalled', (job) => {
        this.logger.warn(`Job stalled: ${job.id} in queue: ${name}`);
        this.eventEmitter.emit('job.stalled', {
          jobId: job.id,
          queue: name,
          jobType: job.name,
        });
      });

      // Job progress
      queue.on('progress', (job, progress) => {
        this.eventEmitter.emit('job.progress', {
          jobId: job.id,
          queue: name,
          progress,
        });
      });

      // Queue drained
      queue.on('drained', () => {
        this.logger.log(`Queue drained: ${name}`);
        this.eventEmitter.emit('queue.drained', { queue: name });
      });

      // Queue error
      queue.on('error', (error) => {
        this.logger.error(`Queue error in ${name}: ${error.message}`);
        this.eventEmitter.emit('queue.error', {
          queue: name,
          error: error.message,
        });
      });
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; queues: any }> {
    const queueHealth = {};

    for (const [name, queue] of this.queues) {
      try {
        const stats = await this.getQueueStat(name);
        const isPaused = await queue.isPaused();
        
        queueHealth[name] = {
          status: isPaused ? 'paused' : 'active',
          stats,
          healthy: true,
        };
      } catch (error) {
        queueHealth[name] = {
          status: 'error',
          error: error.message,
          healthy: false,
        };
      }
    }

    const allHealthy = Object.values(queueHealth).every((q: any) => q.healthy);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      queues: queueHealth,
    };
  }

  // Utility Methods
  async cleanOldJobs(olderThanHours = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [name, queue] of this.queues) {
      try {
        await queue.clean(cutoffTime.getTime(), 'completed');
        await queue.clean(cutoffTime.getTime(), 'failed');
        this.logger.log(`Cleaned old jobs from queue: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to clean queue ${name}: ${error.message}`);
      }
    }
  }

  async getFailedJobs(queueName: string, limit = 50): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    return queue.getFailed(0, limit);
  }

  async retryAllFailedJobs(queueName: string): Promise<void> {
    const failedJobs = await this.getFailedJobs(queueName);
    
    for (const job of failedJobs) {
      try {
        await job.retry();
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    this.logger.log(`Retried ${failedJobs.length} failed jobs in queue: ${queueName}`);
  }
}
