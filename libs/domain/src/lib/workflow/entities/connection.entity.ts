export class Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput: string;
  targetInput: string;

  constructor(partial: Partial<Connection>) {
    Object.assign(this, partial);
  }
}
