import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weconnect-v2/prisma';
import { IWorkflowRepository, Workflow } from '@weconnect-v2/domain';

@Injectable()
export class PrismaWorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workflow: Partial<Workflow>): Promise<Workflow> {
    return this.prisma.workflow.create({
      data: workflow,
    });
  }

  async findById(id: string): Promise<Workflow | null> {
    return this.prisma.workflow.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Workflow[]> {
    return this.prisma.workflow.findMany({
      where: { userId },
    });
  }

  async update(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    return this.prisma.workflow.update({
      where: { id },
      data: updates,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflow.delete({
      where: { id },
    });
  }

  async activate(id: string): Promise<void> {
    await this.prisma.workflow.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
