import type { IConnectionService, ILoggerService, IOperationManifestService, ITemplateResourceService, IResourceService, Template, IWorkflowService } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../state/templates/store';
import type { WorkflowTemplateData } from './templates';
import { type NodeDependencies, type NodeInputs } from '../../state/operation/operationMetadataSlice';
import { type WorkflowState } from '../../state/templates/workflowSlice';
import { type TemplateValidationError } from '../../configuretemplate/utils/errors';
export interface ConfigureTemplateServiceOptions {
    connectionService: IConnectionService;
    operationManifestService: IOperationManifestService;
    loggerService?: ILoggerService;
    resourceService: IResourceService;
    templateResourceService: ITemplateResourceService;
    workflowService: IWorkflowService;
}
export declare const initializeConfigureTemplateServices: import("@reduxjs/toolkit").AsyncThunk<boolean, ConfigureTemplateServiceOptions, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const loadCustomTemplate: import("@reduxjs/toolkit").AsyncThunk<{
    status: string;
    enableWizard: boolean;
}, {
    templateId: string;
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
export declare const loadResourceDetailsFromWorkflowSource: import("@reduxjs/toolkit").AsyncThunk<void, {
    workflowSourceId: string;
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
export declare const updateWorkflowParameter: import("@reduxjs/toolkit").AsyncThunk<void, {
    parameterId: string;
    definition: Template.ParameterDefinition;
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
export declare const addWorkflowsData: import("@reduxjs/toolkit").AsyncThunk<void, {
    workflows: Record<string, Partial<WorkflowTemplateData>>;
    onSaveCompleted?: (() => void) | undefined;
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
export declare const saveWorkflowsData: import("@reduxjs/toolkit").AsyncThunk<void, {
    workflows: Record<string, Partial<WorkflowTemplateData>>;
    onSaveCompleted?: (() => void) | undefined;
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
export declare const saveTemplateData: import("@reduxjs/toolkit").AsyncThunk<void, {
    templateManifest: Template.TemplateManifest;
    workflows: Record<string, Partial<WorkflowTemplateData>>;
    newState?: Template.TemplateEnvironment | undefined;
    oldState: Template.TemplateEnvironment;
    onSaveCompleted: () => void;
    location: string;
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
export declare const getTemplateValidationError: import("@reduxjs/toolkit").AsyncThunk<void, {
    errorResponse: {
        error: TemplateValidationError;
    };
    source: string;
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
export declare const deleteWorkflowData: import("@reduxjs/toolkit").AsyncThunk<{
    ids: string[];
    manifest: Template.TemplateManifest;
    connections: Record<string, Template.Connection>;
    parameters: Record<string, Template.ParameterDefinition>;
    disableWizard: boolean;
}, {
    ids: string[];
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
export declare const getTemplateConnections: (state: RootState, workflows: Record<string, Partial<WorkflowTemplateData>>) => Promise<{
    connections: Record<string, Template.Connection>;
    mapping: Record<string, string>;
    workflowsWithDefinitions: {
        [x: string]: {
            workflowDefinition: any;
            triggerType: string;
            connectionKeys: string[];
            id?: string | undefined;
            manifest?: Template.WorkflowManifest | undefined;
            workflowName?: string | undefined;
            kind?: string | undefined;
            images?: {
                light?: string | undefined;
                dark?: string | undefined;
            } | undefined;
            isManageWorkflow?: boolean | undefined;
            errors?: import("./templates").WorkflowErrors | undefined;
        };
    };
} | {
    connections: Record<string, Template.Connection>;
    mapping: Record<string, string>;
    workflowsWithDefinitions: Record<string, Partial<WorkflowTemplateData>>;
}>;
export declare const getTemplateParameters: (state: RootState, inputParameters: Record<string, NodeInputs>, dependencies: Record<string, NodeDependencies>, mapping: Record<string, string>) => Promise<Record<string, Partial<Template.ParameterDefinition>>>;
export declare const getWorkflowsWithDefinitions: ({ subscriptionId, resourceGroup, isConsumption, logicAppName }: WorkflowState, workflows: Record<string, Partial<WorkflowTemplateData>>) => Promise<Record<string, Partial<WorkflowTemplateData>> | {
    [x: string]: {
        id: string | undefined;
        workflowDefinition: any;
        triggerType: string;
        manifest?: Template.WorkflowManifest | undefined;
        workflowName?: string | undefined;
        kind?: string | undefined;
        images?: {
            light?: string | undefined;
            dark?: string | undefined;
        } | undefined;
        isManageWorkflow?: boolean | undefined;
        connectionKeys?: string[] | undefined;
        errors?: import("./templates").WorkflowErrors | undefined;
    };
}>;
