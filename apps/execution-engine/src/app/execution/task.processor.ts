import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@weconnect-v2/database';
import { OrchestratorService } from './orchestrator.service';
import { TaskExecution } from '../interfaces/execution.interface';
import { NodeExecutorService } from './node-executor.service';

@Processor('task-queue')
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: OrchestratorService,
    private nodeExecutor: NodeExecutorService
  ) {}

  @Process('execute-node')
  async handleNodeExecution(job: Job<TaskExecution>) {
    const { id, executionId, nodeId, type, data, context, startedAt } = job.data;
    
    this.logger.log(`Executing node ${nodeId} (${type}) for execution ${executionId}`);

    try {
      // Create node execution record
      await this.prisma.nodeExecution.create({
        data: {
          id,
          workflowExecutionId: executionId,
          nodeId,
          type,
          status: 'RUNNING',
          startedAt,
          input: JSON.stringify(context),
        }
      });

      // Execute the node
      const result = await this.nodeExecutor.executeNode(type, data, context);

      // Update node execution record
      await this.prisma.nodeExecution.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output: JSON.stringify(result),
          duration: Date.now() - startedAt.getTime(),
        }
      });

      // Notify orchestrator of completion
      await this.orchestrator.onNodeCompleted(executionId, nodeId, result);

      this.logger.log(`Node ${nodeId} completed successfully`);

    } catch (error) {
      this.logger.error(`Node ${nodeId} failed: ${error.message}`);

      // Update node execution record
      await this.prisma.nodeExecution.update({
        where: { id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: error.message,
          duration: Date.now() - startedAt.getTime(),
        }
      });

      // Notify orchestrator of failure
      await this.orchestrator.onNodeFailed(executionId, nodeId, error);

      throw error; // Let Bull handle retries
    }
  }

  @Process('execute-webhook')
  async handleWebhookExecution(job: Job) {
    const { webhookId, payload, headers } = job.data;
    
    try {
      // Find workflows that should be triggered by this webhook
      const webhook = await this.prisma.webhook.findUnique({
        where: { id: webhookId },
        include: {
          workflow: true
        }
      });

      if (!webhook || !webhook.workflow) {
        throw new Error(`Webhook ${webhookId} or associated workflow not found`);
      }

      // Start workflow execution with webhook payload
      const executionId = await this.orchestrator.executeWorkflow(
        webhook.workflowId,
        { webhook: payload, headers }
      );

      // Update webhook execution record
      await this.prisma.webhookExecution.create({
        data: {
          webhookId,
          workflowExecutionId: executionId,
          payload: JSON.stringify(payload),
          headers: JSON.stringify(headers),
          status: 'TRIGGERED',
          triggeredAt: new Date(),
        }
      });

      this.logger.log(`Webhook ${webhookId} triggered workflow execution ${executionId}`);

    } catch (error) {
      this.logger.error(`Webhook execution failed: ${error.message}`);
      
      await this.prisma.webhookExecution.create({
        data: {
          webhookId,
          payload: JSON.stringify(job.data.payload),
          headers: JSON.stringify(job.data.headers),
          status: 'FAILED',
          error: error.message,
          triggeredAt: new Date(),
        }
      });

      throw error;
    }
  }

  @Process('execute-scheduled')
  async handleScheduledExecution(job: Job) {
    const { scheduleId, workflowId } = job.data;
    
    try {
      // Start workflow execution
      const executionId = await this.orchestrator.executeWorkflow(workflowId, {
        trigger: 'schedule',
        scheduleId
      });

      // Update schedule execution record
      await this.prisma.scheduleExecution.create({
        data: {
          scheduleId,
          workflowExecutionId: executionId,
          status: 'TRIGGERED',
          triggeredAt: new Date(),
        }
      });

      this.logger.log(`Scheduled execution ${scheduleId} triggered workflow ${executionId}`);

    } catch (error) {
      this.logger.error(`Scheduled execution failed: ${error.message}`);
      
      await this.prisma.scheduleExecution.create({
        data: {
          scheduleId,
          status: 'FAILED',
          error: error.message,
          triggeredAt: new Date(),
        }
      });

      throw error;
    }
  }
}
