import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Body, 
  Query, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';

@ApiTags('Queue Management')
@Controller('api/queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get statistics for all queues' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Get(':queueName/stats')
  @ApiOperation({ summary: 'Get statistics for a specific queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStat(@Param('queueName') queueName: string) {
    return this.queueService.getQueueStat(queueName);
  }

  @Post('workflow-execution')
  @ApiOperation({ summary: 'Add a workflow execution job to the queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addWorkflowExecution(@Body() jobData: any) {
    return this.queueService.addWorkflowExecution(jobData);
  }

  @Post('node-execution')
  @ApiOperation({ summary: 'Add a node execution job to the queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addNodeExecution(@Body() jobData: any) {
    return this.queueService.addNodeExecution(jobData);
  }

  @Post('node-execution/batch')
  @ApiOperation({ summary: 'Add multiple node execution jobs to the queue' })
  @ApiResponse({ status: 201, description: 'Batch jobs added successfully' })
  async addBatchNodeExecution(@Body() jobsData: any[]) {
    return this.queueService.addBatchNodeExecution(jobsData);
  }

  @Post('webhook-processing')
  @ApiOperation({ summary: 'Add a webhook processing job to the queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addWebhookProcessing(@Body() jobData: any) {
    return this.queueService.addWebhookProcessing(jobData);
  }

  @Post('notification')
  @ApiOperation({ summary: 'Add a notification job to the queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addNotification(@Body() jobData: any) {
    return this.queueService.addNotification(jobData);
  }

  @Post('analytics')
  @ApiOperation({ summary: 'Add an analytics event to the queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addAnalyticsEvent(@Body() jobData: any) {
    return this.queueService.addAnalyticsEvent(jobData);
  }

  @Post(':queueName/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.queueService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  @ApiOperation({ summary: 'Resume a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.queueService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Delete(':queueName/clear')
  @ApiOperation({ summary: 'Clear all jobs from a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Queue cleared successfully' })
  async clearQueue(@Param('queueName') queueName: string) {
    await this.queueService.clearQueue(queueName);
    return { message: `Queue ${queueName} cleared successfully` };
  }

  @Get(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Get details of a specific job' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job' })
  @ApiResponse({ status: 200, description: 'Job details retrieved successfully' })
  async getJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string
  ) {
    return this.queueService.getJob(queueName, jobId);
  }

  @Delete(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Cancel a specific job' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  async cancelJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string
  ) {
    await this.queueService.cancelJob(queueName, jobId);
    return { message: `Job ${jobId} cancelled successfully` };
  }

  @Post(':queueName/jobs/:jobId/retry')
  @ApiOperation({ summary: 'Retry a specific job' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiParam({ name: 'jobId', description: 'ID of the job' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  @HttpCode(HttpStatus.OK)
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string
  ) {
    await this.queueService.retryJob(queueName, jobId);
    return { message: `Job ${jobId} retried successfully` };
  }

  @Get(':queueName/failed')
  @ApiOperation({ summary: 'Get failed jobs from a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of jobs to retrieve' })
  @ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
  async getFailedJobs(
    @Param('queueName') queueName: string,
    @Query('limit') limit?: number
  ) {
    return this.queueService.getFailedJobs(queueName, limit);
  }

  @Post(':queueName/retry-failed')
  @ApiOperation({ summary: 'Retry all failed jobs in a queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({ status: 200, description: 'Failed jobs retried successfully' })
  @HttpCode(HttpStatus.OK)
  async retryAllFailedJobs(@Param('queueName') queueName: string) {
    await this.queueService.retryAllFailedJobs(queueName);
    return { message: `All failed jobs in queue ${queueName} retried successfully` };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean old jobs from all queues' })
  @ApiQuery({ name: 'olderThanHours', required: false, description: 'Clean jobs older than specified hours' })
  @ApiResponse({ status: 200, description: 'Old jobs cleaned successfully' })
  @HttpCode(HttpStatus.OK)
  async cleanOldJobs(@Query('olderThanHours') olderThanHours?: number) {
    await this.queueService.cleanOldJobs(olderThanHours);
    return { message: 'Old jobs cleaned successfully' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all queues' })
  @ApiResponse({ status: 200, description: 'Queue health status retrieved successfully' })
  async healthCheck() {
    return this.queueService.healthCheck();
  }
}
