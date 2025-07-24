import { Injectable, Logger } from '@nestjs/common';
import { NodeRegistryService } from './node-registry.service';

export interface NodeExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  userId: string;
  inputData: any;
  credentials?: any;
  parameters: any;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  metadata?: any;
}

@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);
  private readonly executors = new Map<string, any>();

  constructor(private readonly nodeRegistry: NodeRegistryService) {}

  async executeNode(nodeType: string, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      const nodeDefinition = await this.nodeRegistry.getNodeDefinition(nodeType);
      const executor = await this.getExecutor(nodeType);

      if (!executor) {
        return {
          success: false,
          error: `No executor found for node type: ${nodeType}`,
          duration: Date.now() - startTime,
        };
      }

      // Validate node configuration
      const validation = await this.nodeRegistry.validateNodeConfig(nodeType, context.parameters);
      if (!validation.valid) {
        return {
          success: false,
          error: `Node validation failed: ${validation.errors.join(', ')}`,
          duration: Date.now() - startTime,
        };
      }

      this.logger.log(`Executing node: ${nodeType} (${context.nodeId})`);

      // Execute the node
      const result = await executor.execute(context);

      return {
        ...result,
        duration: Date.now() - startTime,
        metadata: {
          nodeType,
          nodeId: context.nodeId,
          executedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Node execution failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async getExecutor(nodeType: string) {
    // Check if executor is already loaded
    if (this.executors.has(nodeType)) {
      return this.executors.get(nodeType);
    }

    // Load executor based on node type
    const executor = await this.loadNodeExecutor(nodeType);
    if (executor) {
      this.executors.set(nodeType, executor);
    }

    return executor;
  }

  private async loadNodeExecutor(nodeType: string) {
    try {
      // Built-in executors
      const builtInExecutors = {
        'http-request': new HttpRequestExecutor(),
        'webhook-trigger': new WebhookTriggerExecutor(),
        'delay': new DelayExecutor(),
      };

      return builtInExecutors[nodeType] || null;
    } catch (error) {
      this.logger.error(`Failed to load executor for ${nodeType}: ${error.message}`);
      return null;
    }
  }
}

// Built-in Executors
class HttpRequestExecutor {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { url, method = 'GET', headers = {}, body } = context.parameters;

    try {
      const axios = require('axios');
      const response = await axios({
        url,
        method,
        headers,
        data: body,
        timeout: 30000,
      });

      return {
        success: true,
        data: {
          status: response.status,
          headers: response.headers,
          body: response.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          status: error.response?.status,
          message: error.message,
        },
      };
    }
  }
}

class WebhookTriggerExecutor {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    // Webhook triggers are handled by the webhook service
    // This executor is mainly for validation
    return {
      success: true,
      data: {
        message: 'Webhook trigger configured',
        path: context.parameters.path,
        method: context.parameters.method,
      },
    };
  }
}

class DelayExecutor {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { duration, unit = 's' } = context.parameters;
    
    let milliseconds = duration;
    switch (unit) {
      case 's':
        milliseconds = duration * 1000;
        break;
      case 'm':
        milliseconds = duration * 60 * 1000;
        break;
      case 'h':
        milliseconds = duration * 60 * 60 * 1000;
        break;
    }

    await new Promise(resolve => setTimeout(resolve, milliseconds));

    return {
      success: true,
      data: {
        delayed: milliseconds,
        unit,
        originalDuration: duration,
      },
    };
  }
}
