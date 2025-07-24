export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  inputData: any;
  executionMode: 'sync' | 'async';
  startedAt: Date;
  variables: Map<string, any>;
  nodeResults: Map<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  outputData?: any;
  error?: string;
  duration?: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  configuration: any;
  position: { x: number; y: number };
  connections: {
    incoming: Array<{
      sourceNodeId: string;
      sourceOutput: string;
      targetInput: string;
    }>;
    outgoing: Array<{
      targetNodeId: string;
      sourceOutput: string;
      targetInput: string;
    }>;
  };
}

export interface ExecutionPlan {
  graph: Map<string, WorkflowNode>;
  executionOrder: WorkflowNode[];
  parallelGroups: WorkflowNode[][];
  estimatedDuration: number;
  resourceRequirements: any;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  duration: number;
  nodeResults: Record<string, NodeExecutionResult>;
  metrics?: any;
  error?: string;
}

export interface ExecuteWorkflowParams {
  workflowId: string;
  userId: string;
  inputData?: any;
  executionMode?: 'sync' | 'async';
}

// Legacy interfaces for backward compatibility
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  nodes: NodeExecution[];
  connections: NodeConnection[];
  context: any;
  metrics: PerformanceMetrics;
}

export interface NodeExecution {
  id: string;
  type: string;
  status: 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  data: any;
  position: any;
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort?: string;
  targetPort?: string;
}

export interface TaskExecution {
  id: string;
  executionId: string;
  nodeId: string;
  type: string;
  data: any;
  context: any;
  startedAt: Date;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  executedNodes: number;
  totalNodes: number;
  errors: Array<{
    nodeId: string;
    error: string;
    timestamp: Date;
  }>;
}
