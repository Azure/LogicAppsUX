import type { GatewayServiceConfig, ConnectionParameter, ConnectionParameterSet, ConnectionParameterSetParameter, ConnectionParameterSets, Gateway, ManagedIdentity, Subscription, Connector, OperationParameterSetParameter, OperationManifest, ConsumptionWorkflowMetadata } from '@microsoft/logic-apps-shared';
import type { AzureResourcePickerProps } from '@microsoft/designer-ui';
export interface CreateButtonTexts {
    create?: string;
    creating?: string;
    signIn?: string;
    signingIn?: string;
}
export interface CreateConnectionProps {
    classes?: Record<string, string>;
    nodeIds?: string[];
    iconUri?: string;
    connector: Connector;
    connectionParameterSets?: ConnectionParameterSets;
    operationParameterSets?: Record<string, OperationParameterSetParameter>;
    description?: string;
    identity?: ManagedIdentity;
    isLoading?: boolean;
    createButtonTexts?: CreateButtonTexts;
    createConnectionCallback?: (newName?: string, selectedParameterSet?: ConnectionParameterSet, parameterValues?: Record<string, any>, isOAuthConnection?: boolean, alternativeParameterValues?: Record<string, any>, identitySelected?: string, additionalParameterValues?: Record<string, any>, operationParameterValues?: Record<string, any>, isUsingDynamicConnection?: boolean) => void;
    cancelCallback?: () => void;
    hideCancelButton?: boolean;
    showActionBar?: boolean;
    errorMessage?: string;
    clearErrorCallback?: () => void;
    selectSubscriptionCallback?: (subscriptionId: string) => void;
    selectedSubscriptionId?: string;
    availableSubscriptions?: Subscription[];
    availableGateways?: Gateway[];
    gatewayServiceConfig?: Partial<GatewayServiceConfig>;
    checkOAuthCallback: (parameters: Record<string, ConnectionParameter>) => boolean;
    resourceSelectorProps?: AzureResourcePickerProps;
    isAgentServiceConnection?: boolean;
    isAgentSubgraph?: boolean;
    operationManifest?: OperationManifest;
    workflowKind?: string;
    workflowMetadata?: ConsumptionWorkflowMetadata;
}
export declare const CreateConnection: (props: CreateConnectionProps) => import("react/jsx-runtime").JSX.Element;
export declare function parseParameterValues(parameterValues: Record<string, any>, capabilityEnabledParameters: Record<string, ConnectionParameter | ConnectionParameterSetParameter>): {
    visibleParameterValues: {
        [k: string]: any;
    };
    additionalParameterValues: {
        [k: string]: any;
    } | undefined;
};
