import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  async getAlerts() {
    return {
      active: 0,
      resolved: 5,
      total: 5,
      alerts: [],
    };
  }
}
