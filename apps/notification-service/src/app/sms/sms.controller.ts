import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmsService, SmsNotification } from './sms.service';

@ApiTags('SMS')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({ status: 201, description: 'SMS sent successfully.' })
  async sendSms(@Body() notification: SmsNotification) {
    const result = await this.smsService.sendSms(notification);
    return {
      success: result,
      message: result ? 'SMS sent successfully' : 'Failed to send SMS',
    };
  }
}
