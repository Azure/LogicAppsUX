import { WorkflowNode } from './models/workflowNode';

export abstract class BaseParser {
  abstract deserialize(workflow: unknown): { nodes: WorkflowNode[]; graphs: Record<string, unknown> };
  abstract serialize(graphData: { nodes: WorkflowNode[]; graphs: Record<string, unknown> }): any;
}
