/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseParser } from '../BaseParser';
import { WorkflowNode } from '../models/workflowNode';

export class BJSWorkflowParser implements BaseParser {
  deserialize(workflow: unknown): { nodes: WorkflowNode[]; graphs: Record<string, unknown> } {
    throw new Error('Method not implemented.');
  }
  serializer(graphData: { nodes: WorkflowNode[]; graphs: Record<string, unknown> }) {
    throw new Error('Method not implemented.');
  }
}
