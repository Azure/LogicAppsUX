import type { IntlShape } from 'react-intl';
import type { WorkflowEdge, WorkflowNode } from '../parsers/models/workflowNode';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdgeType, WorkflowNodeType } from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';
export declare const isRootNode: (nodeId: string, nodesMetadata: NodesMetadata) => boolean;
export declare const isTriggerNode: (nodeId: string, nodesMetadata: NodesMetadata) => boolean;
export declare const getTriggerNode: (state: WorkflowState) => WorkflowNode;
export declare const getTriggerNodeId: (state: WorkflowState) => string;
export declare const isLeafNodeFromEdges: (edges: WorkflowEdge[]) => boolean;
export declare const DEFAULT_NODE_SIZE: {
    width: number;
    height: number;
};
export declare const DEFAULT_NOTE_SIZE: {
    width: number;
    height: number;
};
export declare const createWorkflowNode: (id: string, type?: WorkflowNodeType) => WorkflowNode;
export declare const createElkNode: (id: string, type?: WorkflowNodeType) => ElkNode;
export declare const createWorkflowEdge: (source: string, target: string, type?: WorkflowEdgeType) => WorkflowEdge;
export declare const createElkEdge: (source: string, target: string, type?: WorkflowEdgeType) => ElkExtendedEdge;
export declare const getUpstreamNodeIds: (nodeId: string, rootGraph: WorkflowNode, nodesMetadata: NodesMetadata, operationMap: Record<string, string>) => string[];
export declare const getNode: (nodeId: string, currentNode: WorkflowNode) => WorkflowNode | undefined;
export declare const getGraphNode: (nodeId: string, node: WorkflowNode, nodesMetadata: NodesMetadata) => WorkflowNode | undefined;
export declare const getImmediateSourceNodeIds: (graph: WorkflowNode, nodeId: string) => string[];
export declare const getNewNodeId: (state: WorkflowState, nodeId: string) => string;
export declare const getAllParentsForNode: (nodeId: string, nodesMetadata: NodesMetadata, useGraphParents?: boolean) => string[];
export declare const getAllNodesInsideNode: (nodeId: string, graph: WorkflowNode, operationMap: Record<string, string>) => string[];
export declare const getFirstParentOfType: (nodeId: string, type: string, nodesMetadata: NodesMetadata, operations: Operations) => string | undefined;
export declare const isOperationNameValid: (nodeId: string, newName: string, isTrigger: boolean, nodesMetadata: NodesMetadata, idReplacements: Record<string, string>, intl: IntlShape) => {
    isValid: boolean;
    message: string;
};
export declare const transformOperationTitle: (title: string) => string;
