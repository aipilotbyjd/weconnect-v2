import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PushService, PushNotification } from './push.service';

@ApiTags('Push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a push notification' })
  @ApiResponse({ status: 201, description: 'Push notification sent successfully.' })
  async sendPush(@Body() notification: PushNotification) {
    const result = await this.pushService.sendPush(notification);
    return {
      success: result,
      message: result ? 'Push notification sent successfully' : 'Failed to send push notification',
    };
  }
}
