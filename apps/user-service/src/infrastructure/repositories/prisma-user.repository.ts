import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../libs/src/lib/prisma/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserRepository, UserFilters } from '../../domain/repositories/user.repository';
import { UserRole } from '../../../../../generated/prisma';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? User.fromPrisma(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? User.fromPrisma(user) : null;
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => User.fromPrisma(user));
  }

  async create(user: User): Promise<User> {
    const createdUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId || null,
        isActive: user.isActive,
      },
    });

    return User.fromPrisma(createdUser);
  }

  async update(user: User): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: user.toPrisma(),
    });

    return User.fromPrisma(updatedUser);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return User.fromPrisma(updatedUser);
  }

  async findMany(filters: UserFilters): Promise<User[]> {
    const {
      organizationId,
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (role) {
      where.role = role as UserRole;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return users.map((user) => User.fromPrisma(user));
  }

  async count(filters: UserFilters): Promise<number> {
    const { organizationId, role, isActive, search } = filters;

    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (role) {
      where.role = role as UserRole;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.count({ where });
  }
}
