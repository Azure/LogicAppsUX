import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { LogicAppsV2, SubgraphType } from '@microsoft/utils-logic-apps';

export type SpecTypes = 'BJS' | 'CNCF';

export interface NodesMetadata {
  [nodeId: string]: {
    graphId: string;
    parentNodeId?: string;
    subgraphType?: SubgraphType;
    actionCount?: number;
    isRoot?: boolean;
    runData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
    actionMetadata?: Record<string, any>;
    runIndex?: number;
  };
}
export type Operations = Record<string, LogicAppsV2.OperationDefinition>;

export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph: WorkflowNode | null;
  operations: Operations;
  focusedCanvasNodeId?: string;
  nodesMetadata: NodesMetadata;
  collapsedGraphIds: Record<string, boolean>;
  edgeIdsBySource: Record<string, string[]>;
  idReplacements: Record<string, string>;
  newlyAddedOperations: Record<string, string>;
  runInstance: LogicAppsV2.RunInstanceDefinition | null;
  isDirty: boolean;
  isStateful:boolean;
  originalDefinition: LogicAppsV2.WorkflowDefinition;
}
