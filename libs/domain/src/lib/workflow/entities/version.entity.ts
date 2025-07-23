export class Version {
  id: string;
  workflowId: string;
  versionNumber: number;
  createdAt: Date;
  nodes: any[];
  connections: any[];

  constructor(partial: Partial<Version>) {
    Object.assign(this, partial);
  }
}
