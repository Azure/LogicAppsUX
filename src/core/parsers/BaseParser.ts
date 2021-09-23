import { WorkflowNode } from './models/workflowNode';

export abstract class BaseParser {
  abstract deserialize(workflow: unknown): { nodes: WorkflowNode[]; graphs: Record<string, unknown> };
  abstract serializer(graphData: { nodes: WorkflowNode[]; graphs: Record<string, unknown> }): any;
}
