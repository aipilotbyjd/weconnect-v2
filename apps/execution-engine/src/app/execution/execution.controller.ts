import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WorkflowExecutorService } from './workflow-executor.service';
import { ExecuteWorkflowParams, ExecutionResult, ExecutionContext } from '../interfaces/execution.interface';

@ApiTags('Workflow Execution')
@Controller('execution')
export class ExecutionController {
  private readonly logger = new Logger(ExecutionController.name);

  constructor(
    private readonly workflowExecutor: WorkflowExecutorService,
  ) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiBody({ 
    description: 'Workflow execution parameters',
    schema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'ID of the workflow to execute' },
        userId: { type: 'string', description: 'ID of the user executing the workflow' },
        inputData: { type: 'object', description: 'Input data for the workflow' },
        executionMode: { type: 'string', enum: ['sync', 'async'], default: 'sync' }
      },
      required: ['workflowId', 'userId']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow execution completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        executionId: { type: 'string' },
        duration: { type: 'number' },
        nodeResults: { type: 'object' },
        metrics: { type: 'object' },
        error: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async executeWorkflow(@Body() params: ExecuteWorkflowParams): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing workflow: ${params.workflowId} for user: ${params.userId}`);
      
      const result = await this.workflowExecutor.executeWorkflow(params);
      
      this.logger.log(`Workflow execution ${result.success ? 'completed' : 'failed'}: ${result.executionId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active executions' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active executions',
    type: [Object]
  })
  async getActiveExecutions(): Promise<ExecutionContext[]> {
    return this.workflowExecutor.getActiveExecutions();
  }

  @Get(':executionId/status')
  @ApiOperation({ summary: 'Get execution status' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Execution status',
    schema: {
      type: 'object',
      properties: {
        executionId: { type: 'string' },
        workflowId: { type: 'string' },
        userId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
        startedAt: { type: 'string', format: 'date-time' },
        executionMode: { type: 'string', enum: ['sync', 'async'] }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecutionStatus(@Param('executionId') executionId: string): Promise<ExecutionContext | null> {
    const status = await this.workflowExecutor.getExecutionStatus(executionId);
    
    if (!status) {
      this.logger.warn(`Execution not found: ${executionId}`);
    }
    
    return status;
  }

  @Post(':executionId/cancel')
  @ApiOperation({ summary: 'Cancel a running execution' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async cancelExecution(@Param('executionId') executionId: string): Promise<{ message: string }> {
    await this.workflowExecutor.cancelExecution(executionId);
    
    this.logger.log(`Execution cancelled: ${executionId}`);
    
    return { message: 'Execution cancelled successfully' };
  }

  @Get('test/:workflowId')
  @ApiOperation({ summary: 'Test workflow execution with sample data' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID to test' })
  @ApiResponse({ status: 200, description: 'Test execution completed' })
  async testWorkflow(@Param('workflowId') workflowId: string): Promise<ExecutionResult> {
    const testParams: ExecuteWorkflowParams = {
      workflowId,
      userId: 'test-user',
      inputData: {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test execution'
      },
      executionMode: 'sync'
    };

    this.logger.log(`Testing workflow: ${workflowId}`);
    
    return this.workflowExecutor.executeWorkflow(testParams);
  }
}
