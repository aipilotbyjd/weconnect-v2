import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@weconnect-v2/database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PerformanceMetrics } from '../interfaces/performance-metrics.interface';
import { WorkflowExecution, TaskExecution } from '../interfaces/execution.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private executionStates = new Map<string, WorkflowExecution>();

  constructor(
    private prisma: PrismaService,
    @InjectQueue('workflow-queue') private workflowQueue: Queue,
    @InjectQueue('task-queue') private taskQueue: Queue,
    private eventEmitter: EventEmitter2
  ) {}

  async executeWorkflow(workflowId: string, input?: any): Promise<string> {
    const executionId = uuidv4();
    
    try {
      // Get workflow definition
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          nodes: {
            include: {
              connections: true
            }
          }
        }
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create execution record
      const execution = await this.prisma.workflowExecution.create({
        data: {
          id: executionId,
          workflowId,
          status: 'RUNNING',
          startedAt: new Date(),
          input: input ? JSON.stringify(input) : null,
        }
      });

      // Initialize execution state
      const workflowExecution: WorkflowExecution = {
        id: executionId,
        workflowId,
        status: 'RUNNING',
        startedAt: new Date(),
        nodes: workflow.nodes.map(node => ({
          id: node.id,
          type: node.type,
          status: 'WAITING',
          data: node.data,
          position: node.position
        })),
        connections: workflow.nodes.flatMap(node => node.connections),
        context: { input },
        metrics: {
          startTime: Date.now(),
          executedNodes: 0,
          totalNodes: workflow.nodes.length,
          errors: []
        }
      };

      this.executionStates.set(executionId, workflowExecution);

      // Start workflow execution
      await this.startWorkflowExecution(workflowExecution);
      
      this.logger.log(`Started workflow execution: ${executionId}`);
      return executionId;

    } catch (error) {
      this.logger.error(`Failed to start workflow execution: ${error.message}`);
      throw error;
    }
  }

  private async startWorkflowExecution(execution: WorkflowExecution) {
    // Find entry points (nodes with no incoming connections)
    const entryNodes = execution.nodes.filter(node => 
      !execution.connections.some(conn => conn.targetNodeId === node.id)
    );

    if (entryNodes.length === 0) {
      throw new Error('No entry points found in workflow');
    }

    // Execute entry nodes in parallel
    await Promise.all(
      entryNodes.map(node => this.executeNode(execution.id, node.id))
    );
  }

  private async executeNode(executionId: string, nodeId: string) {
    const execution = this.executionStates.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const node = execution.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in execution`);
    }

    if (node.status !== 'WAITING') {
      return; // Node already processed
    }

    try {
      // Check if all parent nodes are completed
      const parentConnections = execution.connections.filter(
        conn => conn.targetNodeId === nodeId
      );

      const parentNodesCompleted = parentConnections.every(conn => {
        const parentNode = execution.nodes.find(n => n.id === conn.sourceNodeId);
        return parentNode?.status === 'COMPLETED';
      });

      if (parentConnections.length > 0 && !parentNodesCompleted) {
        return; // Wait for parent nodes
      }

      // Update node status
      node.status = 'RUNNING';
      
      // Create task execution
      const taskExecution: TaskExecution = {
        id: uuidv4(),
        executionId,
        nodeId,
        type: node.type,
        data: node.data,
        context: this.buildNodeContext(execution, nodeId),
        startedAt: new Date()
      };

      // Queue task for execution
      await this.taskQueue.add('execute-node', taskExecution, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

    } catch (error) {
      node.status = 'FAILED';
      node.error = error.message;
      execution.metrics.errors.push({
        nodeId,
        error: error.message,
        timestamp: new Date()
      });

      await this.handleNodeFailure(execution, nodeId, error);
    }
  }

  private buildNodeContext(execution: WorkflowExecution, nodeId: string) {
    const context = { ...execution.context };
    
    // Add outputs from parent nodes
    const parentConnections = execution.connections.filter(
      conn => conn.targetNodeId === nodeId
    );

    parentConnections.forEach(conn => {
      const parentNode = execution.nodes.find(n => n.id === conn.sourceNodeId);
      if (parentNode?.output) {
        context[`node_${parentNode.id}`] = parentNode.output;
      }
    });

    return context;
  }

  async onNodeCompleted(executionId: string, nodeId: string, output: any) {
    const execution = this.executionStates.get(executionId);
    if (!execution) return;

    const node = execution.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Update node state
    node.status = 'COMPLETED';
    node.output = output;
    node.completedAt = new Date();

    // Update metrics
    execution.metrics.executedNodes++;

    // Emit progress event
    this.eventEmitter.emit('workflow.node.completed', {
      executionId,
      nodeId,
      output,
      progress: execution.metrics.executedNodes / execution.metrics.totalNodes
    });

    // Execute dependent nodes
    await this.executeNextNodes(execution, nodeId);

    // Check if workflow is complete
    await this.checkWorkflowCompletion(execution);
  }

  async onNodeFailed(executionId: string, nodeId: string, error: Error) {
    const execution = this.executionStates.get(executionId);
    if (!execution) return;

    const node = execution.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.status = 'FAILED';
    node.error = error.message;
    node.completedAt = new Date();

    await this.handleNodeFailure(execution, nodeId, error);
  }

  private async executeNextNodes(execution: WorkflowExecution, completedNodeId: string) {
    const nextConnections = execution.connections.filter(
      conn => conn.sourceNodeId === completedNodeId
    );

    await Promise.all(
      nextConnections.map(conn => 
        this.executeNode(execution.id, conn.targetNodeId)
      )
    );
  }

  private async handleNodeFailure(execution: WorkflowExecution, nodeId: string, error: Error) {
    this.logger.error(`Node ${nodeId} failed in execution ${execution.id}: ${error.message}`);

    // Check workflow error handling strategy
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: execution.workflowId }
    });

    const errorHandling = workflow?.settings?.errorHandling || 'STOP_ON_ERROR';

    switch (errorHandling) {
      case 'CONTINUE_ON_ERROR':
        // Continue with next nodes
        break;
      case 'STOP_ON_ERROR':
      default:
        await this.stopWorkflowExecution(execution.id, 'FAILED');
        break;
    }

    // Emit error event
    this.eventEmitter.emit('workflow.node.failed', {
      executionId: execution.id,
      nodeId,
      error: error.message
    });
  }

  private async checkWorkflowCompletion(execution: WorkflowExecution) {
    const allNodesProcessed = execution.nodes.every(
      node => node.status === 'COMPLETED' || node.status === 'FAILED'
    );

    if (!allNodesProcessed) return;

    const hasFailedNodes = execution.nodes.some(node => node.status === 'FAILED');
    const finalStatus = hasFailedNodes ? 'FAILED' : 'COMPLETED';

    await this.completeWorkflowExecution(execution.id, finalStatus);
  }

  private async completeWorkflowExecution(executionId: string, status: 'COMPLETED' | 'FAILED') {
    const execution = this.executionStates.get(executionId);
    if (!execution) return;

    execution.status = status;
    execution.completedAt = new Date();
    execution.metrics.endTime = Date.now();

    // Update database
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status,
        completedAt: new Date(),
        output: this.buildWorkflowOutput(execution),
        metrics: execution.metrics
      }
    });

    // Clean up execution state
    this.executionStates.delete(executionId);

    // Emit completion event
    this.eventEmitter.emit('workflow.completed', {
      executionId,
      status,
      metrics: execution.metrics
    });

    this.logger.log(`Workflow execution ${executionId} ${status.toLowerCase()}`);
  }

  private async stopWorkflowExecution(executionId: string, status: 'FAILED' | 'CANCELLED') {
    const execution = this.executionStates.get(executionId);
    if (!execution) return;

    // Cancel pending tasks
    const pendingJobs = await this.taskQueue.getJobs(['waiting', 'active']);
    const executionJobs = pendingJobs.filter(job => 
      job.data.executionId === executionId
    );

    await Promise.all(executionJobs.map(job => job.remove()));

    await this.completeWorkflowExecution(executionId, status);
  }

  private buildWorkflowOutput(execution: WorkflowExecution) {
    const outputs = {};
    execution.nodes.forEach(node => {
      if (node.output) {
        outputs[node.id] = node.output;
      }
    });
    return outputs;
  }

  async getExecutionStatus(executionId: string) {
    const execution = this.executionStates.get(executionId);
    if (execution) {
      return {
        id: execution.id,
        status: execution.status,
        progress: execution.metrics.executedNodes / execution.metrics.totalNodes,
        metrics: execution.metrics
      };
    }

    // Check database for completed executions
    const dbExecution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });

    if (dbExecution) {
      return {
        id: dbExecution.id,
        status: dbExecution.status,
        progress: 1,
        metrics: dbExecution.metrics
      };
    }

    return null;
  }

  async cancelExecution(executionId: string) {
    await this.stopWorkflowExecution(executionId, 'CANCELLED');
  }

  async getActiveExecutions() {
    return Array.from(this.executionStates.values()).map(execution => ({
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      progress: execution.metrics.executedNodes / execution.metrics.totalNodes
    }));
  }
}
