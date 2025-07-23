export interface Workflow {
  id: string;
  name: string;
  description?: string;
  userId: string;
  organizationId?: string;
  isActive: boolean;
  version: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: WorkflowSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: NodePosition;
  data: NodeData;
  config: NodeConfig;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  [key: string]: any;
}

export interface NodeConfig {
  connectorType?: string;
  operation?: string;
  credentials?: string;
  parameters?: Record<string, any>;
  settings?: NodeSettings;
}

export interface NodeSettings {
  timeout?: number;
  retries?: number;
  continueOnError?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface WorkflowSettings {
  timezone?: string;
  errorHandling?: 'stop' | 'continue';
  executionTimeout?: number;
  maxRetries?: number;
  notifyOnSuccess?: boolean;
  notifyOnError?: boolean;
}

export enum NodeType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  LOOP = 'loop',
  MERGE = 'merge',
  SPLIT = 'split'
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: Partial<WorkflowSettings>;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: Partial<WorkflowSettings>;
  isActive?: boolean;
}
