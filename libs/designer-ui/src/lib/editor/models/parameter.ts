import { Exception } from "@microsoft-logic-apps/utils";

export interface ParameterInfo {
    dynamicData?: {
        error?: Exception;
        status: DynamicCallStatus;
    };
    editor?: string;
    editorOptions?: Record<string, any>;
    editorViewModel?: any;
    info: ParameterDetails;
    hideInUI?: boolean;
    id: string;
    label: string;
    parameterKey: string;
    parameterName: string;
    placeholder?: string;
    preservedValue?: any;
    required: boolean;
    schema?: any;
    showErrors?: boolean;
    showFullScreen?: boolean;
    showTokens?: boolean;
    suppressCasting?: boolean;
    type: string;
    validationErrors?: string[];
    value: any;
    viewModel?: any;
    visibility?: string;
}

export interface ParameterDetails {
    alias?: string;
    arrayItemInputParameterKey?: string; // NOTE(johnwa): the associated array item's input parameter key, which could be used as key in reference dynamic parameter
    encode?: string;
    format?: string;
    in?: string;
    isDynamic?: boolean;
    isEditorManagedItem?: boolean; // NOTE(johnwa): Flag to indicate whether this parameter is managed by a specific editor
    isUnknown?: boolean; // Whether the parameter is an unknown parameter (inferred to be 'any' type) sourced from the workflow definition
    parentProperty?: any;
}

export enum DynamicCallStatus {
    STARTED,
    SUCCEEDED,
    FAILED,
}