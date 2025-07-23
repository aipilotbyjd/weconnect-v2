import { Version } from '../entities/version.entity';

export interface IVersionRepository {
  create(version: Partial<Version>): Promise<Version>;
  findByWorkflowId(workflowId: string): Promise<Version[]>;
  findLatestByWorkflowId(workflowId: string): Promise<Version | null>;
  findById(id: string): Promise<Version | null>;
}
