import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceHealth[];
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: 200,
    description: 'System health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        version: { type: 'string' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['healthy', 'unhealthy'] },
              responseTime: { type: 'number' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getHealth(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    
    // Mock service health checks (will be implemented later)
    const services: ServiceHealth[] = [
      {
        name: 'workflow-service',
        status: 'healthy',
        responseTime: Date.now() - startTime,
      },
      {
        name: 'execution-engine',
        status: 'healthy',
        responseTime: Date.now() - startTime,
      },
      {
        name: 'user-service',
        status: 'healthy',
        responseTime: Date.now() - startTime,
      },
      {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
      },
      {
        name: 'redis',
        status: 'healthy',
        responseTime: Date.now() - startTime,
      },
    ];

    const overallStatus = services.every(service => service.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      services,
    };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  @ApiResponse({ status: 200, description: 'Pong response' })
  ping(): { message: string; timestamp: string } {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}
