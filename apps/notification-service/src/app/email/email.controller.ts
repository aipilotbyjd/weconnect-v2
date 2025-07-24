import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService, EmailNotification } from './email.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({ status: 201, description: 'Email sent successfully.' })
  async sendEmail(@Body() notification: EmailNotification) {
    const result = await this.emailService.sendEmail(notification);
    return {
      success: result,
      message: result ? 'Email sent successfully' : 'Failed to send email',
    };
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk email notifications' })
  @ApiResponse({ status: 201, description: 'Bulk emails processed.' })
  async sendBulkEmails(@Body() notifications: EmailNotification[]) {
    const result = await this.emailService.sendBulkEmails(notifications);
    return {
      success: true,
      result,
      message: `Processed ${notifications.length} emails: ${result.success} sent, ${result.failed} failed`,
    };
  }
}
