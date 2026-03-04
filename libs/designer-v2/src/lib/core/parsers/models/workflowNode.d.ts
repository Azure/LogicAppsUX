import type { WorkflowEdgeType, WorkflowNodeType } from '@microsoft/logic-apps-shared';
export interface WorkflowNode {
    id: string;
    type: WorkflowNodeType;
    subGraphLocation?: string;
    children?: WorkflowNode[];
    edges?: WorkflowEdge[];
    height?: number;
    width?: number;
}
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    type: WorkflowEdgeType;
}
export declare const isWorkflowNode: (node: WorkflowNode) => boolean;
export declare const isWorkflowGraph: (node: WorkflowNode) => boolean;
