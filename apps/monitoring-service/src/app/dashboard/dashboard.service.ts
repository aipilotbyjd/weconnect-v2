import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  async getDashboardData() {
    return {
      uptime: '99.9%',
      totalRequests: 1234567,
      avgResponseTime: 245,
      activeUsers: 89,
      errorRate: 0.01,
      timestamp: new Date(),
    };
  }
}
