import type { ParameterInfo } from '@microsoft/logic-apps-shared';
export type McpParameterInputType = 'model' | 'user';
interface ParameterFieldProps {
    operationId: string;
    groupId: string;
    parameter: ParameterInfo;
    parameterInputType: McpParameterInputType;
    parameterError: string | undefined;
    disableInputTypeChange?: boolean;
    isConditional?: boolean;
    onParameterVisibilityUpdate: () => void;
    onParameterInputTypeChange: (parameterId: string, newType: McpParameterInputType) => void;
    handleRemoveConditionalParameter: (parameterId: string) => void;
    removeParameterError: (parameterId: string) => void;
}
export declare const ParameterField: ({ operationId, groupId, parameter, isConditional, disableInputTypeChange, onParameterVisibilityUpdate, parameterInputType, onParameterInputTypeChange, handleRemoveConditionalParameter, parameterError, removeParameterError, }: ParameterFieldProps) => import("react/jsx-runtime").JSX.Element;
export {};
