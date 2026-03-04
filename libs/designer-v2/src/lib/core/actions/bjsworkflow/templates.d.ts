import { type LogicAppsV2, type Template } from '@microsoft/logic-apps-shared';
import type { TemplateServiceOptions } from '../../templates/TemplatesDesignerContext';
import type { TemplateData } from '../../state/templates/manifestSlice';
export interface WorkflowTemplateData {
    id: string;
    workflowDefinition: LogicAppsV2.WorkflowDefinition;
    manifest: Template.WorkflowManifest;
    workflowName?: string;
    kind?: string;
    images?: {
        light?: string;
        dark?: string;
    };
    isManageWorkflow?: boolean;
    triggerType: string;
    connectionKeys: string[];
    errors: WorkflowErrors;
}
export interface TemplatePayload {
    manifest: Template.TemplateManifest | undefined;
    workflows: Record<string, WorkflowTemplateData>;
    parameterDefinitions: Record<string, Template.ParameterDefinition>;
    connections: Record<string, Template.Connection>;
    errors: TemplateErrors;
}
export interface TemplateErrors {
    general: string | undefined;
    manifest: Record<string, string | undefined>;
    parameters: Record<string, string | undefined>;
    connections: string | undefined;
}
export interface WorkflowErrors {
    general: string | undefined;
    workflow: string | undefined;
    kind?: string;
    manifest?: Record<string, string | undefined>;
    triggerDescription?: string;
}
export declare const initializeWorkflowMetadata: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const isMultiWorkflowTemplate: (manifest: Template.TemplateManifest | undefined) => boolean;
export declare const resetStateOnResourceChange: import("@reduxjs/toolkit").AsyncThunk<boolean, Partial<TemplateServiceOptions>, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const initializeTemplateServices: import("@reduxjs/toolkit").AsyncThunk<boolean, TemplateServiceOptions, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const loadCustomTemplates: import("@reduxjs/toolkit").AsyncThunk<Record<string, TemplateData>, void, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const loadCustomTemplateArtifacts: import("@reduxjs/toolkit").AsyncThunk<TemplatePayload, TemplateData, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const loadManifestsFromPaths: (templateIds: string[]) => Promise<Record<string, Template.TemplateManifest> | undefined>;
export declare const loadTemplate: import("@reduxjs/toolkit").AsyncThunk<TemplatePayload | undefined, {
    preLoadedManifest: Template.TemplateManifest | undefined;
    templateName?: string | undefined;
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
export declare const validateWorkflowsBasicInfo: import("@reduxjs/toolkit").AsyncThunk<Record<string, {
    kindError?: string | undefined;
    nameError?: string | undefined;
    triggerDescriptionError?: string | undefined;
}>, {
    existingWorkflowNames: string[];
    requireDescription?: boolean | undefined;
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
export declare const validateWorkflowName: (workflowName: string | undefined, isConsumption: boolean, resourceDetails: {
    subscriptionId: string;
    resourceGroupName: string;
    existingWorkflowNames: string[];
}) => Promise<string | undefined>;
export declare const validateTriggerDescription: (triggerDescription: string | undefined) => Promise<string | undefined>;
