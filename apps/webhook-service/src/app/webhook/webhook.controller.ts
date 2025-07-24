import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Logger 
} from '@nestjs/common';
import { WebhookService, CreateWebhookDto } from './webhook.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('api/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  async createWebhook(@Body() createWebhookDto: CreateWebhookDto) {
    return await this.webhookService.createWebhook(createWebhookDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  async getWebhook(@Param('id') id: string) {
    return await this.webhookService.getWebhook(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateWebhookDto: Partial<CreateWebhookDto>
  ) {
    return await this.webhookService.updateWebhook(id, updateWebhookDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  async deleteWebhook(@Param('id') id: string) {
    await this.webhookService.deleteWebhook(id);
    return { message: 'Webhook deleted successfully' };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get webhook execution history' })
  @ApiResponse({ status: 200, description: 'Webhook execution history' })
  async getWebhookExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: number
  ) {
    return await this.webhookService.getWebhookExecutions(id, limit);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Webhook statistics' })
  async getWebhookStats(
    @Param('id') id: string,
    @Query('days') days?: number
  ) {
    return await this.webhookService.getWebhookStats(id, days);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test webhook with sample payload' })
  @ApiResponse({ status: 200, description: 'Webhook test result' })
  async testWebhook(
    @Param('id') id: string,
    @Body() testPayload: any
  ) {
    const webhook = await this.webhookService.getWebhook(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Execute webhook with test payload
    return await this.webhookService.executeWebhook(
      webhook.method,
      webhook.path,
      testPayload,
      { 'content-type': 'application/json' },
      {},
      'test',
      'webhook-test-client'
    );
  }

  @Post('bulk-create')
  @ApiOperation({ summary: 'Create multiple webhooks' })
  @ApiResponse({ status: 201, description: 'Webhooks created successfully' })
  async createBulkWebhooks(@Body() webhooks: CreateWebhookDto[]) {
    const results = [];
    
    for (const webhookDto of webhooks) {
      try {
        const result = await this.webhookService.createWebhook(webhookDto);
        results.push({ success: true, webhook: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          webhook: webhookDto.name 
        });
      }
    }

    return {
      total: webhooks.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks list' })
  async listWebhooks(
    @Query('workflowId') workflowId?: string,
    @Query('active') active?: boolean,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const where: any = {};
    
    if (workflowId) {
      where.workflowId = workflowId;
    }
    
    if (active !== undefined) {
      where.isActive = active;
    }

    const skip = (page - 1) * limit;

    const [webhooks, total] = await Promise.all([
      this.webhookService['prisma'].webhook.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow: {
            select: { id: true, name: true }
          },
          _count: {
            select: { executions: true }
          }
        }
      }),
      this.webhookService['prisma'].webhook.count({ where })
    ]);

    return {
      data: webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
