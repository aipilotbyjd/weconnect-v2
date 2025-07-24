import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'WeConnect Billing Service - Ready for SaaS operations!' };
  }
}
