import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async getNotifications() {
    return {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      notifications: [],
    };
  }
}
