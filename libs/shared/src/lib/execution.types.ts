export interface Execution {
  id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  steps: ExecutionStep[];
  input?: any;
  output?: any;
  error?: ExecutionError;
  metadata: ExecutionMetadata;
}

export interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: ExecutionError;
  retryCount: number;
}

export interface ExecutionError {
  message: string;
  code?: string;
  stack?: string;
  details?: any;
}

export interface ExecutionMetadata {
  trigger?: string;
  source?: 'manual' | 'webhook' | 'schedule' | 'api';
  retryCount: number;
  parentExecutionId?: string;
  tags?: string[];
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface StartExecutionDto {
  workflowId: string;
  input?: any;
  metadata?: Partial<ExecutionMetadata>;
}
