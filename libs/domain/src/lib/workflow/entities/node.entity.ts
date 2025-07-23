export class Node {
  id: string;
  type: string;
  parameters: any;
  position: { x: number; y: number };

  constructor(partial: Partial<Node>) {
    Object.assign(this, partial);
  }
}
