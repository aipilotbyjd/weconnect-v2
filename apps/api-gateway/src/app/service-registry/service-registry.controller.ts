import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServiceRegistryService, ServiceRegistration } from './service-registry.service';

@ApiTags('Service Registry')
@Controller('registry')
export class ServiceRegistryController {
  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new service instance' })
  @ApiResponse({ status: 201, description: 'Service registered successfully' })
  async registerService(@Body() registration: ServiceRegistration) {
    const instanceId = await this.serviceRegistry.registerService(registration);
    return {
      success: true,
      instanceId,
      message: 'Service registered successfully',
    };
  }

  @Delete(':serviceName/:instanceId')
  @ApiOperation({ summary: 'Deregister a service instance' })
  async deregisterService(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
  ) {
    await this.serviceRegistry.deregisterService(serviceName, instanceId);
    return {
      success: true,
      message: 'Service deregistered successfully',
    };
  }

  @Post(':serviceName/:instanceId/heartbeat')
  @ApiOperation({ summary: 'Send heartbeat for service instance' })
  async heartbeat(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
    @Body() metadata?: Record<string, any>,
  ) {
    await this.serviceRegistry.heartbeat(serviceName, instanceId, metadata);
    return {
      success: true,
      message: 'Heartbeat recorded',
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Get all registered services' })
  async getAllServices() {
    const services = this.serviceRegistry.getAllServices();
    return {
      success: true,
      services: Object.fromEntries(services),
    };
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get all instances of a specific service' })
  async getServiceInstances(@Param('serviceName') serviceName: string) {
    const instances = this.serviceRegistry.getAllInstances(serviceName);
    return {
      success: true,
      serviceName,
      instances,
    };
  }

  @Get('services/:serviceName/healthy')
  @ApiOperation({ summary: 'Get healthy instances of a specific service' })
  async getHealthyInstances(@Param('serviceName') serviceName: string) {
    const instances = this.serviceRegistry.getHealthyInstances(serviceName);
    return {
      success: true,
      serviceName,
      instances,
    };
  }

  @Get('services/tag/:tag')
  @ApiOperation({ summary: 'Get services by tag' })
  async getServicesByTag(@Param('tag') tag: string) {
    const instances = this.serviceRegistry.getServicesByTag(tag);
    return {
      success: true,
      tag,
      instances,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get service registry statistics' })
  async getStats() {
    const stats = this.serviceRegistry.getServiceStats();
    return {
      success: true,
      stats,
    };
  }
}
