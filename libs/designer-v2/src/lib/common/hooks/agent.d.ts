import type { NodesMetadata } from '../../core/state/workflow/workflowInterfaces';
export declare function useIsAgentSubGraph(nodeId?: string): boolean | null;
export declare function isAgentSubgraphFromMetadata(nodeId?: string, nodesMetadata?: NodesMetadata): boolean;
