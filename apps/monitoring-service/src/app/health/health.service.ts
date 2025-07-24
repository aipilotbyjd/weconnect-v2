import { Injectable, Logger } from '@nestjs/common';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  url: string;
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly services = [
    { name: 'api-gateway', url: 'http://localhost:3000/api' },
    { name: 'user-service', url: 'http://localhost:3001/api' },
    { name: 'workflow-service', url: 'http://localhost:3002/api' },
    { name: 'execution-engine', url: 'http://localhost:3003/api' },
    { name: 'node-registry', url: 'http://localhost:3004/api' },
    { name: 'realtime-gateway', url: 'http://localhost:3005/api' },
    { name: 'webhook-service', url: 'http://localhost:3006/api' },
    { name: 'queue-manager', url: 'http://localhost:3007/api' },
    { name: 'analytics-service', url: 'http://localhost:3008/api' },
    { name: 'notification-service', url: 'http://localhost:3009/api' },
  ];

  async checkAllServices(): Promise<ServiceHealth[]> {
    const healthChecks = await Promise.all(
      this.services.map(service => this.checkService(service.name, service.url))
    );
    return healthChecks;
  }

  async checkService(name: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // TODO: Implement actual HTTP health check
      // const response = await fetch(`${url}/health`);
      // const isHealthy = response.ok;
      
      // Simulate health check
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        status: 'healthy',
        url,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        url,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
  }> {
    const services = await this.checkAllServices();
    const healthy = services.filter(s => s.status === 'healthy').length;
    const unhealthy = services.filter(s => s.status === 'unhealthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy === 0) {
      overall = 'healthy';
    } else if (unhealthy < services.length / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services,
      summary: {
        total: services.length,
        healthy,
        unhealthy,
      },
    };
  }
}
