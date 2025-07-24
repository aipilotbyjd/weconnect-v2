import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Redis from 'ioredis';

export interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  path?: string;
  healthy: boolean;
  lastHeartbeat: Date;
  metadata: {
    cpu?: number;
    memory?: number;
    requests?: number;
    responseTime?: number;
    errors?: number;
  };
  tags: string[];
  weight: number;
}

export interface ServiceRegistration {
  name: string;
  version: string;
  host: string;
  port: number;
  path?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  healthCheckUrl?: string;
}

@Injectable()
export class ServiceRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private readonly redis: Redis;
  private readonly services = new Map<string, ServiceInstance[]>();
  private readonly SERVICE_PREFIX = 'services:';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly SERVICE_TTL = 90; // 90 seconds

  constructor(
    @Inject('SERVICE_REGISTRY') private client: ClientProxy,
    private eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    await this.loadServicesFromRedis();
    this.setupEventListeners();
    this.logger.log('Service Registry initialized');
  }

  async onModuleDestroy() {
    await this.redis.disconnect();
  }

  /**
   * Register a new service instance
   */
  async registerService(registration: ServiceRegistration): Promise<string> {
    const instanceId = `${registration.name}-${registration.host}-${registration.port}-${Date.now()}`;
    
    const instance: ServiceInstance = {
      id: instanceId,
      name: registration.name,
      version: registration.version,
      host: registration.host,
      port: registration.port,
      path: registration.path || '',
      healthy: true,
      lastHeartbeat: new Date(),
      metadata: registration.metadata || {},
      tags: registration.tags || [],
      weight: 100, // Default weight
    };

    // Store in Redis
    const key = `${this.SERVICE_PREFIX}${registration.name}:${instanceId}`;
    await this.redis.setex(key, this.SERVICE_TTL, JSON.stringify(instance));

    // Update local cache
    if (!this.services.has(registration.name)) {
      this.services.set(registration.name, []);
    }
    this.services.get(registration.name)!.push(instance);

    // Emit registration event
    this.eventEmitter.emit('service.registered', { instance });
    
    this.logger.log(`Service registered: ${registration.name} [${instanceId}]`);
    return instanceId;
  }

  /**
   * Deregister a service instance
   */
  async deregisterService(serviceName: string, instanceId: string): Promise<void> {
    const key = `${this.SERVICE_PREFIX}${serviceName}:${instanceId}`;
    await this.redis.del(key);

    // Update local cache
    const instances = this.services.get(serviceName);
    if (instances) {
      const index = instances.findIndex(s => s.id === instanceId);
      if (index !== -1) {
        const instance = instances.splice(index, 1)[0];
        this.eventEmitter.emit('service.deregistered', { instance });
      }
    }

    this.logger.log(`Service deregistered: ${serviceName} [${instanceId}]`);
  }

  /**
   * Update service health status
   */
  async heartbeat(serviceName: string, instanceId: string, metadata?: Record<string, any>): Promise<void> {
    const instances = this.services.get(serviceName);
    if (!instances) return;

    const instance = instances.find(s => s.id === instanceId);
    if (!instance) return;

    instance.lastHeartbeat = new Date();
    instance.healthy = true;
    if (metadata) {
      instance.metadata = { ...instance.metadata, ...metadata };
    }

    // Update in Redis
    const key = `${this.SERVICE_PREFIX}${serviceName}:${instanceId}`;
    await this.redis.setex(key, this.SERVICE_TTL, JSON.stringify(instance));

    this.eventEmitter.emit('service.heartbeat', { instance });
  }

  /**
   * Get all healthy instances of a service
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName) || [];
    return instances.filter(instance => 
      instance.healthy && 
      (Date.now() - new Date(instance.lastHeartbeat).getTime()) < this.HEARTBEAT_INTERVAL * 2
    );
  }

  /**
   * Get all instances of a service
   */
  getAllInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Get all registered services
   */
  getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  /**
   * Find services by tag
   */
  getServicesByTag(tag: string): ServiceInstance[] {
    const result: ServiceInstance[] = [];
    for (const instances of this.services.values()) {
      result.push(...instances.filter(instance => 
        instance.tags.includes(tag) && instance.healthy
      ));
    }
    return result;
  }

  /**
   * Get service instance by ID
   */
  getServiceById(instanceId: string): ServiceInstance | null {
    for (const instances of this.services.values()) {
      const instance = instances.find(s => s.id === instanceId);
      if (instance) return instance;
    }
    return null;
  }

  /**
   * Update service weight for load balancing
   */
  async updateServiceWeight(serviceName: string, instanceId: string, weight: number): Promise<void> {
    const instances = this.services.get(serviceName);
    if (!instances) return;

    const instance = instances.find(s => s.id === instanceId);
    if (!instance) return;

    instance.weight = Math.max(0, Math.min(200, weight)); // Clamp between 0-200

    // Update in Redis
    const key = `${this.SERVICE_PREFIX}${serviceName}:${instanceId}`;
    await this.redis.setex(key, this.SERVICE_TTL, JSON.stringify(instance));

    this.eventEmitter.emit('service.weight_updated', { instance });
  }

  /**
   * Load services from Redis on startup
   */
  private async loadServicesFromRedis(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.SERVICE_PREFIX}*`);
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const instance: ServiceInstance = JSON.parse(data);
          
          if (!this.services.has(instance.name)) {
            this.services.set(instance.name, []);
          }
          this.services.get(instance.name)!.push(instance);
        }
      }

      this.logger.log(`Loaded ${keys.length} services from Redis`);
    } catch (error) {
      this.logger.error('Failed to load services from Redis', error);
    }
  }

  /**
   * Cleanup unhealthy services periodically
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async cleanupUnhealthyServices(): Promise<void> {
    const now = Date.now();
    const cutoff = now - (this.HEARTBEAT_INTERVAL * 3); // 90 seconds

    for (const [serviceName, instances] of this.services.entries()) {
      const unhealthyInstances = instances.filter(instance => 
        new Date(instance.lastHeartbeat).getTime() < cutoff
      );

      for (const instance of unhealthyInstances) {
        await this.deregisterService(serviceName, instance.id);
        this.logger.warn(`Removed unhealthy service: ${serviceName} [${instance.id}]`);
      }
    }
  }

  /**
   * Setup event listeners for inter-service communication
   */
  private setupEventListeners(): void {
    this.eventEmitter.on('service.registered', (data) => {
      this.logger.debug(`Service registered event: ${data.instance.name}`);
    });

    this.eventEmitter.on('service.deregistered', (data) => {
      this.logger.debug(`Service deregistered event: ${data.instance.name}`);
    });

    this.eventEmitter.on('service.heartbeat', (data) => {
      // Update metrics if needed
    });
  }

  /**
   * Get service statistics
   */
  getServiceStats(): Record<string, any> {
    const stats = {
      totalServices: this.services.size,
      totalInstances: 0,
      healthyInstances: 0,
      serviceDetails: {} as Record<string, any>,
    };

    for (const [serviceName, instances] of this.services.entries()) {
      const healthy = instances.filter(i => i.healthy);
      stats.totalInstances += instances.length;
      stats.healthyInstances += healthy.length;
      
      stats.serviceDetails[serviceName] = {
        total: instances.length,
        healthy: healthy.length,
        instances: instances.map(i => ({
          id: i.id,
          host: i.host,
          port: i.port,
          healthy: i.healthy,
          lastHeartbeat: i.lastHeartbeat,
          weight: i.weight,
          metadata: i.metadata,
        })),
      };
    }

    return stats;
  }
}
