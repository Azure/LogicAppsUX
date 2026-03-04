import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
export declare const addNewEdge: (state: WorkflowState, source: string, target: string, graph: WorkflowNode, addRunAfter?: boolean) => void;
export declare const removeEdge: (state: WorkflowState, sourceId: string, targetId: string, graph: WorkflowNode) => void;
export declare const reassignEdgeSources: (state: WorkflowState, oldSourceId: string, newSourceId: string, graph: WorkflowNode, shouldHaveRunAfters?: boolean) => void;
export declare const reassignEdgeTargets: (state: WorkflowState, oldTargetId: string, newTargetId: string, graph: WorkflowNode) => void;
export declare const moveRunAfterTarget: (state: WorkflowState | undefined, oldTargetId: string, newTargetId: string) => void;
export declare const moveRunAfterSource: (state: WorkflowState | undefined, nodeId: string, oldSourceId: string, newSourceId: string, shouldHaveRunAfters: boolean) => void;
export declare const applyIsRootNode: (state: WorkflowState, graph: WorkflowNode, metadata: NodesMetadata) => void;
