import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SystemMetric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface ServiceMetrics {
  serviceName: string;
  metrics: {
    requestCount: number;
    errorCount: number;
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics = new Map<string, SystemMetric>();

  constructor(
    @InjectQueue('metrics-collection')
    private metricsQueue: Queue,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Record a metric value
   */
  async recordMetric(metric: SystemMetric): Promise<void> {
    try {
      const key = `${metric.name}_${Date.now()}`;
      this.metrics.set(key, metric);

      // Queue for processing
      await this.metricsQueue.add('process-metric', metric, {
        priority: metric.type === 'counter' ? 10 : 5,
        attempts: 3,
      });

      // Cache for quick access
      const cacheKey = `metric:${metric.name}:latest`;
      await this.cacheManager.set(cacheKey, metric, 60); // 1 minute

      this.logger.debug(`Recorded metric: ${metric.name} = ${metric.value}`);
    } catch (error) {
      this.logger.error(`Failed to record metric: ${error.message}`, error.stack);
    }
  }

  /**
   * Increment a counter metric
   */
  async incrementCounter(name: string, labels?: Record<string, string>): Promise<void> {
    const metric: SystemMetric = {
      name,
      value: 1,
      timestamp: new Date(),
      labels,
      type: 'counter',
    };
    await this.recordMetric(metric);
  }

  /**
   * Set a gauge metric value
   */
  async setGauge(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    const metric: SystemMetric = {
      name,
      value,
      timestamp: new Date(),
      labels,
      type: 'gauge',
    };
    await this.recordMetric(metric);
  }

  /**
   * Record histogram metric (for measuring durations, sizes, etc.)
   */
  async recordHistogram(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    const metric: SystemMetric = {
      name,
      value,
      timestamp: new Date(),
      labels,
      type: 'histogram',
    };
    await this.recordMetric(metric);
  }

  /**
   * Get current metrics
   */
  async getMetrics(name?: string): Promise<SystemMetric[]> {
    const allMetrics = Array.from(this.metrics.values());
    
    if (name) {
      return allMetrics.filter(metric => metric.name === name);
    }
    
    return allMetrics;
  }

  /**
   * Get aggregated metrics for a time period
   */
  async getAggregatedMetrics(
    name: string,
    timeRange: 'hour' | 'day' | 'week' = 'hour',
  ): Promise<any> {
    const cacheKey = `metrics:aggregated:${name}:${timeRange}`;
    let aggregated = await this.cacheManager.get(cacheKey);

    if (!aggregated) {
      const now = new Date();
      const startTime = new Date();
      
      switch (timeRange) {
        case 'hour':
          startTime.setHours(now.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(now.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(now.getDate() - 7);
          break;
      }

      const relevantMetrics = Array.from(this.metrics.values()).filter(
        metric => metric.name === name && metric.timestamp >= startTime
      );

      aggregated = this.aggregateMetrics(relevantMetrics);
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, aggregated, 300);
    }

    return aggregated;
  }

  /**
   * Record service metrics
   */
  async recordServiceMetrics(serviceMetrics: ServiceMetrics): Promise<void> {
    try {
      await Promise.all([
        this.setGauge(`service_request_count`, serviceMetrics.metrics.requestCount, { service: serviceMetrics.serviceName }),
        this.setGauge(`service_error_count`, serviceMetrics.metrics.errorCount, { service: serviceMetrics.serviceName }),
        this.setGauge(`service_response_time`, serviceMetrics.metrics.responseTime, { service: serviceMetrics.serviceName }),
        this.setGauge(`service_cpu_usage`, serviceMetrics.metrics.cpuUsage, { service: serviceMetrics.serviceName }),
        this.setGauge(`service_memory_usage`, serviceMetrics.metrics.memoryUsage, { service: serviceMetrics.serviceName }),
        this.setGauge(`service_uptime`, serviceMetrics.metrics.uptime, { service: serviceMetrics.serviceName }),
      ]);

      this.logger.debug(`Recorded service metrics for: ${serviceMetrics.serviceName}`);
    } catch (error) {
      this.logger.error(`Failed to record service metrics: ${error.message}`, error.stack);
    }
  }

  /**
   * Get service health metrics
   */
  async getServiceHealthMetrics(): Promise<Record<string, any>> {
    const services = ['api-gateway', 'user-service', 'workflow-service', 'execution-engine', 
                    'node-registry', 'realtime-gateway', 'webhook-service', 'queue-manager'];
    
    const healthMetrics: Record<string, any> = {};
    
    for (const service of services) {
      const metrics = await Promise.all([
        this.getLatestMetric(`service_request_count`, { service }),
        this.getLatestMetric(`service_error_count`, { service }),
        this.getLatestMetric(`service_response_time`, { service }),
        this.getLatestMetric(`service_cpu_usage`, { service }),
        this.getLatestMetric(`service_memory_usage`, { service }),
        this.getLatestMetric(`service_uptime`, { service }),
      ]);

      healthMetrics[service] = {
        requestCount: metrics[0]?.value || 0,
        errorCount: metrics[1]?.value || 0,
        responseTime: metrics[2]?.value || 0,
        cpuUsage: metrics[3]?.value || 0,
        memoryUsage: metrics[4]?.value || 0,
        uptime: metrics[5]?.value || 0,
        healthy: (metrics[1]?.value || 0) < 10 && (metrics[2]?.value || 0) < 5000, // Basic health check
      };
    }

    return healthMetrics;
  }

  /**
   * Clean old metrics periodically
   */
  @Cron(CronExpression.EVERY_HOUR)
  private async cleanOldMetrics(): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 24); // Keep last 24 hours

      let cleanedCount = 0;
      for (const [key, metric] of this.metrics.entries()) {
        if (metric.timestamp < cutoff) {
          this.metrics.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned ${cleanedCount} old metrics`);
      }
    } catch (error) {
      this.logger.error('Failed to clean old metrics', error.stack);
    }
  }

  /**
   * Get latest metric value
   */
  private async getLatestMetric(name: string, labels?: Record<string, string>): Promise<SystemMetric | null> {
    const cacheKey = `metric:${name}:latest`;
    return await this.cacheManager.get(cacheKey);
  }

  /**
   * Aggregate metrics based on type
   */
  private aggregateMetrics(metrics: SystemMetric[]): any {
    if (metrics.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: metrics.length,
      sum,
      avg,
      min,
      max,
      latest: metrics[metrics.length - 1],
    };
  }
}
