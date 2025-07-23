import { Workflow } from '../entities/workflow.entity';

export interface IWorkflowRepository {
  create(workflow: Partial<Workflow>): Promise<Workflow>;
  findById(id: string): Promise<Workflow | null>;
  findByUserId(userId: string): Promise<Workflow[]>;
  update(id: string, updates: Partial<Workflow>): Promise<Workflow>;
  delete(id: string): Promise<void>;
  activate(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
}
