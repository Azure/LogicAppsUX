import { type Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WorkflowTemplateData, TemplatePayload } from '../../actions/bjsworkflow/templates';
import type { ApiValidationError } from '../../configuretemplate/utils/errors';
export interface TemplateState extends TemplatePayload {
    templateName?: string;
    apiValidatationErrors?: ApiValidationError;
    status?: Template.TemplateEnvironment;
    dataIsLoading?: boolean;
}
export declare const templateSlice: import("@reduxjs/toolkit").Slice<TemplateState, {
    changeCurrentTemplateName: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<string>) => void;
    updateWorkflowName: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        id: string;
        name: string | undefined;
    }>) => void;
    updateWorkflowNameValidationError: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        id: string;
        error: string | undefined;
    }>) => void;
    updateKind: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        id: string;
        kind: string;
    }>) => void;
    updateTemplateTriggerDescription: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        id: string;
        description: string | undefined;
    }>) => void;
    updateTemplateTriggerDescriptionValidationError: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        id: string;
        error: string | undefined;
    }>) => void;
    updateTemplateParameterValue: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<Template.ParameterDefinition>) => void;
    updateTemplateParameterDefinition: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        parameterId: string;
        data: Template.ParameterDefinition;
    }>) => void;
    updateAllTemplateParameterDefinitions: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<Record<string, Template.ParameterDefinition>>) => void;
    validateWorkflowManifestsData: (state: import("immer/dist/internal").WritableDraft<TemplateState>) => void;
    validateTemplateManifest: (state: import("immer/dist/internal").WritableDraft<TemplateState>) => void;
    validateParameterValues: (state: import("immer/dist/internal").WritableDraft<TemplateState>) => void;
    validateParameterDetails: (state: import("immer/dist/internal").WritableDraft<TemplateState>) => void;
    validateConnections: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<Record<string, string>>) => void;
    clearTemplateDetails: (state: import("immer/dist/internal").WritableDraft<TemplateState>) => void;
    updateTemplateManifest: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<Partial<Template.TemplateManifest>>) => void;
    updateWorkflowData: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        shouldDelete?: boolean;
        data: Partial<WorkflowTemplateData> & {
            id: string;
        };
    }>) => void;
    updateAllWorkflowsData: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        workflows: Record<string, Partial<WorkflowTemplateData>>;
        manifest?: Template.TemplateManifest;
        reset?: boolean;
    }>) => void;
    updateConnectionAndParameterDefinitions: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        connections: Record<string, Template.Connection>;
        parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>;
    }>) => void;
    updateEnvironment: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<Template.TemplateEnvironment>) => void;
    setApiValidationErrors: (state: import("immer/dist/internal").WritableDraft<TemplateState>, action: PayloadAction<{
        error: ApiValidationError | undefined;
        source: string;
    }>) => void;
}, "template">;
export declare const changeCurrentTemplateName: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "template/changeCurrentTemplateName">, updateWorkflowName: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    name: string | undefined;
}, "template/updateWorkflowName">, updateKind: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    kind: string;
}, "template/updateKind">, updateTemplateTriggerDescription: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    description: string | undefined;
}, "template/updateTemplateTriggerDescription">, updateTemplateTriggerDescriptionValidationError: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    error: string | undefined;
}, "template/updateTemplateTriggerDescriptionValidationError">, updateTemplateParameterValue: import("@reduxjs/toolkit").ActionCreatorWithPayload<Template.ParameterDefinition, "template/updateTemplateParameterValue">, validateParameterValues: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"template/validateParameterValues">, validateParameterDetails: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"template/validateParameterDetails">, validateConnections: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, string>, "template/validateConnections">, clearTemplateDetails: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"template/clearTemplateDetails">, updateWorkflowNameValidationError: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    error: string | undefined;
}, "template/updateWorkflowNameValidationError">, updateTemplateParameterDefinition: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    parameterId: string;
    data: Template.ParameterDefinition;
}, "template/updateTemplateParameterDefinition">, validateWorkflowManifestsData: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"template/validateWorkflowManifestsData">, validateTemplateManifest: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"template/validateTemplateManifest">, updateAllTemplateParameterDefinitions: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, Template.ParameterDefinition>, "template/updateAllTemplateParameterDefinitions">, updateWorkflowData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    shouldDelete?: boolean | undefined;
    data: Partial<WorkflowTemplateData> & {
        id: string;
    };
}, "template/updateWorkflowData">, updateAllWorkflowsData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    workflows: Record<string, Partial<WorkflowTemplateData>>;
    manifest?: Template.TemplateManifest | undefined;
    reset?: boolean | undefined;
}, "template/updateAllWorkflowsData">, updateTemplateManifest: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<Template.TemplateManifest>, "template/updateTemplateManifest">, updateConnectionAndParameterDefinitions: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    connections: Record<string, Template.Connection>;
    parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>;
}, "template/updateConnectionAndParameterDefinitions">, updateEnvironment: import("@reduxjs/toolkit").ActionCreatorWithPayload<Template.TemplateEnvironment, "template/updateEnvironment">, setApiValidationErrors: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    error: ApiValidationError | undefined;
    source: string;
}, "template/setApiValidationErrors">;
declare const _default: import("@reduxjs/toolkit").Reducer<TemplateState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
