import { Node } from './node.entity';
import { Connection } from './connection.entity';
import { Version } from './version.entity';

export class Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: Node[];
  connections: Connection[];
  versions: Version[];

  constructor(partial: Partial<Workflow>) {
    Object.assign(this, partial);
  }
}
