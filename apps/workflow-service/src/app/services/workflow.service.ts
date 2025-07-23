import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { IWorkflowRepository } from '../../../../../libs/domain/src/lib/workflow/repositories/workflow.repository.interface';
import { IVersionRepository } from '../../../../../libs/domain/src/lib/workflow/repositories/version.repository.interface';
import { Workflow } from '../../../../../libs/domain/src/lib/workflow/entities/workflow.entity';
import { Version } from '../../../../../libs/domain/src/lib/workflow/entities/version.entity';
import { Node } from '../../../../../libs/domain/src/lib/workflow/entities/node.entity';
import { Connection } from '../../../../../libs/domain/src/lib/workflow/entities/connection.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowService {
  constructor(
    @Inject('IWorkflowRepository')
    private readonly workflowRepository: IWorkflowRepository,
    @Inject('IVersionRepository')
    private readonly versionRepository: IVersionRepository
  ) {}

  async createWorkflow(data: {
    name: string;
    description?: string;
    userId: string;
    nodes?: Node[];
    connections?: Connection[];
  }): Promise<Workflow> {
    const workflow = await this.workflowRepository.create({
      id: uuidv4(),
      name: data.name,
      description: data.description,
      userId: data.userId,
      isActive: true,
      version: 1,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create initial version if nodes are provided
    if (data.nodes && data.nodes.length > 0) {
      await this.createVersion(workflow.id, {
        nodes: data.nodes,
        connections: data.connections || [],
      });
    }

    return workflow;
  }

  async getWorkflowById(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  async getUserWorkflows(userId: string): Promise<Workflow[]> {
    return this.workflowRepository.findByUserId(userId);
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const existingWorkflow = await this.getWorkflowById(id);
    
    const updatedWorkflow = await this.workflowRepository.update(id, {
      ...updates,
      updatedAt: new Date(),
    });

    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.getWorkflowById(id);
    await this.workflowRepository.delete(id);
  }

  async activateWorkflow(id: string): Promise<void> {
    const workflow = await this.getWorkflowById(id);
    
    // Validate that workflow has at least one version
    const latestVersion = await this.versionRepository.findLatestByWorkflowId(id);
    if (!latestVersion || !latestVersion.data || !latestVersion.data.nodes || latestVersion.data.nodes.length === 0) {
      throw new BadRequestException('Cannot activate workflow without nodes');
    }

    await this.workflowRepository.activate(id);
  }

  async deactivateWorkflow(id: string): Promise<void> {
    const workflow = await this.getWorkflowById(id);
    await this.workflowRepository.deactivate(id);
  }

  async createVersion(workflowId: string, data: {
    nodes: Node[];
    connections: Connection[];
  }): Promise<Version> {
    const workflow = await this.getWorkflowById(workflowId);
    
    // Get the latest version number
    const latestVersion = await this.versionRepository.findLatestByWorkflowId(workflowId);
    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Validate nodes and connections
    this.validateWorkflowStructure(data.nodes, data.connections);

    const version = await this.versionRepository.create({
      id: uuidv4(),
      workflowId,
      version: newVersionNumber,
      data: {
        nodes: data.nodes,
        connections: data.connections,
      },
      createdAt: new Date(),
    });

    return version;
  }

  async getWorkflowVersions(workflowId: string): Promise<Version[]> {
    const workflow = await this.getWorkflowById(workflowId);
    return this.versionRepository.findByWorkflowId(workflowId);
  }

  async getVersionById(id: string): Promise<Version> {
    const version = await this.versionRepository.findById(id);
    if (!version) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }
    return version;
  }

  private validateWorkflowStructure(nodes: Node[], connections: Connection[]): void {
    // Validate that all connection endpoints exist in nodes
    const nodeIds = new Set(nodes.map(node => node.id));
    
    for (const connection of connections) {
      if (!nodeIds.has(connection.sourceNodeId)) {
        throw new BadRequestException(`Source node ${connection.sourceNodeId} not found in workflow`);
      }
      if (!nodeIds.has(connection.targetNodeId)) {
        throw new BadRequestException(`Target node ${connection.targetNodeId} not found in workflow`);
      }
    }

    // Additional validation can be added here:
    // - Check for circular dependencies
    // - Validate node types and parameters
    // - Check connection compatibility
  }
}
