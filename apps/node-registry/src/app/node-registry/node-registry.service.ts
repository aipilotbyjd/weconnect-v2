import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@weconnect-v2/database';

@Injectable()
export class NodeRegistryService {
  private readonly logger = new Logger(NodeRegistryService.name);
  private readonly nodeCache = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    await this.loadBuiltInNodes();
  }

  async getAllNodes() {
    const nodes = await this.prisma.nodeDefinition.findMany({
      orderBy: [{ category: 'asc' }, { displayName: 'asc' }],
    });

    return nodes.map(node => ({
      ...node,
      properties: JSON.parse(node.properties as string),
      credentials: JSON.parse(node.credentials as string),
      rateLimits: JSON.parse(node.rateLimits as string),
    }));
  }

  async getNodeDefinition(name: string) {
    // Check cache first
    if (this.nodeCache.has(name)) {
      return this.nodeCache.get(name);
    }

    const node = await this.prisma.nodeDefinition.findUnique({
      where: { name },
    });

    if (!node) {
      throw new NotFoundException(`Node definition '${name}' not found`);
    }

    const result = {
      ...node,
      properties: JSON.parse(node.properties as string),
      credentials: JSON.parse(node.credentials as string),
      rateLimits: JSON.parse(node.rateLimits as string),
    };

    // Cache the result
    this.nodeCache.set(name, result);
    return result;
  }

  async registerNode(nodeDefinition: any) {
    // Validate node definition
    this.validateNodeDefinition(nodeDefinition);

    const node = await this.prisma.nodeDefinition.upsert({
      where: { name: nodeDefinition.name },
      create: {
        ...nodeDefinition,
        properties: JSON.stringify(nodeDefinition.properties),
        credentials: JSON.stringify(nodeDefinition.credentials || []),
        rateLimits: JSON.stringify(nodeDefinition.rateLimits || {}),
      },
      update: {
        ...nodeDefinition,
        properties: JSON.stringify(nodeDefinition.properties),
        credentials: JSON.stringify(nodeDefinition.credentials || []),
        rateLimits: JSON.stringify(nodeDefinition.rateLimits || {}),
        updatedAt: new Date(),
      },
    });

    // Clear cache
    this.nodeCache.delete(nodeDefinition.name);

    this.logger.log(`Node '${nodeDefinition.name}' registered successfully`);
    return node;
  }

  async updateNode(name: string, updates: any) {
    const existingNode = await this.getNodeDefinition(name);

    const updated = await this.prisma.nodeDefinition.update({
      where: { name },
      data: {
        ...updates,
        properties: updates.properties ? JSON.stringify(updates.properties) : undefined,
        credentials: updates.credentials ? JSON.stringify(updates.credentials) : undefined,
        rateLimits: updates.rateLimits ? JSON.stringify(updates.rateLimits) : undefined,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    this.nodeCache.delete(name);
    return updated;
  }

  async removeNode(name: string) {
    await this.prisma.nodeDefinition.delete({
      where: { name },
    });

    // Clear cache
    this.nodeCache.delete(name);

    this.logger.log(`Node '${name}' removed successfully`);
  }

  async getCategories() {
    const categories = await this.prisma.nodeDefinition.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    return categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
    }));
  }

  async validateNodeConfig(name: string, config: any) {
    const nodeDefinition = await this.getNodeDefinition(name);

    // Validate configuration against node properties schema
    const errors: string[] = [];
    const properties = nodeDefinition.properties;

    // Basic validation logic
    for (const field of properties.required || []) {
      if (!config[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async loadBuiltInNodes() {
    const builtInNodes = [
      {
        name: 'http-request',
        displayName: 'HTTP Request',
        description: 'Make HTTP requests to APIs',
        category: 'core',
        version: '1.0.0',
        icon: 'globe',
        color: '#4CAF50',
        properties: {
          url: { type: 'string', required: true, description: 'Request URL' },
          method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'json', description: 'Request body' },
        },
        isTrigger: false,
        isWebhook: false,
        tags: ['http', 'api', 'request'],
      },
      {
        name: 'webhook-trigger',
        displayName: 'Webhook Trigger',
        description: 'Trigger workflow via HTTP webhook',
        category: 'trigger',
        version: '1.0.0',
        icon: 'webhook',
        color: '#FF9800',
        properties: {
          path: { type: 'string', required: true, description: 'Webhook path' },
          method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
          authentication: { type: 'select', options: ['none', 'basic', 'bearer'], default: 'none' },
        },
        webhookMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        isTrigger: true,
        isWebhook: true,
        tags: ['webhook', 'trigger', 'http'],
      },
      {
        name: 'delay',
        displayName: 'Delay',
        description: 'Wait for a specified amount of time',
        category: 'utility',
        version: '1.0.0',
        icon: 'clock',
        color: '#9C27B0',
        properties: {
          duration: { type: 'number', required: true, description: 'Delay duration in milliseconds' },
          unit: { type: 'select', options: ['ms', 's', 'm', 'h'], default: 's' },
        },
        isTrigger: false,
        isWebhook: false,
        tags: ['delay', 'wait', 'utility'],
      },
    ];

    for (const node of builtInNodes) {
      try {
        await this.registerNode(node);
      } catch (error) {
        this.logger.warn(`Failed to register built-in node '${node.name}': ${error.message}`);
      }
    }

    this.logger.log(`Loaded ${builtInNodes.length} built-in nodes`);
  }

  private validateNodeDefinition(nodeDefinition: any) {
    const required = ['name', 'displayName', 'category', 'properties'];

    for (const field of required) {
      if (!nodeDefinition[field]) {
        throw new Error(`Required field '${field}' is missing from node definition`);
      }
    }

    if (typeof nodeDefinition.properties !== 'object') {
      throw new Error('Node properties must be an object');
    }
  }
}
