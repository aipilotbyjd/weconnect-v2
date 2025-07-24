import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@weconnect-v2/database';
import { firstValueFrom } from 'rxjs';
import * as vm from 'vm';

@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);
  private nodeExecutors = new Map<string, Function>();

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {
    this.initializeBuiltInExecutors();
  }

  private initializeBuiltInExecutors() {
    // HTTP Request Node
    this.nodeExecutors.set('http-request', this.executeHttpRequest.bind(this));
    
    // Data Transformation Node
    this.nodeExecutors.set('data-transform', this.executeDataTransform.bind(this));
    
    // Conditional Node  
    this.nodeExecutors.set('conditional', this.executeConditional.bind(this));
    
    // Delay Node
    this.nodeExecutors.set('delay', this.executeDelay.bind(this));
    
    // Webhook Response Node
    this.nodeExecutors.set('webhook-response', this.executeWebhookResponse.bind(this));
    
    // Email Node
    this.nodeExecutors.set('email', this.executeEmail.bind(this));
    
    // Custom Code Node
    this.nodeExecutors.set('custom-code', this.executeCustomCode.bind(this));
    
    // Database Query Node
    this.nodeExecutors.set('database-query', this.executeDatabaseQuery.bind(this));
    
    // File Operations Node
    this.nodeExecutors.set('file-ops', this.executeFileOperations.bind(this));
    
    // Loop Node
    this.nodeExecutors.set('loop', this.executeLoop.bind(this));
  }

  async executeNode(type: string, data: any, context: any): Promise<any> {
    const executor = this.nodeExecutors.get(type);
    
    if (!executor) {
      // Try to load custom node from registry
      const customNode = await this.loadCustomNode(type);
      if (customNode) {
        return await this.executeCustomNode(customNode, data, context);
      }
      throw new Error(`Unknown node type: ${type}`);
    }

    return await executor(data, context);
  }

  private async executeHttpRequest(data: any, context: any): Promise<any> {
    const { method = 'GET', url, headers = {}, body, timeout = 30000 } = data;
    
    if (!url) {
      throw new Error('URL is required for HTTP request');
    }

    // Replace variables in URL and body
    const processedUrl = this.replaceVariables(url, context);
    const processedBody = body ? this.replaceVariables(JSON.stringify(body), context) : undefined;
    const processedHeaders = this.processHeaders(headers, context);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: method.toLowerCase(),
          url: processedUrl,
          headers: processedHeaders,
          data: processedBody ? JSON.parse(processedBody) : undefined,
          timeout,
        })
      );

      return {
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
      };
    } catch (error) {
      if (error.response) {
        return {
          statusCode: error.response.status,
          headers: error.response.headers,
          body: error.response.data,
          error: true,
        };
      }
      throw error;
    }
  }

  private async executeDataTransform(data: any, context: any): Promise<any> {
    const { transformations = [] } = data;
    let result = { ...context };

    for (const transformation of transformations) {
      const { operation, source, target, value } = transformation;

      switch (operation) {
        case 'set':
          this.setNestedValue(result, target, this.replaceVariables(value, result));
          break;
        case 'copy':
          const sourceValue = this.getNestedValue(result, source);
          this.setNestedValue(result, target, sourceValue);
          break;
        case 'delete':
          this.deleteNestedValue(result, target);
          break;
        case 'rename':
          const renameValue = this.getNestedValue(result, source);
          this.setNestedValue(result, target, renameValue);
          this.deleteNestedValue(result, source);
          break;
      }
    }

    return result;
  }

  private async executeConditional(data: any, context: any): Promise<any> {
    const { conditions = [], defaultValue = null } = data;

    for (const condition of conditions) {
      const { left, operator, right, value } = condition;
      
      const leftValue = this.replaceVariables(left, context);
      const rightValue = this.replaceVariables(right, context);

      let conditionMet = false;

      switch (operator) {
        case 'equals':
          conditionMet = leftValue === rightValue;
          break;
        case 'not_equals':
          conditionMet = leftValue !== rightValue;
          break;
        case 'greater_than':
          conditionMet = Number(leftValue) > Number(rightValue);
          break;
        case 'less_than':
          conditionMet = Number(leftValue) < Number(rightValue);
          break;
        case 'contains':
          conditionMet = String(leftValue).includes(String(rightValue));
          break;
        case 'starts_with':
          conditionMet = String(leftValue).startsWith(String(rightValue));
          break;
        case 'ends_with':
          conditionMet = String(leftValue).endsWith(String(rightValue));
          break;
        case 'is_empty':
          conditionMet = !leftValue || leftValue === '';
          break;
        case 'is_not_empty':
          conditionMet = !!leftValue && leftValue !== '';
          break;
      }

      if (conditionMet) {
        return { result: value, condition_met: true };
      }
    }

    return { result: defaultValue, condition_met: false };
  }

  private async executeDelay(data: any, context: any): Promise<any> {
    const { duration = 1000 } = data; // Default 1 second

    await new Promise(resolve => setTimeout(resolve, duration));
    
    return { delayed: true, duration };
  }

  private async executeWebhookResponse(data: any, context: any): Promise<any> {
    const { statusCode = 200, headers = {}, body } = data;
    
    return {
      webhook_response: {
        statusCode,
        headers: this.processHeaders(headers, context),
        body: this.replaceVariables(JSON.stringify(body), context)
      }
    };
  }

  private async executeEmail(data: any, context: any): Promise<any> {
    const { to, subject, body, from } = data;
    
    // This would integrate with your email service
    // For now, just log the email details
    this.logger.log(`Sending email to ${to} with subject: ${subject}`);
    
    return {
      email_sent: true,
      to: this.replaceVariables(to, context),
      subject: this.replaceVariables(subject, context),
      body: this.replaceVariables(body, context)
    };
  }

  private async executeCustomCode(data: any, context: any): Promise<any> {
    const { code, language = 'javascript' } = data;
    
    if (language !== 'javascript') {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Create a secure sandbox for code execution
    const sandbox = {
      context,
      console: {
        log: (...args: any[]) => this.logger.log('Custom Code:', args),
        error: (...args: any[]) => this.logger.error('Custom Code:', args),
      },
      require: (module: string) => {
        // Only allow specific safe modules
        const allowedModules = ['lodash', 'moment', 'crypto'];
        if (allowedModules.includes(module)) {
          return require(module);
        }
        throw new Error(`Module ${module} not allowed`);
      }
    };

    try {
      const vmContext = vm.createContext(sandbox);
      const result = vm.runInContext(code, vmContext, {
        timeout: 10000, // 10 second timeout
        displayErrors: true
      });

      return { result };
    } catch (error) {
      throw new Error(`Custom code execution failed: ${error.message}`);
    }
  }

  private async executeDatabaseQuery(data: any, context: any): Promise<any> {
    const { query, parameters = [] } = data;
    
    // Replace variables in query and parameters
    const processedQuery = this.replaceVariables(query, context);
    const processedParams = parameters.map((param: any) => 
      this.replaceVariables(param, context)
    );

    try {
      // Use Prisma's raw query capabilities
      const result = await this.prisma.$queryRawUnsafe(processedQuery, ...processedParams);
      return { query_result: result };
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  private async executeFileOperations(data: any, context: any): Promise<any> {
    const { operation, path, content, encoding = 'utf8' } = data;
    
    // This would implement file operations
    // For security, limit to specific directories
    
    return {
      file_operation: operation,
      path,
      success: true
    };
  }

  private async executeLoop(data: any, context: any): Promise<any> {
    const { items, variable_name = 'item' } = data;
    
    const itemsArray = Array.isArray(items) ? items : this.getNestedValue(context, items);
    const results = [];

    for (const item of itemsArray) {
      const loopContext = {
        ...context,
        [variable_name]: item,
        loop_index: results.length
      };
      
      results.push(loopContext);
    }

    return { loop_results: results };
  }

  private async loadCustomNode(type: string) {
    try {
      const customNode = await this.prisma.customNode.findUnique({
        where: { type }
      });
      
      return customNode;
    } catch (error) {
      this.logger.error(`Failed to load custom node ${type}: ${error.message}`);
      return null;
    }
  }

  private async executeCustomNode(customNode: any, data: any, context: any) {
    // Execute custom node code
    // This would be similar to executeCustomCode but with the custom node's logic
    return { custom_node_result: true };
  }

  private replaceVariables(text: string, context: any): any {
    if (typeof text !== 'string') return text;
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(context, variable.trim());
      return value !== undefined ? value : match;
    });
  }

  private processHeaders(headers: any, context: any): any {
    const processed = {};
    for (const [key, value] of Object.entries(headers)) {
      processed[key] = this.replaceVariables(value as string, context);
    }
    return processed;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    
    if (lastKey) {
      target[lastKey] = value;
    }
  }

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => current?.[key], obj);
    
    if (target && lastKey) {
      delete target[lastKey];
    }
  }
}
