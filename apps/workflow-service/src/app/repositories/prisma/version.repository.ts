import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weconnect-v2/prisma';
import { IVersionRepository, Version } from '@weconnect-v2/domain';

@Injectable()
export class PrismaVersionRepository implements IVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(version: Partial<Version>): Promise<Version> {
    return this.prisma.workflowVersion.create({
      data: version,
    });
  }

  async findByWorkflowId(workflowId: string): Promise<Version[]> {
    return this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findLatestByWorkflowId(workflowId: string): Promise<Version | null> {
    return this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findById(id: string): Promise<Version | null> {
    return this.prisma.workflowVersion.findUnique({
      where: { id },
    });
  }
}
