import { Injectable } from '@nestjs/common';
import { EnhancedQueueService } from '@weconnect-v2/messaging';

@Injectable()
export class QueueService {
  constructor(private readonly enhancedQueueService: EnhancedQueueService) {}

  // Delegate all methods to the enhanced queue service
  async getQueueStats() {
    return this.enhancedQueueService.getQueueStats();
  }

  async getQueueStat(queueName: string) {
    return this.enhancedQueueService.getQueueStat(queueName);
  }

  async addWorkflowExecution(jobData: any) {
    const job = await this.enhancedQueueService.addWorkflowExecution(jobData);
    return {
      jobId: job.id,
      queueName: 'workflow-execution',
      data: job.data,
      createdAt: new Date(job.timestamp),
      status: 'queued',
    };
  }

  async addNodeExecution(jobData: any) {
    const job = await this.enhancedQueueService.addNodeExecution(jobData);
    return {
      jobId: job.id,
      queueName: 'node-execution',
      data: job.data,
      createdAt: new Date(job.timestamp),
      status: 'queued',
    };
  }

  async addBatchNodeExecution(jobsData: any[]) {
    const jobs = await this.enhancedQueueService.addBatchNodeExecution(jobsData);
    return {
      jobsCreated: jobs.length,
      queueName: 'node-execution',
      jobs: jobs.map(job => ({
        jobId: job.id,
        data: job.data,
        createdAt: new Date(job.timestamp),
        status: 'queued',
      })),
    };
  }

  async addWebhookProcessing(jobData: any) {
    const job = await this.enhancedQueueService.addWebhookProcessing(jobData);
    return {
      jobId: job.id,
      queueName: 'webhook-processing',
      data: job.data,
      createdAt: new Date(job.timestamp),
      status: 'queued',
    };
  }

  async addNotification(jobData: any) {
    const job = await this.enhancedQueueService.addNotification(jobData);
    return {
      jobId: job.id,
      queueName: 'notification',
      data: job.data,
      createdAt: new Date(job.timestamp),
      status: 'queued',
    };
  }

  async addAnalyticsEvent(jobData: any) {
    const job = await this.enhancedQueueService.addAnalyticsEvent(jobData);
    return {
      jobId: job.id,
      queueName: 'analytics',
      data: job.data,
      createdAt: new Date(job.timestamp),
      status: 'queued',
    };
  }

  async pauseQueue(queueName: string) {
    return this.enhancedQueueService.pauseQueue(queueName);
  }

  async resumeQueue(queueName: string) {
    return this.enhancedQueueService.resumeQueue(queueName);
  }

  async clearQueue(queueName: string) {
    return this.enhancedQueueService.clearQueue(queueName);
  }

  async getJob(queueName: string, jobId: string) {
    const job = await this.enhancedQueueService.getJob(queueName, jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress(),
      delay: job.delay,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      returnvalue: job.returnvalue,
    };
  }

  async cancelJob(queueName: string, jobId: string) {
    return this.enhancedQueueService.cancelJob(queueName, jobId);
  }

  async retryJob(queueName: string, jobId: string) {
    return this.enhancedQueueService.retryJob(queueName, jobId);
  }

  async getFailedJobs(queueName: string, limit?: number) {
    const jobs = await this.enhancedQueueService.getFailedJobs(queueName, limit);
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  }

  async retryAllFailedJobs(queueName: string) {
    return this.enhancedQueueService.retryAllFailedJobs(queueName);
  }

  async cleanOldJobs(olderThanHours?: number) {
    return this.enhancedQueueService.cleanOldJobs(olderThanHours);
  }

  async healthCheck() {
    return this.enhancedQueueService.healthCheck();
  }
}
