import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@weconnect-v2/database';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Processor('workflow-trigger-queue')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {}

  @Process('execute-workflow-sync')
  async handleSyncWorkflowExecution(job: Job) {
    const { webhookId, workflowId, executionId, payload, headers, query } = job.data;
    
    this.logger.log(`Processing sync workflow execution for webhook ${webhookId}`);

    try {
      // Call execution engine to start workflow
      const executionResponse = await this.triggerWorkflowExecution(
        workflowId,
        { webhook: payload, headers, query }
      );

      // Wait for workflow completion (with timeout)
      const result = await this.waitForWorkflowCompletion(
        executionResponse.executionId,
        30000 // 30 second timeout
      );

      // Update webhook execution record
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          workflowExecutionId: result.executionId,
          response: JSON.stringify(result.output),
        }
      });

      return {
        success: true,
        executionId: result.executionId,
        response: result.output
      };

    } catch (error) {
      this.logger.error(`Sync workflow execution failed: ${error.message}`);

      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: error.message,
        }
      });

      throw error;
    }
  }

  @Process('execute-workflow-async')
  async handleAsyncWorkflowExecution(job: Job) {
    const { webhookId, workflowId, executionId, payload, headers, query } = job.data;
    
    this.logger.log(`Processing async workflow execution for webhook ${webhookId}`);

    try {
      // Call execution engine to start workflow
      const executionResponse = await this.triggerWorkflowExecution(
        workflowId,
        { webhook: payload, headers, query }
      );

      // Update webhook execution record with workflow execution ID
      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'TRIGGERED',
          workflowExecutionId: executionResponse.executionId,
        }
      });

      // Start monitoring the workflow execution
      await this.monitorWorkflowExecution(executionId, executionResponse.executionId);

      return {
        success: true,
        executionId: executionResponse.executionId
      };

    } catch (error) {
      this.logger.error(`Async workflow execution failed: ${error.message}`);

      await this.prisma.webhookExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: error.message,
        }
      });

      throw error;
    }
  }

  private async triggerWorkflowExecution(workflowId: string, input: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.EXECUTION_ENGINE_URL || 'http://localhost:3003'}/api/executions`,
          {
            workflowId,
            input
          },
          {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
            }
          }
        )
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to trigger workflow execution: ${error.message}`);
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  private async waitForWorkflowCompletion(executionId: string, timeout: number) {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `${process.env.EXECUTION_ENGINE_URL || 'http://localhost:3003'}/api/executions/${executionId}/status`,
            {
              timeout: 5000,
              headers: {
                'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
              }
            }
          )
        );

        const execution = response.data;

        if (execution.status === 'COMPLETED') {
          return {
            executionId,
            status: 'COMPLETED',
            output: execution.output
          };
        } else if (execution.status === 'FAILED') {
          throw new Error(`Workflow execution failed: ${execution.error}`);
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Workflow execution not found');
        }
        throw error;
      }
    }

    throw new Error('Workflow execution timeout');
  }

  private async monitorWorkflowExecution(webhookExecutionId: string, workflowExecutionId: string) {
    // This runs in the background to monitor async executions
    const maxAttempts = 60; // Monitor for up to 1 hour (60 * 60 seconds)
    let attempts = 0;

    const monitor = async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `${process.env.EXECUTION_ENGINE_URL || 'http://localhost:3003'}/api/executions/${workflowExecutionId}/status`,
            {
              timeout: 5000,
              headers: {
                'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
              }
            }
          )
        );

        const execution = response.data;

        if (execution.status === 'COMPLETED' || execution.status === 'FAILED') {
          // Update webhook execution record
          await this.prisma.webhookExecution.update({
            where: { id: webhookExecutionId },
            data: {
              status: execution.status,
              response: execution.output ? JSON.stringify(execution.output) : null,
              error: execution.error || null,
            }
          });

          this.logger.log(`Workflow execution ${workflowExecutionId} ${execution.status.toLowerCase()}`);
          return;
        }

        // Continue monitoring if still running
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(monitor, 60000); // Check every minute
        } else {
          // Monitoring timeout
          await this.prisma.webhookExecution.update({
            where: { id: webhookExecutionId },
            data: {
              status: 'TIMEOUT',
              error: 'Monitoring timeout exceeded',
            }
          });
        }

      } catch (error) {
        this.logger.error(`Error monitoring workflow execution: ${error.message}`);
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(monitor, 60000); // Retry in 1 minute
        }
      }
    };

    // Start monitoring after a short delay
    setTimeout(monitor, 5000);
  }

  @Process('cleanup-webhook-executions')
  async cleanupOldExecutions(job: Job) {
    const { days = 30 } = job.data;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const result = await this.prisma.webhookExecution.deleteMany({
        where: {
          triggeredAt: {
            lt: cutoffDate
          }
        }
      });

      this.logger.log(`Cleaned up ${result.count} webhook executions older than ${days} days`);
      
      return { cleaned: result.count };
    } catch (error) {
      this.logger.error(`Failed to cleanup webhook executions: ${error.message}`);
      throw error;
    }
  }

  @Process('webhook-health-check')
  async healthCheck(job: Job) {
    const { webhookId } = job.data;

    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id: webhookId },
        include: {
          executions: {
            where: {
              triggeredAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { triggeredAt: 'desc' },
            take: 100
          }
        }
      });

      if (!webhook) {
        throw new Error('Webhook not found');
      }

      const executions = webhook.executions;
      const total = executions.length;
      const failed = executions.filter(e => e.status === 'FAILED').length;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;

      // Alert if failure rate is too high
      if (failureRate > 50 && total > 10) {
        this.logger.warn(`High failure rate detected for webhook ${webhookId}: ${failureRate.toFixed(2)}%`);
        
        // You could send alerts here (email, Slack, etc.)
        // await this.alertService.sendAlert({
        //   type: 'webhook_high_failure_rate',
        //   webhookId,
        //   failureRate,
        //   totalExecutions: total
        // });
      }

      return {
        webhookId,
        total,
        failed,
        failureRate: failureRate.toFixed(2)
      };

    } catch (error) {
      this.logger.error(`Health check failed for webhook ${webhookId}: ${error.message}`);
      throw error;
    }
  }
}
