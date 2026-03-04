import type { NodeDataWithOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { Settings } from '../actions/bjsworkflow/settings';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { NodeOperation, OutputInfo, NodeInputs } from '../state/operation/operationMetadataSlice';
import type { TokensState } from '../state/tokens/tokensSlice';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowParametersState } from '../state/workflowparameters/workflowparametersSlice';
import type { AppDispatch, RootState } from '../store';
import type { OutputToken, ValueSegment } from '@microsoft/designer-ui';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
export interface TokenGroup {
    id: string;
    label: string;
    tokens: OutputToken[];
    hasAdvanced?: boolean;
    showAdvanced?: boolean;
}
export declare const getTokenNodeIds: (nodeId: string, graph: WorkflowNode, nodesMetadata: NodesMetadata, nodesManifest: Record<string, NodeDataWithOperationMetadata>, operationInfos: Record<string, NodeOperation>, operationMap: Record<string, string>) => string[];
export declare const getBuiltInTokens: (manifest?: OperationManifest) => OutputToken[];
export declare const filterTokensForAgentPerInput: (inputs: NodeInputs, outputs: Record<string, OutputInfo>) => Record<string, OutputInfo>;
export declare const convertOutputsToTokens: (nodeId: string | undefined, nodeType: string, outputs: Record<string, OutputInfo>, operationMetadata: {
    iconUri: string;
    brandColor: string;
}, settings?: Settings, inputs?: NodeInputs) => OutputToken[];
export declare const getExpressionTokenSections: () => TokenGroup[];
export declare const getOutputTokenSections: (nodeId: string, nodeType: string, tokenState: TokensState, workflowParametersState: WorkflowParametersState, workflowState: WorkflowState, replacementIds: Record<string, string>, includeCurrentNodeTokens?: boolean) => TokenGroup[];
export declare const createValueSegmentFromToken: (nodeId: string, parameterId: string, token: OutputToken, addImplicitForeachIfNeeded: boolean, addLatestActionName: boolean, rootState: RootState, dispatch: AppDispatch) => Promise<ValueSegment>;
export declare const getTokenTitle: (output: OutputInfo) => string;
export declare const convertWorkflowParameterTypeToSwaggerType: (type: string | undefined) => string;
export declare const normalizeKey: (key: string) => string;
export declare const getTokenValue: (token: OutputToken, nodeType: string, replacementIds: Record<string, string>) => string;
