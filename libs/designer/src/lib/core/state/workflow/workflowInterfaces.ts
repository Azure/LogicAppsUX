import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { MessageLevel } from '@microsoft/designer-ui';
import type { LogicAppsV2, SubgraphType } from '@microsoft/logic-apps-shared';

export type SpecTypes = 'BJS' | 'CNCF';

export interface NodeMetadata {
  graphId: string;
  parentNodeId?: string;
  subgraphType?: SubgraphType;
  actionCount?: number;
  isRoot?: boolean;
  runData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  actionMetadata?: Record<string, any>;
  subgraphRunData?: Record<string, { actionResults: LogicAppsV2.WorkflowRunAction[] }>;
  runIndex?: number;
}
export interface NodesMetadata {
  [nodeId: string]: NodeMetadata;
}
export type Operations = Record<string, LogicAppsV2.OperationDefinition>;

export const WorkflowKind = {
  STATEFUL: 'stateful',
  STATELESS: 'stateless',
  AGENTIC: 'agentic',
} as const;
export type WorkflowKind = (typeof WorkflowKind)[keyof typeof WorkflowKind] | undefined;

export type ErrorMessage = {
  nodeId: string;
  level: MessageLevel;
  subtitle: string; // ex. "Settings Errors"
  content: string; // ex. "Trigger condition cannot be empty"
  onRenderDetails?: () => React.ReactNode;
};

export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph: WorkflowNode | null;
  operations: Operations;
  focusedCanvasNodeId?: string;
  focusElement?: string;
  nodesMetadata: NodesMetadata;
  collapsedGraphIds: Record<string, boolean>;
  collapsedActionIds: Record<string, boolean>;
  focusCollapsedNodeId?: string;
  edgeIdsBySource: Record<string, string[]>;
  idReplacements: Record<string, string>;
  newlyAddedOperations: Record<string, string>;
  runInstance: LogicAppsV2.RunInstanceDefinition | null;
  isDirty: boolean;
  workflowKind: WorkflowKind;
  originalDefinition: LogicAppsV2.WorkflowDefinition;
  hostData: {
    errorMessages: Partial<Record<MessageLevel, ErrorMessage[]>>;
  };
  agentsGraph: Record<string, any>;
  transitionRepetitionIndex: number;
  transitionRepetitionArray: string[];
}
