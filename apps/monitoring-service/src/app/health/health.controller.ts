import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully.' })
  async getSystemHealth() {
    const health = await this.healthService.getSystemHealth();
    return {
      success: true,
      health,
      timestamp: new Date(),
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Get health status of all services' })
  @ApiResponse({ status: 200, description: 'Services health retrieved successfully.' })
  async getAllServicesHealth() {
    const services = await this.healthService.checkAllServices();
    return {
      success: true,
      services,
      timestamp: new Date(),
    };
  }

  @Get('service/:name')
  @ApiOperation({ summary: 'Get health status of a specific service' })
  @ApiResponse({ status: 200, description: 'Service health retrieved successfully.' })
  async getServiceHealth(@Param('name') name: string) {
    const services = await this.healthService.checkAllServices();
    const service = services.find(s => s.name === name);
    
    return {
      success: !!service,
      service,
      message: service ? 'Service found' : 'Service not found',
      timestamp: new Date(),
    };
  }
}
