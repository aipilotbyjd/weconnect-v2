import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService, WebhookNotification } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a webhook notification' })
  @ApiResponse({ status: 201, description: 'Webhook sent successfully.' })
  async sendWebhook(@Body() notification: WebhookNotification) {
    const result = await this.webhookService.sendWebhook(notification);
    return {
      success: result,
      message: result ? 'Webhook sent successfully' : 'Failed to send webhook',
    };
  }
}
