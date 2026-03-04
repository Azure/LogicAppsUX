import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../../../../core/state/tokens/tokensSlice';
import type { TokenGroup } from '../../../../../core/utils/tokens';
import { type ParameterInfo, type PanelTabFn, type PanelTabProps, type NewResourceProps } from '@microsoft/designer-ui';
import type { Connector, OperationInfo } from '@microsoft/logic-apps-shared';
import type React from 'react';
import type { AnyAction } from '@reduxjs/toolkit';
export interface ParametersTabProps extends PanelTabProps {
    isTabReadOnly?: boolean;
}
export declare const ParametersTab: React.FC<ParametersTabProps>;
export declare const dynamicallyLoadAgentConnection: import("@reduxjs/toolkit").AsyncThunk<void, {
    nodeId: string;
    connector: Connector;
    modelType: string;
}, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const ParameterSection: ({ nodeId, group, readOnly, tokenGroup, expressionGroup, }: {
    nodeId: string;
    group: ParameterGroup;
    readOnly: boolean | undefined;
    tokenGroup: TokenGroup[];
    expressionGroup: TokenGroup[];
}) => import("react/jsx-runtime").JSX.Element;
export declare const getCustomEditorForNewResource: (operationInfo: OperationInfo, parameter: ParameterInfo, cognitiveServiceAccountId: string | undefined, refetchDeploymentModels: (name?: string) => void) => NewResourceProps | undefined;
export declare const getEditorAndOptions: (operationInfo: OperationInfo, parameter: ParameterInfo, upstreamNodeIds: string[], variables: Record<string, VariableDeclaration[]>, deploymentsForCognitiveServiceAccount?: any[], isA2AWorkflow?: boolean) => {
    editor?: string | undefined;
    editorOptions?: any;
};
export declare const parametersTab: PanelTabFn;
