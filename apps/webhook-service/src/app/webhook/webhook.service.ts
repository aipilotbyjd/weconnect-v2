import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@weconnect-v2/database';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface CreateWebhookDto {
  workflowId: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path?: string;
  authentication?: {
    type: 'none' | 'api_key' | 'bearer' | 'basic' | 'signature';
    config?: any;
  };
  validation?: {
    schema?: any;
    required_headers?: string[];
    allowed_ips?: string[];
  };
  response?: {
    type: 'sync' | 'async';
    timeout?: number;
    custom_response?: any;
  };
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

export interface WebhookExecution {
  id: string;
  webhookId: string;
  payload: any;
  headers: Record<string, string>;
  query: Record<string, string>;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private webhookCache = new Map<string, any>();
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private prisma: PrismaService,
    @InjectQueue('webhook-queue') private webhookQueue: Queue,
    @InjectQueue('workflow-trigger-queue') private workflowQueue: Queue
  ) {
    this.loadWebhooksToCache();
  }

  async createWebhook(dto: CreateWebhookDto) {
    const webhookId = uuidv4();
    const path = dto.path || this.generateUniquePath();
    
    // Validate path uniqueness
    const existingWebhook = await this.prisma.webhook.findFirst({
      where: { path, method: dto.method }
    });

    if (existingWebhook) {
      throw new BadRequestException(`Webhook with path ${path} and method ${dto.method} already exists`);
    }

    // Validate workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId }
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${dto.workflowId} not found`);
    }

    const webhook = await this.prisma.webhook.create({
      data: {
        id: webhookId,
        workflowId: dto.workflowId,
        name: dto.name,
        method: dto.method,
        path,
        authentication: dto.authentication ? JSON.stringify(dto.authentication) : null,
        validation: dto.validation ? JSON.stringify(dto.validation) : null,
        response: dto.response ? JSON.stringify(dto.response) : null,
        rateLimit: dto.rateLimit ? JSON.stringify(dto.rateLimit) : null,
        isActive: true,
      }
    });

    // Add to cache
    this.webhookCache.set(`${dto.method}:${path}`, {
      ...webhook,
      authentication: dto.authentication,
      validation: dto.validation,
      response: dto.response,
      rateLimit: dto.rateLimit,
    });

    this.logger.log(`Created webhook: ${dto.method} ${path} -> workflow ${dto.workflowId}`);
    
    return {
      id: webhookId,
      url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3004'}/webhook/${path}`,
      method: dto.method,
      path,
      workflowId: dto.workflowId,
    };
  }

  async executeWebhook(
    method: string,
    path: string,
    payload: any,
    headers: Record<string, string>,
    query: Record<string, string>,
    ip: string,
    userAgent: string
  ) {
    const webhookKey = `${method.toUpperCase()}:${path}`;
    const webhook = this.webhookCache.get(webhookKey);

    if (!webhook || !webhook.isActive) {
      throw new NotFoundException('Webhook not found or inactive');
    }

    // Rate limiting
    if (webhook.rateLimit) {
      const allowed = await this.checkRateLimit(webhook.id, webhook.rateLimit, ip);
      if (!allowed) {
        throw new BadRequestException('Rate limit exceeded');
      }
    }

    // IP validation
    if (webhook.validation?.allowed_ips?.length > 0) {
      if (!webhook.validation.allowed_ips.includes(ip)) {
        throw new BadRequestException('IP address not allowed');
      }
    }

    // Authentication
    const authResult = await this.validateAuthentication(webhook, headers);
    if (!authResult.valid) {
      throw new BadRequestException(authResult.error || 'Authentication failed');
    }

    // Header validation
    if (webhook.validation?.required_headers?.length > 0) {
      const missingHeaders = webhook.validation.required_headers.filter(
        header => !headers[header.toLowerCase()]
      );
      if (missingHeaders.length > 0) {
        throw new BadRequestException(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
    }

    // Payload validation
    if (webhook.validation?.schema) {
      const validationResult = await this.validatePayload(payload, webhook.validation.schema);
      if (!validationResult.valid) {
        throw new BadRequestException(`Payload validation failed: ${validationResult.error}`);
      }
    }

    const execution: WebhookExecution = {
      id: uuidv4(),
      webhookId: webhook.id,
      payload,
      headers,
      query,
      ip,
      userAgent,
      timestamp: new Date(),
    };

    // Record execution
    await this.prisma.webhookExecution.create({
      data: {
        id: execution.id,
        webhookId: webhook.id,
        payload: JSON.stringify(payload),
        headers: JSON.stringify(headers),
        query: JSON.stringify(query),
        ip,
        userAgent,
        status: 'RECEIVED',
        triggeredAt: new Date(),
      }
    });

    // Handle response type
    if (webhook.response?.type === 'sync') {
      return await this.handleSyncExecution(webhook, execution);
    } else {
      return await this.handleAsyncExecution(webhook, execution);
    }
  }

  private async handleSyncExecution(webhook: any, execution: WebhookExecution) {
    try {
      // Queue for immediate processing with high priority
      const job = await this.workflowQueue.add(
        'execute-workflow-sync',
        {
          webhookId: webhook.id,
          workflowId: webhook.workflowId,
          executionId: execution.id,
          payload: execution.payload,
          headers: execution.headers,
          query: execution.query,
        },
        {
          priority: 10,
          attempts: 1,
          timeout: webhook.response?.timeout || 30000,
        }
      );

      // Wait for job completion
      const result = await job.finished();
      
      await this.prisma.webhookExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          workflowExecutionId: result.executionId,
          response: JSON.stringify(result.response),
        }
      });

      return webhook.response?.custom_response || result.response || { success: true };

    } catch (error) {
      await this.prisma.webhookExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: error.message,
        }
      });

      throw error;
    }
  }

  private async handleAsyncExecution(webhook: any, execution: WebhookExecution) {
    // Queue for background processing
    await this.workflowQueue.add(
      'execute-workflow-async',
      {
        webhookId: webhook.id,
        workflowId: webhook.workflowId,
        executionId: execution.id,
        payload: execution.payload,
        headers: execution.headers,
        query: execution.query,
      },
      {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    return {
      success: true,
      message: 'Webhook received and queued for processing',
      executionId: execution.id,
    };
  }

  private async validateAuthentication(webhook: any, headers: Record<string, string>) {
    if (!webhook.authentication || webhook.authentication.type === 'none') {
      return { valid: true };
    }

    const auth = webhook.authentication;

    switch (auth.type) {
      case 'api_key':
        const apiKeyHeader = auth.config?.header || 'x-api-key';
        const expectedKey = auth.config?.key;
        const providedKey = headers[apiKeyHeader.toLowerCase()];
        
        if (!providedKey || providedKey !== expectedKey) {
          return { valid: false, error: 'Invalid API key' };
        }
        break;

      case 'bearer':
        const authHeader = headers['authorization'];
        const expectedToken = auth.config?.token;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { valid: false, error: 'Bearer token required' };
        }
        
        const token = authHeader.substring(7);
        if (token !== expectedToken) {
          return { valid: false, error: 'Invalid bearer token' };
        }
        break;

      case 'basic':
        const basicAuthHeader = headers['authorization'];
        const expectedUsername = auth.config?.username;
        const expectedPassword = auth.config?.password;
        
        if (!basicAuthHeader || !basicAuthHeader.startsWith('Basic ')) {
          return { valid: false, error: 'Basic authentication required' };
        }
        
        const credentials = Buffer.from(basicAuthHeader.substring(6), 'base64').toString();
        const [username, password] = credentials.split(':');
        
        if (username !== expectedUsername || password !== expectedPassword) {
          return { valid: false, error: 'Invalid credentials' };
        }
        break;

      case 'signature':
        const signature = headers[auth.config?.header?.toLowerCase() || 'x-signature'];
        const secret = auth.config?.secret;
        const payload = JSON.stringify(headers['x-original-payload'] || {});
        
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          return { valid: false, error: 'Invalid signature' };
        }
        break;

      default:
        return { valid: false, error: 'Unsupported authentication type' };
    }

    return { valid: true };
  }

  private async validatePayload(payload: any, schema: any) {
    // Simple schema validation - in production, use ajv or similar
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in payload)) {
            return { valid: false, error: `Required field '${field}' is missing` };
          }
        }
      }

      if (schema.properties) {
        for (const [field, rules] of Object.entries(schema.properties as any)) {
          if (field in payload) {
            const value = payload[field];
            const fieldRules = rules as any;

            if (fieldRules.type && typeof value !== fieldRules.type) {
              return { valid: false, error: `Field '${field}' must be of type ${fieldRules.type}` };
            }

            if (fieldRules.minLength && value.length < fieldRules.minLength) {
              return { valid: false, error: `Field '${field}' must be at least ${fieldRules.minLength} characters` };
            }

            if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
              return { valid: false, error: `Field '${field}' must be at most ${fieldRules.maxLength} characters` };
            }
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  private async checkRateLimit(webhookId: string, rateLimit: any, ip: string): Promise<boolean> {
    const key = `${webhookId}:${ip}`;
    const now = Date.now();
    const windowMs = rateLimit.window * 1000;
    
    const current = this.rateLimitCache.get(key);
    
    if (!current || now > current.resetTime) {
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= rateLimit.requests) {
      return false;
    }

    current.count++;
    return true;
  }

  private generateUniquePath(): string {
    return uuidv4().substring(0, 8);
  }

  private async loadWebhooksToCache() {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: { isActive: true }
      });

      webhooks.forEach(webhook => {
        const key = `${webhook.method}:${webhook.path}`;
        this.webhookCache.set(key, {
          ...webhook,
          authentication: webhook.authentication ? JSON.parse(webhook.authentication) : null,
          validation: webhook.validation ? JSON.parse(webhook.validation) : null,
          response: webhook.response ? JSON.parse(webhook.response) : null,
          rateLimit: webhook.rateLimit ? JSON.parse(webhook.rateLimit) : null,
        });
      });

      this.logger.log(`Loaded ${webhooks.length} webhooks to cache`);
    } catch (error) {
      this.logger.error(`Failed to load webhooks to cache: ${error.message}`);
    }
  }

  async getWebhook(id: string) {
    return await this.prisma.webhook.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { triggeredAt: 'desc' }
        }
      }
    });
  }

  async updateWebhook(id: string, updates: Partial<CreateWebhookDto>) {
    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...updates,
        authentication: updates.authentication ? JSON.stringify(updates.authentication) : undefined,
        validation: updates.validation ? JSON.stringify(updates.validation) : undefined,
        response: updates.response ? JSON.stringify(updates.response) : undefined,
        rateLimit: updates.rateLimit ? JSON.stringify(updates.rateLimit) : undefined,
      }
    });

    // Update cache
    const key = `${webhook.method}:${webhook.path}`;
    this.webhookCache.delete(key);
    await this.loadWebhooksToCache();

    return webhook;
  }

  async deleteWebhook(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhook.update({
      where: { id },
      data: { isActive: false }
    });

    // Remove from cache
    const key = `${webhook.method}:${webhook.path}`;
    this.webhookCache.delete(key);

    this.logger.log(`Deactivated webhook: ${webhook.method} ${webhook.path}`);
  }

  async getWebhookExecutions(webhookId: string, limit = 50) {
    return await this.prisma.webhookExecution.findMany({
      where: { webhookId },
      take: limit,
      orderBy: { triggeredAt: 'desc' }
    });
  }

  async getWebhookStats(webhookId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.prisma.webhookExecution.groupBy({
      by: ['status'],
      where: {
        webhookId,
        triggeredAt: { gte: since }
      },
      _count: { status: true }
    });

    const total = stats.reduce((sum, stat) => sum + stat._count.status, 0);

    return {
      total,
      success: stats.find(s => s.status === 'COMPLETED')?._count.status || 0,
      failed: stats.find(s => s.status === 'FAILED')?._count.status || 0,
      pending: stats.find(s => s.status === 'RECEIVED')?._count.status || 0,
    };
  }

  async getGlobalStats(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalWebhooks, activeWebhooks, totalExecutions, recentExecutions] = await Promise.all([
      this.prisma.webhook.count(),
      this.prisma.webhook.count({ where: { isActive: true } }),
      this.prisma.webhookExecution.count(),
      this.prisma.webhookExecution.count({
        where: { triggeredAt: { gte: since } }
      })
    ]);

    const statusStats = await this.prisma.webhookExecution.groupBy({
      by: ['status'],
      where: { triggeredAt: { gte: since } },
      _count: { status: true }
    });

    return {
      webhooks: {
        total: totalWebhooks,
        active: activeWebhooks,
        inactive: totalWebhooks - activeWebhooks,
      },
      executions: {
        total: totalExecutions,
        recent: recentExecutions,
        success: statusStats.find(s => s.status === 'COMPLETED')?._count.status || 0,
        failed: statusStats.find(s => s.status === 'FAILED')?._count.status || 0,
        pending: statusStats.find(s => s.status === 'RECEIVED')?._count.status || 0,
      },
      performance: {
        averageResponseTime: 0, // TODO: Calculate from stored metrics
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getAllWebhooks(limit = 50, offset = 0) {
    return await this.prisma.webhook.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { executions: true }
        }
      }
    });
  }
}
