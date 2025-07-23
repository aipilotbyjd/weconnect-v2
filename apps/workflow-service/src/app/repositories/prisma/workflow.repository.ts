import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../libs/src/lib/prisma/prisma.service';
import { IWorkflowRepository } from '../../../../../../libs/domain/src/lib/workflow/repositories/workflow.repository.interface';
import { Workflow } from '../../../../../../libs/domain/src/lib/workflow/entities/workflow.entity';

@Injectable()
export class PrismaWorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workflow: Partial<Workflow>): Promise<Workflow> {
    const result = await this.prisma.workflow.create({
      data: workflow as any,
    });
    return result as Workflow;
  }

  async findById(id: string): Promise<Workflow | null> {
    const result = await this.prisma.workflow.findUnique({
      where: { id },
    });
    return result as Workflow | null;
  }

  async findByUserId(userId: string): Promise<Workflow[]> {
    const results = await this.prisma.workflow.findMany({
      where: { userId },
    });
    return results as Workflow[];
  }

  async update(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const result = await this.prisma.workflow.update({
      where: { id },
      data: updates as any,
    });
    return result as Workflow;
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
