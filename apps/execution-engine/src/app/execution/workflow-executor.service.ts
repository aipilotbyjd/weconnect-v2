import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../../libs/src/lib/prisma/prisma.service';
import { ExecutionContext, ExecutionPlan, ExecutionResult, NodeExecutionResult, WorkflowNode, ExecuteWorkflowParams } from '../interfaces/execution.interface';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private readonly activeExecutions = new Map<string, ExecutionContext>();
  private readonly executionPool = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async executeWorkflow(params: ExecuteWorkflowParams): Promise<ExecutionResult> {
    const { workflowId, userId, inputData, executionMode } = params;
    
    // Create execution context
    const executionId = randomUUID();
    const context = await this.createExecutionContext({
      executionId,
      workflowId,
      userId,
      inputData,
      executionMode,
    });

    try {
      // Load workflow with optimizations
      const workflow = await this.loadWorkflowOptimized(workflowId);
      
      // Validate workflow
      await this.validateWorkflow(workflow);
      
      // Plan execution
      const executionPlan = await this.planExecution(workflow, inputData);
      
      // Execute workflow
      const result = await this.executeWorkflowPlan(context, executionPlan);
      
      // Store results
      await this.storeExecutionResult(context, result);
      
      return result;
    } catch (error) {
      await this.handleExecutionError(context, error);
      throw error;
    } finally {
      this.cleanupExecution(executionId);
    }
  }

  private async createExecutionContext(params: any): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      executionId: params.executionId,
      workflowId: params.workflowId,
      userId: params.userId,
      inputData: params.inputData,
      executionMode: params.executionMode || 'sync',
      startedAt: new Date(),
      status: 'running',
      variables: new Map(),
      nodeResults: new Map(),
    };

    this.activeExecutions.set(params.executionId, context);
    
    // Store in database
    await this.prisma.workflowExecution.create({
      data: {
        id: params.executionId,
        workflowId: params.workflowId,
        userId: params.userId,
        status: 'running',
        triggerType: 'manual',
        inputData: params.inputData,
        startedAt: new Date(),
      },
    });

    return context;
  }

  private async loadWorkflowOptimized(workflowId: string): Promise<any> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: {
          include: {
            sourceConnections: {
              include: {
                targetNode: true,
              },
            },
            targetConnections: {
              include: {
                sourceNode: true,
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow;
  }

  private async validateWorkflow(workflow: any): Promise<void> {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter((node: any) => 
      node.type === 'webhook-trigger' || node.type === 'manual-trigger'
    );

    if (triggerNodes.length === 0) {
      throw new Error('Workflow must have at least one trigger node');
    }

    // Validate node connections
    for (const node of workflow.nodes) {
      if (node.sourceConnections.length === 0 && node.type !== 'webhook-trigger' && node.type !== 'manual-trigger') {
        // Check if it's an end node
        const hasOutgoing = workflow.nodes.some((n: any) => 
          n.targetConnections.some((conn: any) => conn.sourceNodeId === node.id)
        );
        if (!hasOutgoing && node.type !== 'http-response') {
          this.logger.warn(`Node ${node.id} has no connections`);
        }
      }
    }
  }

  private async planExecution(
    workflow: any,
    inputData: any,
  ): Promise<ExecutionPlan> {
    // Create execution graph
    const graph = this.buildExecutionGraph(workflow);
    
    // Optimize execution order
    const optimizedOrder = this.optimizeExecutionOrder(graph);
    
    // Determine parallel execution opportunities
    const parallelGroups = this.identifyParallelGroups(optimizedOrder);
    
    return {
      graph,
      executionOrder: optimizedOrder,
      parallelGroups,
      estimatedDuration: this.estimateExecutionTime(workflow),
      resourceRequirements: this.calculateResourceRequirements(workflow),
    };
  }

  private buildExecutionGraph(workflow: any): Map<string, WorkflowNode> {
    const graph = new Map<string, WorkflowNode>();
    
    workflow.nodes.forEach((node: any) => {
      graph.set(node.id, {
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
        configuration: node.configuration,
        connections: {
          incoming: node.targetConnections.map((conn: any) => ({
            sourceNodeId: conn.sourceNodeId,
            sourceOutput: conn.sourceOutput,
            targetInput: conn.targetInput,
          })),
          outgoing: node.sourceConnections.map((conn: any) => ({
            targetNodeId: conn.targetNodeId,
            sourceOutput: conn.sourceOutput,
            targetInput: conn.targetInput,
          })),
        },
      });
    });

    return graph;
  }

  private optimizeExecutionOrder(graph: Map<string, WorkflowNode>): WorkflowNode[] {
    const ordered: WorkflowNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    // Find trigger nodes (nodes with no incoming connections)
    const triggerNodes = Array.from(graph.values()).filter(
      node => node.connections.incoming.length === 0
    );

    // Topological sort with DFS
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected at node: ${nodeId}`);
      }
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      const node = graph.get(nodeId);
      
      if (node) {
        // Visit all dependent nodes first
        node.connections.outgoing.forEach(conn => {
          visit(conn.targetNodeId);
        });
        
        ordered.unshift(node); // Add to beginning for correct order
        visited.add(nodeId);
      }
      
      visiting.delete(nodeId);
    };

    // Start from trigger nodes
    triggerNodes.forEach(node => visit(node.id));

    return ordered;
  }

  private identifyParallelGroups(orderedNodes: WorkflowNode[]): WorkflowNode[][] {
    const groups: WorkflowNode[][] = [];
    const processed = new Set<string>();
    
    for (const node of orderedNodes) {
      if (processed.has(node.id)) continue;
      
      const parallelGroup = [node];
      processed.add(node.id);
      
      // Find nodes that can run in parallel (no dependencies between them)
      for (const otherNode of orderedNodes) {
        if (processed.has(otherNode.id)) continue;
        
        const hasDirectDependency = this.hasDirectDependency(node, otherNode) || 
                                   this.hasDirectDependency(otherNode, node);
        
        if (!hasDirectDependency) {
          parallelGroup.push(otherNode);
          processed.add(otherNode.id);
        }
      }
      
      groups.push(parallelGroup);
    }
    
    return groups;
  }

  private hasDirectDependency(nodeA: WorkflowNode, nodeB: WorkflowNode): boolean {
    return nodeA.connections.outgoing.some(conn => conn.targetNodeId === nodeB.id) ||
           nodeB.connections.outgoing.some(conn => conn.targetNodeId === nodeA.id);
  }

  private estimateExecutionTime(workflow: any): number {
    // Simple estimation based on node count and types
    let totalTime = 0;
    
    workflow.nodes.forEach((node: any) => {
      switch (node.type) {
        case 'http-request':
          totalTime += 2000; // 2 seconds
          break;
        case 'delay':
          totalTime += node.configuration?.delay || 1000;
          break;
        default:
          totalTime += 500; // 500ms default
      }
    });
    
    return totalTime;
  }

  private calculateResourceRequirements(workflow: any): any {
    return {
      memory: workflow.nodes.length * 10, // MB
      cpu: workflow.nodes.length * 0.1, // CPU units
      network: workflow.nodes.filter((n: any) => n.type === 'http-request').length * 5, // MB
    };
  }

  private async executeWorkflowPlan(
    context: ExecutionContext,
    plan: ExecutionPlan,
  ): Promise<ExecutionResult> {
    const results = new Map<string, NodeExecutionResult>();
    const startTime = Date.now();

    try {
      // Execute in planned order with parallelization
      for (const group of plan.parallelGroups) {
        if (group.length === 1) {
          // Sequential execution
          const nodeResult = await this.executeNode(
            context,
            group[0],
            results,
          );
          results.set(group[0].id, nodeResult);
        } else {
          // Parallel execution
          const parallelResults = await Promise.allSettled(
            group.map(node => this.executeNode(context, node, results))
          );
          
          // Process parallel results
          parallelResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              results.set(group[index].id, result.value);
            } else {
              // Handle partial failures
              this.handleNodeExecutionFailure(
                context,
                group[index],
                result.reason,
              );
            }
          });
        }
        
        // Check for early termination conditions
        if (this.shouldTerminateExecution(context, results)) {
          break;
        }
      }

      return {
        success: true,
        executionId: context.executionId,
        duration: Date.now() - startTime,
        nodeResults: Object.fromEntries(results),
        metrics: await this.collectExecutionMetrics(context),
      };
    } catch (error) {
      return {
        success: false,
        executionId: context.executionId,
        duration: Date.now() - startTime,
        error: error.message,
        nodeResults: Object.fromEntries(results),
      };
    }
  }

  private async executeNode(
    context: ExecutionContext,
    node: WorkflowNode,
    previousResults: Map<string, NodeExecutionResult>,
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing node: ${node.name} (${node.type})`);
      
      // Prepare input data
      const inputData = await this.prepareNodeInput(
        node,
        previousResults,
        context,
      );
      
      // Execute node based on type
      let result: NodeExecutionResult;
      
      switch (node.type) {
        case 'http-request':
          result = await this.executeHttpRequest(node, inputData, context);
          break;
        case 'delay':
          result = await this.executeDelay(node, inputData, context);
          break;
        case 'webhook-trigger':
          result = await this.executeWebhookTrigger(node, inputData, context);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
      
      // Store node execution result
      await this.storeNodeExecutionResult(context, node, result);
      
      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Node execution failed: ${error.message}`);
      
      const failureResult: NodeExecutionResult = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        nodeId: node.id,
        outputData: {},
      };
      
      await this.storeNodeExecutionResult(context, node, failureResult);
      return failureResult;
    }
  }

  private async prepareNodeInput(
    node: WorkflowNode,
    previousResults: Map<string, NodeExecutionResult>,
    context: ExecutionContext,
  ): Promise<any> {
    const inputData: any = {};
    
    // Get data from incoming connections
    for (const connection of node.connections.incoming) {
      const sourceResult = previousResults.get(connection.sourceNodeId);
      if (sourceResult && sourceResult.success) {
        inputData[connection.targetInput] = sourceResult.outputData;
      }
    }
    
    // If no incoming connections, use workflow input data
    if (node.connections.incoming.length === 0) {
      return context.inputData;
    }
    
    return inputData;
  }

  private async executeHttpRequest(node: WorkflowNode, inputData: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.configuration;
    const url = config.url || 'https://httpbin.org/get';
    const method = config.method || 'GET';
    
    try {
      // Simple HTTP request implementation
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: method !== 'GET' ? JSON.stringify(inputData) : undefined,
      });
      
      const data = await response.json();
      
      return {
        success: true,
        nodeId: node.id,
        outputData: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: data,
        },
      };
    } catch (error) {
      return {
        success: false,
        nodeId: node.id,
        error: error.message,
        outputData: {},
      };
    }
  }

  private async executeDelay(node: WorkflowNode, inputData: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const delay = node.configuration?.delay || 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      success: true,
      nodeId: node.id,
      outputData: {
        delay,
        timestamp: new Date().toISOString(),
        inputData,
      },
    };
  }

  private async executeWebhookTrigger(node: WorkflowNode, inputData: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    return {
      success: true,
      nodeId: node.id,
      outputData: inputData,
    };
  }

  private async storeNodeExecutionResult(context: ExecutionContext, node: WorkflowNode, result: NodeExecutionResult): Promise<void> {
    await this.prisma.nodeExecution.create({
      data: {
        id: randomUUID(),
        executionId: context.executionId,
        nodeId: node.id,
        status: result.success ? 'completed' : 'failed',
        inputData: {},
        outputData: result.outputData,
        errorData: result.error ? { message: result.error } : null,
        duration: result.duration,
        startedAt: new Date(Date.now() - (result.duration || 0)),
        finishedAt: new Date(),
      },
    });
  }

  private handleNodeExecutionFailure(context: ExecutionContext, node: WorkflowNode, error: any): void {
    this.logger.error(`Node execution failed: ${node.name} - ${error.message}`);
    context.status = 'failed';
  }

  private shouldTerminateExecution(context: ExecutionContext, results: Map<string, NodeExecutionResult>): boolean {
    // Terminate if context is marked as failed
    if (context.status === 'failed') {
      return true;
    }
    
    // Check for critical failures
    const failures = Array.from(results.values()).filter(r => !r.success);
    if (failures.length > 3) { // Stop if more than 3 nodes fail
      return true;
    }
    
    return false;
  }

  private async collectExecutionMetrics(context: ExecutionContext): Promise<any> {
    return {
      executionTime: Date.now() - context.startedAt.getTime(),
      nodesExecuted: context.nodeResults.size,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date(),
    };
  }

  private async storeExecutionResult(context: ExecutionContext, result: ExecutionResult): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: context.executionId },
      data: {
        status: result.success ? 'completed' : 'failed',
        outputData: result.nodeResults,
        errorData: result.error ? { message: result.error } : null,
        duration: result.duration,
        finishedAt: new Date(),
        performanceMetrics: result.metrics,
      },
    });
  }

  private async handleExecutionError(context: ExecutionContext, error: any): Promise<void> {
    this.logger.error(`Execution failed: ${error.message}`, error.stack);
    
    context.status = 'failed';
    
    await this.prisma.workflowExecution.update({
      where: { id: context.executionId },
      data: {
        status: 'failed',
        errorData: { message: error.message, stack: error.stack },
        finishedAt: new Date(),
      },
    });
  }

  private cleanupExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);
    this.executionPool.delete(executionId);
  }

  // Public methods for external access
  async getActiveExecutions(): Promise<ExecutionContext[]> {
    return Array.from(this.activeExecutions.values());
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionContext | null> {
    return this.activeExecutions.get(executionId) || null;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'cancelled';
      
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'cancelled',
          finishedAt: new Date(),
        },
      });
      
      this.cleanupExecution(executionId);
    }
  }
}
