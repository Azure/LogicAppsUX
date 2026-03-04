import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import type { DeleteNodePayload } from '../../parsers/deleteNodeFromWorkflow';
import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import type { PasteScopeNodePayload } from '../../parsers/pasteScopeInWorkflow';
import type { NodeOperation } from '../operation/operationMetadataSlice';
import type { RelationshipIds } from '../panel/panelTypes';
import type { ErrorMessage, SpecTypes, WorkflowState, WorkflowKind } from './workflowInterfaces';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import type { MessageLevel } from '@microsoft/designer-ui';
import type * as LogicAppsV2 from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange } from '@xyflow/system';
import { type UpdateAgenticGraphPayload } from '../../parsers/updateAgenticGraph';
export interface AddImplicitForeachPayload {
    nodeId: string;
    foreachNodeId: string;
    operation: any;
}
export declare const initialWorkflowState: WorkflowState;
export declare const workflowSlice: import("@reduxjs/toolkit").Slice<WorkflowState, {
    initWorkflowSpec: (state: WorkflowState, action: PayloadAction<SpecTypes>) => void;
    setWorkflowKind: (state: WorkflowState, action: PayloadAction<WorkflowKind>) => void;
    setRunInstance: (state: WorkflowState, action: PayloadAction<LogicAppsV2.RunInstanceDefinition | null>) => void;
    setNodeDescription: (state: WorkflowState, action: PayloadAction<{
        nodeId: string;
        description?: string;
    }>) => void;
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => void;
    addImplicitForeachNode: (state: WorkflowState, action: PayloadAction<AddImplicitForeachPayload>) => void;
    pasteNode: (state: WorkflowState, action: PayloadAction<{
        nodeId: string;
        relationshipIds: RelationshipIds;
        operation: NodeOperation;
        isParallelBranch?: boolean;
    }>) => void;
    pasteScopeNode: (state: WorkflowState, action: PayloadAction<PasteScopeNodePayload>) => void;
    moveNode: (state: WorkflowState, action: PayloadAction<MoveNodePayload>) => void;
    deleteNode: (state: WorkflowState, action: PayloadAction<DeleteNodePayload>) => void;
    updateAgenticGraph: (state: WorkflowState, action: PayloadAction<UpdateAgenticGraphPayload>) => void;
    updateAgenticMetadata: (state: WorkflowState, action: PayloadAction<UpdateAgenticGraphPayload>) => void;
    deleteSwitchCase: (state: WorkflowState, action: PayloadAction<{
        caseId: string;
        nodeId: string;
    }>) => void;
    deleteAgentTool: (state: WorkflowState, action: PayloadAction<{
        toolId: string;
        agentId: string;
    }>) => void;
    deleteMcpServer: (state: WorkflowState, action: PayloadAction<{
        toolId: string;
        agentId: string;
    }>) => void;
    setFocusNode: (state: WorkflowState, action: PayloadAction<string>) => void;
    clearFocusNode: (state: WorkflowState) => void;
    setFocusElement: (state: WorkflowState, action: PayloadAction<string>) => void;
    clearFocusElement: (state: WorkflowState) => void;
    clearFocusCollapsedNode: (state: WorkflowState) => void;
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<NodeChange[]>) => void;
    setCollapsedGraphIds: (state: WorkflowState, action: PayloadAction<string[]>) => void;
    collapseGraphsToShowNode: (state: WorkflowState, action: PayloadAction<string>) => void;
    toggleCollapsedGraphId: (state: WorkflowState, action: PayloadAction<{
        id: string;
        includeNested?: boolean;
    }>) => void;
    toggleCollapsedActionId: (state: WorkflowState, action: PayloadAction<string>) => void;
    setRunIndex: (state: WorkflowState, action: PayloadAction<{
        page: number;
        nodeId: string;
    }>) => void;
    setToolRunIndex: (state: WorkflowState, action: PayloadAction<{
        page: number;
        nodeId: string;
    }>) => void;
    setRepetitionRunData: (state: WorkflowState, action: PayloadAction<{
        nodeId: string;
        runData: LogicAppsV2.WorkflowRunAction;
    }>) => void;
    clearAllRepetitionRunData: (state: WorkflowState) => void;
    setSubgraphRunData: (state: WorkflowState, action: PayloadAction<{
        nodeId: string;
        runData: LogicAppsV2.RunRepetition[];
    }>) => void;
    setRunDataInputOutputs: (state: WorkflowState, action: PayloadAction<{
        nodeId: string;
        inputs: BoundParameters;
        outputs: BoundParameters;
    }>) => void;
    setTimelineRepetitionIndex: (state: WorkflowState, action: PayloadAction<number>) => void;
    setTimelineRepetitionArray: (state: WorkflowState, action: PayloadAction<string[][]>) => void;
    addSwitchCase: (state: WorkflowState, action: PayloadAction<{
        caseId: string;
        graphId: string;
    }>) => void;
    addAgentTool: (state: WorkflowState, action: PayloadAction<{
        toolId: string;
        graphId: string;
    }>) => void;
    addMcpServer: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => void;
    discardAllChanges: (_state: WorkflowState) => void;
    removeRunAfter: (state: WorkflowState, action: PayloadAction<{
        childOperationId: string;
        parentOperationId: string;
    }>) => void;
    addRunAfter: (state: WorkflowState, action: PayloadAction<{
        childOperationId: string;
        parentOperationId: string;
    }>) => void;
    updateRunAfter: (state: WorkflowState, action: PayloadAction<{
        childOperation: string;
        parentOperation: string;
        statuses: string[];
    }>) => void;
    addHandoffMetadata: (state: WorkflowState, action: PayloadAction<{
        sourceId: string;
        toolId: string;
        targetId: string;
    }>) => void;
    removeHandoffMetadata: (state: WorkflowState, action: PayloadAction<{
        sourceId: string;
        toolId?: string;
        targetId?: string;
    }>) => void;
    replaceId: (state: WorkflowState, action: PayloadAction<{
        originalId: string;
        newId: string;
    }>) => void;
    setIsWorkflowDirty: (state: WorkflowState, action: PayloadAction<boolean>) => void;
    setHostErrorMessages: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<{
        level: MessageLevel;
        errorMessages: ErrorMessage[] | undefined;
    }>) => void;
    setFlowErrors: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<{
        flowErrors: Record<string, string[]>;
    }>) => void;
}, "workflow">;
export declare const initWorkflowSpec: import("@reduxjs/toolkit").ActionCreatorWithPayload<SpecTypes, "workflow/initWorkflowSpec">, setWorkflowKind: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<WorkflowKind, "workflow/setWorkflowKind">, setRunInstance: import("@reduxjs/toolkit").ActionCreatorWithPayload<LogicAppsV2.RunInstanceDefinition | null, "workflow/setRunInstance">, addNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddNodePayload, "workflow/addNode">, addImplicitForeachNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddImplicitForeachPayload, "workflow/addImplicitForeachNode">, pasteNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    relationshipIds: RelationshipIds;
    operation: NodeOperation;
    isParallelBranch?: boolean | undefined;
}, "workflow/pasteNode">, pasteScopeNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<PasteScopeNodePayload, "workflow/pasteScopeNode">, moveNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<MoveNodePayload, "workflow/moveNode">, deleteNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<DeleteNodePayload, "workflow/deleteNode">, deleteSwitchCase: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    caseId: string;
    nodeId: string;
}, "workflow/deleteSwitchCase">, deleteAgentTool: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    toolId: string;
    agentId: string;
}, "workflow/deleteAgentTool">, deleteMcpServer: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    toolId: string;
    agentId: string;
}, "workflow/deleteMcpServer">, updateNodeSizes: import("@reduxjs/toolkit").ActionCreatorWithPayload<NodeChange<import("@xyflow/system").NodeBase<Record<string, unknown>, string>>[], "workflow/updateNodeSizes">, setNodeDescription: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    description?: string | undefined;
}, "workflow/setNodeDescription">, toggleCollapsedGraphId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    includeNested?: boolean | undefined;
}, "workflow/toggleCollapsedGraphId">, addSwitchCase: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    caseId: string;
    graphId: string;
}, "workflow/addSwitchCase">, addAgentTool: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    toolId: string;
    graphId: string;
}, "workflow/addAgentTool">, addMcpServer: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddNodePayload, "workflow/addMcpServer">, discardAllChanges: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflow/discardAllChanges">, updateRunAfter: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    childOperation: string;
    parentOperation: string;
    statuses: string[];
}, "workflow/updateRunAfter">, addRunAfter: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    childOperationId: string;
    parentOperationId: string;
}, "workflow/addRunAfter">, removeRunAfter: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    childOperationId: string;
    parentOperationId: string;
}, "workflow/removeRunAfter">, addHandoffMetadata: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    sourceId: string;
    toolId: string;
    targetId: string;
}, "workflow/addHandoffMetadata">, removeHandoffMetadata: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    sourceId: string;
    toolId?: string | undefined;
    targetId?: string | undefined;
}, "workflow/removeHandoffMetadata">, setTimelineRepetitionIndex: import("@reduxjs/toolkit").ActionCreatorWithPayload<number, "workflow/setTimelineRepetitionIndex">, setTimelineRepetitionArray: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[][], "workflow/setTimelineRepetitionArray">, clearFocusNode: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflow/clearFocusNode">, setFocusNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/setFocusNode">, setCollapsedGraphIds: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "workflow/setCollapsedGraphIds">, collapseGraphsToShowNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/collapseGraphsToShowNode">, replaceId: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    originalId: string;
    newId: string;
}, "workflow/replaceId">, setRunIndex: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    page: number;
    nodeId: string;
}, "workflow/setRunIndex">, setToolRunIndex: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    page: number;
    nodeId: string;
}, "workflow/setToolRunIndex">, setRepetitionRunData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    runData: LogicAppsV2.WorkflowRunAction;
}, "workflow/setRepetitionRunData">, clearAllRepetitionRunData: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflow/clearAllRepetitionRunData">, setSubgraphRunData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    runData: LogicAppsV2.RunRepetition[];
}, "workflow/setSubgraphRunData">, setIsWorkflowDirty: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "workflow/setIsWorkflowDirty">, setHostErrorMessages: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    level: MessageLevel;
    errorMessages: ErrorMessage[] | undefined;
}, "workflow/setHostErrorMessages">, setFlowErrors: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    flowErrors: Record<string, string[]>;
}, "workflow/setFlowErrors">, setRunDataInputOutputs: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    inputs: BoundParameters;
    outputs: BoundParameters;
}, "workflow/setRunDataInputOutputs">, toggleCollapsedActionId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/toggleCollapsedActionId">, clearFocusCollapsedNode: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflow/clearFocusCollapsedNode">, updateAgenticGraph: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateAgenticGraphPayload, "workflow/updateAgenticGraph">, updateAgenticMetadata: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateAgenticGraphPayload, "workflow/updateAgenticMetadata">, setFocusElement: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/setFocusElement">, clearFocusElement: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflow/clearFocusElement">;
declare const _default: import("@reduxjs/toolkit").Reducer<WorkflowState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
