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
