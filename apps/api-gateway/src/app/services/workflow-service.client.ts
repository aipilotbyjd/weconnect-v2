import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

@Injectable()
export class WorkflowServiceClient implements OnModuleInit {
  private client: ClientProxy;

  onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    });
  }

  async createWorkflow(createWorkflowDto: CreateWorkflowDto, userId: string) {
    return this.client.send('workflow.create', { ...createWorkflowDto, userId }).toPromise();
  }

  async getWorkflowById(id: string) {
    return this.client.send('workflow.findById', { id }).toPromise();
  }

  async getUserWorkflows(userId: string) {
    return this.client.send('workflow.findByUserId', { userId }).toPromise();
  }

  async updateWorkflow(id: string, updates: UpdateWorkflowDto) {
    return this.client.send('workflow.update', { id, updates }).toPromise();
  }

  async deleteWorkflow(id: string) {
    return this.client.send('workflow.delete', { id }).toPromise();
  }

  async activateWorkflow(id: string) {
    return this.client.send('workflow.activate', { id }).toPromise();
  }

  async deactivateWorkflow(id: string) {
    return this.client.send('workflow.deactivate', { id }).toPromise();
  }

  async createVersion(workflowId: string, createVersionDto: CreateVersionDto) {
    return this.client.send('workflow.version.create', {
      workflowId,
      nodes: createVersionDto.nodes,
      connections: createVersionDto.connections,
    }).toPromise();
  }

  async getWorkflowVersions(workflowId: string) {
    return this.client.send('workflow.version.findByWorkflowId', { workflowId }).toPromise();
  }

  async getVersionById(id: string) {
    return this.client.send('workflow.version.findById', { id }).toPromise();
  }
}
