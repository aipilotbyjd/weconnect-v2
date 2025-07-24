import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LoadBalancerService, LoadBalancingAlgorithm } from './load-balancer.service';

@ApiTags('Load Balancer')
@Controller('load-balancer')
export class LoadBalancerController {
  constructor(private readonly loadBalancerService: LoadBalancerService) {}

  @Get('next/:serviceName')
  @ApiOperation({ summary: 'Get next service instance using load balancing' })
  @ApiResponse({ status: 200, description: 'Next service instance retrieved successfully.' })
  @ApiQuery({ name: 'algorithm', required: false, enum: ['round-robin', 'weighted-round-robin', 'least-connections', 'random', 'ip-hash'] })
  @ApiQuery({ name: 'clientIp', required: false, type: String })
  getNextInstance(
    @Param('serviceName') serviceName: string,
    @Query('algorithm') algorithm?: LoadBalancingAlgorithm,
    @Query('clientIp') clientIp?: string,
  ) {
    const instance = this.loadBalancerService.getNextInstance(serviceName, algorithm, clientIp);
    return {
      success: !!instance,
      instance,
      algorithm: algorithm || 'round-robin',
      message: instance ? 'Instance selected successfully' : 'No healthy instances available',
    };
  }

  @Post('release/:serviceName/:instanceId')
  @ApiOperation({ summary: 'Release connection from service instance' })
  @ApiResponse({ status: 200, description: 'Connection released successfully.' })
  releaseConnection(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
  ) {
    this.loadBalancerService.releaseConnection(serviceName, instanceId);
    return {
      success: true,
      message: 'Connection released successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get load balancer statistics' })
  @ApiResponse({ status: 200, description: 'Load balancer statistics retrieved successfully.' })
  getStats() {
    const stats = this.loadBalancerService.getStats();
    return {
      success: true,
      stats,
    };
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset load balancer statistics' })
  @ApiResponse({ status: 200, description: 'Load balancer statistics reset successfully.' })
  resetStats() {
    this.loadBalancerService.resetStats();
    return {
      success: true,
      message: 'Load balancer statistics reset successfully',
    };
  }
}
