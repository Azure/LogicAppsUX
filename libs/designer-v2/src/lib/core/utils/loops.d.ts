import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { NodeInputs, NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodesMetadata, Operations } from '../state/workflow/workflowInterfaces';
import type { RootState } from '../store';
import type { RepetitionContext } from './parameters/helper';
import type { OutputToken } from '@microsoft/designer-ui';
interface ImplicitForeachArrayDetails {
    parentArrayKey: string;
    parentArrayValue: string;
}
interface ImplicitForeachDetails {
    shouldAdd: boolean;
    arrayDetails?: ImplicitForeachArrayDetails[];
    repetitionContext?: RepetitionContext;
}
export declare const shouldAddForeach: (nodeId: string, parameterId: string, token: OutputToken, state: RootState) => Promise<ImplicitForeachDetails>;
export declare const addForeachToNode: import("@reduxjs/toolkit").AsyncThunk<{
    dev?: import("../state/dev/devInterfaces").DevState;
    workflow: import("../state/workflow/workflowInterfaces").WorkflowState;
    operations: import("../state/operation/operationMetadataSlice").OperationMetadataState;
    panel: import("../state/panel/panelTypes").PanelState;
    connections: import("../state/connection/connectionSlice").ConnectionsStoreState;
    settings: import("../state/setting/settingInterface").SettingsState;
    designerOptions: import("../state/designerOptions/designerOptionsInterfaces").DesignerOptionsState;
    designerView: import("../state/designerView/designerViewInterfaces").DesignerViewState;
    tokens: import("../state/tokens/tokensSlice").TokensState;
    workflowParameters: import("../state/workflowparameters/workflowparametersSlice").WorkflowParametersState;
    staticResults: import("../state/staticresultschema/staticresultsSlice").StaticResultsState;
    unitTest: import("../state/unitTest/unitTestInterfaces").UnitTestState;
    customCode: import("../state/customcode/customcodeInterfaces").CustomCodeState;
    undoRedo: import("../state/undoRedo/undoRedoTypes").StateHistory;
    modal: import("..").ModalState;
    notes: import("../state/notes/notesSlice").NotesState;
}, {
    nodeId: string;
    arrayDetails: ImplicitForeachArrayDetails[] | undefined;
    token: OutputToken;
}, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
interface GetRepetitionNodeIdsOptions {
    includeSelf?: boolean;
    ignoreUntil?: boolean;
}
export declare const getRepetitionNodeIds: (nodeId: string, nodesMetadata: NodesMetadata, operationInfos: Record<string, NodeOperation>, { includeSelf, ignoreUntil }?: GetRepetitionNodeIdsOptions) => string[];
export declare const getRepetitionContext: (nodeId: string, operationInfos: Record<string, NodeOperation>, allInputs: Record<string, NodeInputs>, nodesMetadata: NodesMetadata, includeSelf: boolean, splitOn: string | undefined, idReplacements?: Record<string, string>) => Promise<RepetitionContext>;
export declare const isLoopingNode: (nodeId: string, operationInfos: Record<string, NodeOperation>, ignoreUntil: boolean) => boolean;
export declare const getForeachActionName: (context: RepetitionContext, foreachExpressionPath: string, repetitionStep: string | undefined) => string | undefined;
export declare const isForeachActionNameForLoopsource: (nodeId: string, expression: string, nodes: Record<string, Partial<NodeDataWithOperationMetadata>>, operations: Operations, nodesMetadata: NodesMetadata) => boolean;
interface Foreach {
    step?: string;
    path?: string;
    fullPath?: string;
}
export declare const parseForeach: (repetitionValue: string, repetitionContext: RepetitionContext) => Foreach;
export declare const getTokenExpressionValueForManifestBasedOperation: (key: string, isInsideArray: boolean, loopSource: string | undefined, actionName: string | undefined, required: boolean) => string;
export declare const getParentArrayKey: (key: string) => string | undefined;
export {};
