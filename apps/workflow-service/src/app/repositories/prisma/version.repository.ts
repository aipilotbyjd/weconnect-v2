import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../libs/src/lib/prisma/prisma.service';
import { IVersionRepository } from '../../../../../../libs/domain/src/lib/workflow/repositories/version.repository.interface';
import { Version } from '../../../../../../libs/domain/src/lib/workflow/entities/version.entity';

@Injectable()
export class PrismaVersionRepository implements IVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(version: Partial<Version>): Promise<Version> {
    const result = await this.prisma.workflowVersion.create({
      data: version as any,
    });
    return result as Version;
  }

  async findByWorkflowId(workflowId: string): Promise<Version[]> {
    const results = await this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });
    return results as Version[];
  }

  async findLatestByWorkflowId(workflowId: string): Promise<Version | null> {
    const result = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });
    return result as Version | null;
  }

  async findById(id: string): Promise<Version | null> {
    const result = await this.prisma.workflowVersion.findUnique({
      where: { id },
    });
    return result as Version | null;
  }
}
