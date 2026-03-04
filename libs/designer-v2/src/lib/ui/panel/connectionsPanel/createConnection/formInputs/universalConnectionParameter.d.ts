import type { ConnectionParameter, ConnectionParameterSet, ManagedIdentity } from '@microsoft/logic-apps-shared';
export interface ConnectionParameterProps {
    parameterKey: string;
    parameter: ConnectionParameter;
    value: any;
    setValue: (value: any) => void;
    isLoading?: boolean;
    isSubscriptionDropdownDisabled?: boolean;
    selectedSubscriptionId?: string;
    selectSubscriptionCallback?: (subscriptionId: string) => void;
    availableGateways?: any[];
    availableSubscriptions?: any[];
    identity?: ManagedIdentity;
    setKeyValue?: (key: string, value: any) => void;
    parameterSet?: ConnectionParameterSet;
    operationParameterValues?: Record<string, any>;
    parameterValues?: Record<string, any>;
}
export declare const UniversalConnectionParameter: (props: ConnectionParameterProps) => import("react/jsx-runtime").JSX.Element;
