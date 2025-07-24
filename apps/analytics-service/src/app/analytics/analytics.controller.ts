import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully.' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getDashboardStats(@Query('userId') userId?: string) {
    const stats = await this.analyticsService.getDashboardStats(userId);
    return { success: true, stats };
  }

  @Get('workflow/performance')
  @ApiOperation({ summary: 'Get workflow performance metrics' })
  @ApiResponse({ status: 200, description: 'Workflow performance metrics retrieved successfully.' })
  @ApiQuery({ name: 'workflowId', required: true, type: String })
  async getWorkflowPerformance(@Query('workflowId') workflowId: string) {
    const performance = await this.analyticsService.getWorkflowPerformance(workflowId);
    return { success: true, performance };
  }

  @Get('workflow/analytics')
  @ApiOperation({ summary: 'Get workflow analytics data' })
  @ApiResponse({ status: 200, description: 'Workflow analytics data retrieved successfully.' })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getWorkflowAnalytics(
    @Query('workflowId') workflowId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: Date,
    @Query('dateTo') dateTo?: Date,
  ) {
    const analytics = await this.analyticsService.getWorkflowAnalytics(workflowId, userId, dateFrom, dateTo);
    return { success: true, analytics };
  }

  @Get('node/analytics')
  @ApiOperation({ summary: 'Get node analytics data' })
  @ApiResponse({ status: 200, description: 'Node analytics data retrieved successfully.' })
  @ApiQuery({ name: 'nodeType', required: false, type: String })
  @ApiQuery({ name: 'workflowId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getNodeAnalytics(
    @Query('nodeType') nodeType?: string,
    @Query('workflowId') workflowId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: Date,
    @Query('dateTo') dateTo?: Date,
  ) {
    const analytics = await this.analyticsService.getNodeAnalytics(nodeType, workflowId, userId, dateFrom, dateTo);
    return { success: true, analytics };
  }
}

