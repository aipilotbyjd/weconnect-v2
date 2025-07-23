import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../libs/src/lib/prisma/prisma.service';
import { IUserRepository } from '../../../../../../libs/domain/src/lib/user/repositories/user.repository.interface';
import { User } from '../../../../../../libs/domain/src/lib/user/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: Partial<User>): Promise<User> {
    const result = await this.prisma.user.create({
      data: user as any,
    });
    return result as User;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.prisma.user.findUnique({
      where: { id },
    });
    return result as User | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.prisma.user.findUnique({
      where: { email },
    });
    return result as User | null;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const result = await this.prisma.user.update({
      where: { id },
      data: updates as any,
    });
    return result as User;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    const results = await this.prisma.user.findMany({
      where: { organizationId },
    });
    return results as User[];
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
