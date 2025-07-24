import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully.' })
  async getAlerts() {
    const alerts = await this.alertsService.getAlerts();
    return {
      success: true,
      alerts,
    };
  }
}
