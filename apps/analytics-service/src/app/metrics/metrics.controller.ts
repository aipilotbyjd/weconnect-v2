import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MetricsService, SystemMetric, ServiceMetrics } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('record')
  @ApiOperation({ summary: 'Record a custom metric value' })
  @ApiResponse({ status: 201, description: 'Metric recorded successfully.' })
  @ApiBody({ type: Object })
  async recordMetric(@Body() metric: SystemMetric) {
    await this.metricsService.recordMetric(metric);
    return { success: true, message: 'Metric recorded successfully' };
  }

  @Post('counter/:name/increment')
  @ApiOperation({ summary: 'Increment a counter metric' })
  @ApiResponse({ status: 201, description: 'Counter incremented successfully.' })
  async incrementCounter(
    @Param('name') name: string,
    @Body() labels?: Record<string, string>,
  ) {
    await this.metricsService.incrementCounter(name, labels);
    return { success: true, message: 'Counter incremented successfully' };
  }

  @Post('gauge/:name')
  @ApiOperation({ summary: 'Set a gauge metric value' })
  @ApiResponse({ status: 201, description: 'Gauge value set successfully.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        labels: { type: 'object' }
      },
      required: ['value']
    }
  })
  async setGauge(
    @Param('name') name: string,
    @Body() body: { value: number; labels?: Record<string, string> },
  ) {
    await this.metricsService.setGauge(name, body.value, body.labels);
    return { success: true, message: 'Gauge value set successfully' };
  }

  @Post('histogram/:name')
  @ApiOperation({ summary: 'Record a histogram metric value' })
  @ApiResponse({ status: 201, description: 'Histogram value recorded successfully.' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        labels: { type: 'object' }
      },
      required: ['value']
    }
  })
  async recordHistogram(
    @Param('name') name: string,
    @Body() body: { value: number; labels?: Record<string, string> },
  ) {
    await this.metricsService.recordHistogram(name, body.value, body.labels);
    return { success: true, message: 'Histogram value recorded successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all metrics or filter by name' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully.' })
  @ApiQuery({ name: 'name', required: false, type: String })
  async getMetrics(@Query('name') name?: string) {
    const metrics = await this.metricsService.getMetrics(name);
    return { success: true, metrics };
  }

  @Get('aggregated/:name')
  @ApiOperation({ summary: 'Get aggregated metrics for a time period' })
  @ApiResponse({ status: 200, description: 'Aggregated metrics retrieved successfully.' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week'] })
  async getAggregatedMetrics(
    @Param('name') name: string,
    @Query('timeRange') timeRange: 'hour' | 'day' | 'week' = 'hour',
  ) {
    const aggregated = await this.metricsService.getAggregatedMetrics(name, timeRange);
    return { success: true, aggregated };
  }

  @Post('service')
  @ApiOperation({ summary: 'Record service metrics' })
  @ApiResponse({ status: 201, description: 'Service metrics recorded successfully.' })
  @ApiBody({ type: Object })
  async recordServiceMetrics(@Body() serviceMetrics: ServiceMetrics) {
    await this.metricsService.recordServiceMetrics(serviceMetrics);
    return { success: true, message: 'Service metrics recorded successfully' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get service health metrics' })
  @ApiResponse({ status: 200, description: 'Service health metrics retrieved successfully.' })
  async getServiceHealthMetrics() {
    const healthMetrics = await this.metricsService.getServiceHealthMetrics();
    return { success: true, healthMetrics };
  }
}
