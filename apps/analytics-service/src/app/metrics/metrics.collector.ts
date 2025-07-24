import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { SystemMetric } from './metrics.service';

@Processor('metrics-collection')
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);

  @Process('process-metric')
  async processMetric(job: Job<SystemMetric>) {
    this.logger.debug(`Processing metric: ${job.data.name} = ${job.data.value}`);
    
    try {
      const { data } = job;
      
      // Process the metric based on its type
      switch (data.type) {
        case 'counter':
          await this.processCounterMetric(data);
          break;
        case 'gauge':
          await this.processGaugeMetric(data);
          break;
        case 'histogram':
          await this.processHistogramMetric(data);
          break;
        case 'summary':
          await this.processSummaryMetric(data);
          break;
        default:
          this.logger.warn(`Unknown metric type: ${data.type}`);
      }
      
      this.logger.log(`Processed metric: ${data.name}`);
    } catch (error) {
      this.logger.error(`Failed to process metric: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processCounterMetric(metric: SystemMetric) {
    // Process counter metrics - typically just increment
    this.logger.debug(`Processing counter metric: ${metric.name}`);
    // Could persist to database, send to external monitoring systems, etc.
  }

  private async processGaugeMetric(metric: SystemMetric) {
    // Process gauge metrics - set current value
    this.logger.debug(`Processing gauge metric: ${metric.name} = ${metric.value}`);
    // Could check thresholds, trigger alerts, etc.
  }

  private async processHistogramMetric(metric: SystemMetric) {
    // Process histogram metrics - track distribution of values
    this.logger.debug(`Processing histogram metric: ${metric.name} = ${metric.value}`);
    // Could calculate percentiles, track buckets, etc.
  }

  private async processSummaryMetric(metric: SystemMetric) {
    // Process summary metrics - similar to histogram but with quantiles
    this.logger.debug(`Processing summary metric: ${metric.name} = ${metric.value}`);
    // Could calculate quantiles, track observations, etc.
  }
}
