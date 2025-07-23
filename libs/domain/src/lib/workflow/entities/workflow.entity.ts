import { Node } from './node.entity';
import { Connection } from './connection.entity';
import { Version } from './version.entity';

export class Workflow {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  organizationId: string | null;
  isActive: boolean;
  version: number;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
  nodes?: Node[];
  connections?: Connection[];
  versions?: Version[];

  constructor(partial: Partial<Workflow>) {
    Object.assign(this, partial);
  }
}
