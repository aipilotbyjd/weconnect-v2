import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../../../libs/src/lib/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface WorkflowExecutionJob {
  webhookId: string;
  workflowId: string;
  executionId: string;
  payload: any;
  headers: Record<string, string>;
  query: Record<string, string>;
}

@Processor('workflow-trigger-queue')
export class WorkflowProcessor {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  @Process('execute-workflow-sync')
  async handleSyncWorkflowExecution(job: Job<WorkflowExecutionJob>) {
    const startTime = Date.now();
    const { webhookId, workflowId, executionId, payload, headers, query } = job.data;

    this.logger.log(`Processing sync workflow execution: ${executionId}`);

    try {
      // Update job progress
      await job.progress(10);

      // Prepare workflow execution data
      const workflowData = {
        workflowId,
        userId: 'webhook-system', // System user for webhook executions
        inputData: {
          webhook: {
            id: webhookId,
            executionId,
            payload,
            headers,
            query,
            timestamp: new Date(),
          },
          ...payload, // Merge webhook payload as root data
        },
        executionMode: 'sync' as const,
        trigger: {
          type: 'webhook',
          webhookId,
          executionId,
        },
      };

      await job.progress(30);

      // Call execution engine
      const executionResult = await this.executeWorkflow(workflowData);

      await job.progress(80);

      // Update webhook execution record with workflow result
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: executionResult.success ? 'COMPLETED' : 'FAILED',
          workflowExecutionId: executionResult.executionId,
          response: JSON.stringify(executionResult),
          error: executionResult.error || null,
        },
      });

      const duration = Date.now() - startTime;
      await job.progress(100);

      this.logger.log(`Sync workflow execution completed: ${executionId} in ${duration}ms`);

      return {
        success: true,
        executionId: executionResult.executionId,
        duration,
        response: executionResult.nodeResults || {},
        webhook: {
          id: webhookId,
          executionId,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Sync workflow execution failed: ${executionId} - ${error.message}`, error.stack);

      // Update webhook execution with error
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      throw error;
    }
  }

  @Process('execute-workflow-async')
  async handleAsyncWorkflowExecution(job: Job<WorkflowExecutionJob>) {
    const startTime = Date.now();
    const { webhookId, workflowId, executionId, payload, headers, query } = job.data;

    this.logger.log(`Processing async workflow execution: ${executionId}`);

    try {
      // Update job progress
      await job.progress(10);

      // Prepare workflow execution data
      const workflowData = {
        workflowId,
        userId: 'webhook-system',
        inputData: {
          webhook: {
            id: webhookId,
            executionId,
            payload,
            headers,
            query,
            timestamp: new Date(),
          },
          ...payload,
        },
        executionMode: 'async' as const,
        trigger: {
          type: 'webhook',
          webhookId,
          executionId,
        },
      };

      await job.progress(30);

      // Call execution engine (async mode)
      const executionResult = await this.executeWorkflow(workflowData);

      await job.progress(80);

      // Update webhook execution record
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: executionResult.success ? 'COMPLETED' : 'FAILED',
          workflowExecutionId: executionResult.executionId,
          response: JSON.stringify(executionResult),
          error: executionResult.error || null,
        },
      });

      const duration = Date.now() - startTime;
      await job.progress(100);

      this.logger.log(`Async workflow execution completed: ${executionId} in ${duration}ms`);

      return {
        success: true,
        executionId: executionResult.executionId,
        duration,
        webhook: {
          id: webhookId,
          executionId,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Async workflow execution failed: ${executionId} - ${error.message}`, error.stack);

      // Update webhook execution with error
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      // For async executions, we don't throw but log the error
      this.logger.warn(`Async workflow execution failed but job marked as completed: ${executionId}`);
      
      return {
        success: false,
        executionId: null,
        duration,
        error: error.message,
        webhook: {
          id: webhookId,
          executionId,
        },
      };
    }
  }

  @Process('cleanup-executions')
  async handleExecutionCleanup(job: Job) {
    this.logger.log('Starting webhook execution cleanup');

    try {
      // Clean up old webhook executions (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await this.prisma.webhookExecution.deleteMany({
        where: {
          triggeredAt: {
            lt: thirtyDaysAgo,
          },
          status: {
            in: ['COMPLETED', 'FAILED'],
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedCount.count} old webhook executions`);

      return {
        success: true,
        cleanedUp: deletedCount.count,
        olderThan: thirtyDaysAgo,
      };

    } catch (error) {
      this.logger.error(`Execution cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async executeWorkflow(workflowData: any) {
    try {
      // Call the execution engine service
      const executionEngineUrl = process.env.EXECUTION_ENGINE_URL || 'http://localhost:3003';
      
      const response = await firstValueFrom(
        this.httpService.post(`${executionEngineUrl}/api/execution/execute`, workflowData, {
          timeout: workflowData.executionMode === 'sync' ? 30000 : 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'webhook-service/1.0.0',
          },
        })
      );

      return response.data;

    } catch (error) {
      this.logger.error(`Failed to execute workflow via execution engine: ${error.message}`);
      
      if (error.response) {
        throw new Error(`Execution engine error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Execution engine is not available');
      } else {
        throw new Error(`Workflow execution failed: ${error.message}`);
      }
    }
  }

  // Job event handlers for monitoring
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed successfully`, {
      jobType: job.name,
      duration: Date.now() - job.timestamp,
      result: result?.success,
    });
  }

  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed`, {
      jobType: job.name,
      duration: Date.now() - job.timestamp,
      error: error.message,
      stack: error.stack,
    });
  }

  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }

  onStalled(job: Job) {
    this.logger.warn(`Job ${job.id} stalled`, {
      jobType: job.name,
      attempts: job.attemptsMade,
    });
  }
}
