export class Version {
  id: string;
  workflowId: string;
  version: number;
  data: any; // Complete workflow snapshot
  message: string | null;
  createdAt: Date;

  constructor(partial: Partial<Version>) {
    Object.assign(this, partial);
  }
}
