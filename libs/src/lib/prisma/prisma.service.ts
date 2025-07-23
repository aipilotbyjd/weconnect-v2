import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Disconnected from PostgreSQL database');
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Transaction helper
  async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  // Soft delete helper
  async softDelete(model: string, id: string) {
    const modelDelegate = this[model as keyof PrismaClient] as any;
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }
    
    return modelDelegate.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }
}
