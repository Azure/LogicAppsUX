import type { ConsumptionWorkflowMetadata } from '@microsoft/logic-apps-shared';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { type NodeMetadata, type WorkflowState } from './workflowInterfaces';
/**
 * Collapses the flow tree based on the given collapsedIds.
 * Nodes that are marked for collapsing will have their downstream nodes removed
 * and their type updated to "COLLAPSED_NODE".
 *
 * Additionally, this function builds a mapping (collapsedMapping) where for each key
 * (a collapsed node id) we have the array of node ids that were removed as part of its nodestream.
 *
 * @param {WorkflowNode} tree - The full tree structure.
 * @param {Record<string, any>} collapsedIds - An object whose keys are node ids to collapse.
 * @returns {{ prunedTree: WorkflowNode, collapsedMapping: Record<string, string[]> }}
 *          An object containing the pruned tree and the collapsedMapping.
 */
export declare const collapseFlowTree: (tree: WorkflowNode, collapsedIds: Record<string, any>) => {
    graph: WorkflowNode;
    collapsedMapping: Record<string, string[]>;
};
export declare const isManagedMcpOperation: (operation: {
    type?: string;
    kind?: string;
}) => boolean;
export declare const isA2AWorkflow: (state: WorkflowState) => boolean;
export declare const isA2AKind: (kind?: string, metadata?: ConsumptionWorkflowMetadata) => boolean;
export declare const isAgentWorkflow: (kind: string) => boolean;
export declare const shouldClearNodeRunData: (node: NodeMetadata) => boolean | undefined;
