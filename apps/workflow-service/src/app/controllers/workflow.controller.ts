import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkflowService } from '../services/workflow.service';
import { Workflow, Version, Node, Connection } from '@weconnect-v2/domain';

@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @MessagePattern('workflow.create')
  async createWorkflow(@Payload() data: {
    name: string;
    description?: string;
    userId: string;
    nodes?: Node[];
    connections?: Connection[];
  }): Promise<Workflow> {
    return this.workflowService.createWorkflow(data);
  }

  @MessagePattern('workflow.findById')
  async getWorkflowById(@Payload() data: { id: string }): Promise<Workflow> {
    return this.workflowService.getWorkflowById(data.id);
  }

  @MessagePattern('workflow.findByUserId')
  async getUserWorkflows(@Payload() data: { userId: string }): Promise<Workflow[]> {
    return this.workflowService.getUserWorkflows(data.userId);
  }

  @MessagePattern('workflow.update')
  async updateWorkflow(@Payload() data: {
    id: string;
    updates: Partial<Workflow>;
  }): Promise<Workflow> {
    return this.workflowService.updateWorkflow(data.id, data.updates);
  }

  @MessagePattern('workflow.delete')
  async deleteWorkflow(@Payload() data: { id: string }): Promise<void> {
    return this.workflowService.deleteWorkflow(data.id);
  }

  @MessagePattern('workflow.activate')
  async activateWorkflow(@Payload() data: { id: string }): Promise<void> {
    return this.workflowService.activateWorkflow(data.id);
  }

  @MessagePattern('workflow.deactivate')
  async deactivateWorkflow(@Payload() data: { id: string }): Promise<void> {
    return this.workflowService.deactivateWorkflow(data.id);
  }

  @MessagePattern('workflow.version.create')
  async createVersion(@Payload() data: {
    workflowId: string;
    nodes: Node[];
    connections: Connection[];
  }): Promise<Version> {
    return this.workflowService.createVersion(data.workflowId, {
      nodes: data.nodes,
      connections: data.connections,
    });
  }

  @MessagePattern('workflow.version.findByWorkflowId')
  async getWorkflowVersions(@Payload() data: { workflowId: string }): Promise<Version[]> {
    return this.workflowService.getWorkflowVersions(data.workflowId);
  }

  @MessagePattern('workflow.version.findById')
  async getVersionById(@Payload() data: { id: string }): Promise<Version> {
    return this.workflowService.getVersionById(data.id);
  }
}
