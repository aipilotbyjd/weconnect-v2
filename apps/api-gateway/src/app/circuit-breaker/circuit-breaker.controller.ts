import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CircuitBreakerService, CircuitBreakerOptions } from './circuit-breaker.service';

@ApiTags('Circuit Breaker')
@Controller('circuit-breaker')
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Post('configure/:serviceName')
  @ApiOperation({ summary: 'Configure circuit breaker for a service' })
  @ApiResponse({ status: 201, description: 'Circuit breaker configured successfully.' })
  @ApiBody({ type: Object })
  configure(@Param('serviceName') serviceName: string, @Body() options: CircuitBreakerOptions) {
    this.circuitBreakerService.configure(serviceName, options);
    return {
      success: true,
      message: `Circuit breaker configured for service: ${serviceName}`,
      options,
    };
  }

  @Get('stats/:serviceName')
  @ApiOperation({ summary: 'Get circuit breaker statistics for a service' })
  @ApiResponse({ status: 200, description: 'Circuit breaker statistics retrieved successfully.' })
  getStats(@Param('serviceName') serviceName: string) {
    const stats = this.circuitBreakerService.getStats(serviceName);
    return {
      success: true,
      stats,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get circuit breaker statistics for all services' })
  @ApiResponse({ status: 200, description: 'All circuit breaker statistics retrieved successfully.' })
  getAllStats() {
    const stats = this.circuitBreakerService.getAllStats();
    return {
      success: true,
      stats,
    };
  }

  @Post('reset/:serviceName')
  @ApiOperation({ summary: 'Reset circuit breaker for a service' })
  @ApiResponse({ status: 200, description: 'Circuit breaker reset successfully.' })
  reset(@Param('serviceName') serviceName: string) {
    this.circuitBreakerService.reset(serviceName);
    return {
      success: true,
      message: `Circuit breaker reset for service: ${serviceName}`,
    };
  }

  @Post('force-open/:serviceName')
  @ApiOperation({ summary: 'Force open circuit breaker for maintenance' })
  @ApiResponse({ status: 200, description: 'Circuit breaker forced open successfully.' })
  forceOpen(@Param('serviceName') serviceName: string) {
    this.circuitBreakerService.forceOpen(serviceName);
    return {
      success: true,
      message: `Circuit breaker forced open for service: ${serviceName}`,
    };
  }

  @Post('force-close/:serviceName')
  @ApiOperation({ summary: 'Force close circuit breaker' })
  @ApiResponse({ status: 200, description: 'Circuit breaker forced closed successfully.' })
  forceClose(@Param('serviceName') serviceName: string) {
    this.circuitBreakerService.forceClose(serviceName);
    return {
      success: true,
      message: `Circuit breaker forced closed for service: ${serviceName}`,
    };
  }
}
