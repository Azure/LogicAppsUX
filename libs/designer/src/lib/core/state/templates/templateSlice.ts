import { getRecordEntry, type Template, getPropertyValue } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import {
  validateConnectionsValue,
  validateParameterDetail,
  validateParameterValue,
  validateTemplateManifestValue,
  validateWorkflowData,
} from '../../templates/utils/helper';
import type { WorkflowTemplateData, TemplatePayload } from '../../actions/bjsworkflow/templates';
import { loadCustomTemplateArtifacts, loadTemplate, validateWorkflowsBasicInfo } from '../../actions/bjsworkflow/templates';
import { resetTemplatesState } from '../global';
import { deleteWorkflowData, loadCustomTemplate } from '../../actions/bjsworkflow/configuretemplate';
import type { ApiValidationError } from '../../configuretemplate/utils/errors';

export interface TemplateState extends TemplatePayload {
  templateName?: string;
  apiValidatationErrors?: ApiValidationError;
  status?: Template.TemplateEnvironment;
  dataIsLoading?: boolean;
}

const initialState: TemplateState = {
  manifest: undefined,
  workflows: {},
  parameterDefinitions: {},
  connections: {},
  dataIsLoading: true,
  errors: {
    general: undefined,
    manifest: {},
    parameters: {},
    connections: undefined,
  },
};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
    updateWorkflowName: (state, action: PayloadAction<{ id: string; name: string | undefined }>) => {
      const { id, name } = action.payload;
      if (state.workflows[id]) {
        state.workflows[id].workflowName = name;
      }
    },
    updateWorkflowNameValidationError: (state, action: PayloadAction<{ id: string; error: string | undefined }>) => {
      const { id, error } = action.payload;
      if (!state.workflows[id]) {
        return;
      }

      state.workflows[id].errors.workflow = error;
    },
    updateKind: (state, action: PayloadAction<{ id: string; kind: string }>) => {
      const { id, kind } = action.payload;
      if (!state.workflows[id]) {
        return;
      }
      state.workflows[id].kind = kind;
      state.workflows[id].errors.kind = undefined;
    },
    updateTemplateTriggerDescription: (state, action: PayloadAction<{ id: string; description: string | undefined }>) => {
      const { id, description } = action.payload;
      const triggerKey = Object.keys(state.workflows?.[id]?.workflowDefinition?.triggers ?? {})?.[0];
      const trigger = state.workflows?.[id]?.workflowDefinition?.triggers?.[triggerKey];
      if (trigger) {
        trigger.description = description;
      }
    },
    updateTemplateTriggerDescriptionValidationError: (state, action: PayloadAction<{ id: string; error: string | undefined }>) => {
      const { id, error } = action.payload;
      if (!state.workflows[id]) {
        return;
      }
      state.workflows[id].errors.triggerDescription = error;
    },
    updateTemplateParameterValue: (state, action: PayloadAction<Template.ParameterDefinition>) => {
      const { name, type, value, required } = action.payload;

      const validationError = validateParameterValue({ type, value: value }, required);

      state.parameterDefinitions[name] = {
        ...(getRecordEntry(state.parameterDefinitions, name) ?? ({} as any)),
        value,
      };
      state.errors.parameters[name] = validationError;
    },
    updateTemplateParameterDefinition: (
      state,
      action: PayloadAction<{
        parameterId: string;
        data: Template.ParameterDefinition;
      }>
    ) => {
      const { parameterId, data } = action.payload;

      state.parameterDefinitions[parameterId] = {
        ...(state.parameterDefinitions[parameterId] ?? {}),
        ...data,
      };
    },
    updateAllTemplateParameterDefinitions: (state, action: PayloadAction<Record<string, Template.ParameterDefinition>>) => {
      state.parameterDefinitions = { ...state.parameterDefinitions, ...action.payload };
    },
    validateWorkflowManifestsData: (state) => {
      const workflowKeys = Object.keys(state.workflows);
      workflowKeys.forEach((workflowId) => {
        const workflowData = state.workflows[workflowId];
        state.workflows[workflowId].errors.manifest = validateWorkflowData(workflowData, workflowKeys.length > 1);
      });
    },
    validateTemplateManifest: (state) => {
      if (state.manifest) {
        state.errors.manifest = validateTemplateManifestValue(state.manifest);
      }
    },
    validateParameterValues: (state) => {
      const parametersDefinition = { ...state.parameterDefinitions };
      const parametersValidationErrors = { ...state.errors.parameters };
      Object.keys(parametersDefinition).forEach((parameterName) => {
        const thisParameter = parametersDefinition[parameterName];
        parametersValidationErrors[parameterName] = validateParameterValue(
          { type: thisParameter.type, value: thisParameter.value },
          thisParameter.required
        );
      });
      state.errors.parameters = parametersValidationErrors;
    },
    validateParameterDetails: (state) => {
      const parametersDefinition = { ...state.parameterDefinitions };
      const parametersValidationErrors = { ...state.errors.parameters };
      Object.keys(parametersDefinition).forEach((parameterName) => {
        const thisParameter = parametersDefinition[parameterName];
        parametersValidationErrors[parameterName] = validateParameterDetail(thisParameter);
      });
      state.errors.parameters = parametersValidationErrors;
    },
    validateConnections: (state, action: PayloadAction<Record<string, string>>) => {
      if (state.connections) {
        state.errors.connections = validateConnectionsValue(state.connections, action.payload);
      }
    },
    clearTemplateDetails: (state) => {
      state.workflows = {};
      state.parameterDefinitions = {};
      state.connections = {};
      state.errors = {
        general: undefined,
        manifest: {},
        parameters: {},
        connections: undefined,
      };
      state.templateName = undefined;
      state.manifest = undefined;
    },
    updateTemplateManifest: (state, action: PayloadAction<Partial<Template.TemplateManifest>>) => {
      state.manifest = { ...(state.manifest ?? {}), ...(action.payload as Template.TemplateManifest) };
    },
    updateWorkflowData: (
      state,
      action: PayloadAction<{ shouldDelete?: boolean; data: Partial<WorkflowTemplateData> & { id: string } }>
    ) => {
      const {
        shouldDelete,
        data: { id },
        data,
      } = action.payload;

      if (shouldDelete) {
        delete state.workflows[id];
      } else {
        state.workflows[id] = { ...(state.workflows[id] ?? {}), ...data };
      }
    },
    updateAllWorkflowsData: (
      state,
      action: PayloadAction<{ workflows: Record<string, Partial<WorkflowTemplateData>>; manifest?: Template.TemplateManifest }>
    ) => {
      const { workflows: workflowsToUpdate, manifest } = action.payload;
      const workflows: Record<string, WorkflowTemplateData> = {};

      for (const id of Object.keys(workflowsToUpdate)) {
        const data = workflowsToUpdate[id];
        workflows[id] = { ...(state.workflows[id] ?? {}), ...data };
      }

      // Update the manifest with the trigger type if there is only one workflow, otherwise undefined
      if (manifest) {
        state.manifest = manifest;
      }

      state.workflows = workflows;
    },
    updateConnectionAndParameterDefinitions: (
      state,
      action: PayloadAction<{
        connections: Record<string, Template.Connection>;
        parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>;
      }>
    ) => {
      if (action.payload) {
        state.connections = action.payload.connections;
        state.parameterDefinitions = action.payload.parameterDefinitions as any;
      }
    },
    updateEnvironment: (state, action: PayloadAction<Template.TemplateEnvironment>) => {
      state.status = action.payload;
    },
    setApiValidationErrors: (state, action: PayloadAction<{ error: ApiValidationError | undefined; source: string }>) => {
      if (action.payload.error) {
        const errorObject = { ...action.payload.error };
        const saveError = (errorObject as any).general;
        if (saveError) {
          delete (errorObject as any).general;
          errorObject.saveGeneral = { ...(state.apiValidatationErrors?.saveGeneral ?? {}), [action.payload.source]: saveError };
        }

        state.apiValidatationErrors = errorObject;
      } else if (getPropertyValue(state.apiValidatationErrors?.saveGeneral, action.payload.source)) {
        state.apiValidatationErrors = {
          saveGeneral: { ...(state.apiValidatationErrors?.saveGeneral ?? {}), [action.payload.source]: undefined },
        } as any;
      } else {
        state.apiValidatationErrors = undefined;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);

    builder.addCase(
      validateWorkflowsBasicInfo.fulfilled,
      (
        state,
        action: PayloadAction<
          Record<
            string,
            {
              kindError?: string;
              nameError?: string;
              triggerDescriptionError?: string;
            }
          >
        >
      ) => {
        const workflows = action.payload;
        for (const workflowId of Object.keys(workflows)) {
          const { kindError, nameError, triggerDescriptionError } = workflows[workflowId];
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].errors.kind = kindError;
            state.workflows[workflowId].errors.workflow = nameError;
            state.workflows[workflowId].errors.triggerDescription = triggerDescriptionError;
          }
        }
      }
    );

    builder.addCase(
      deleteWorkflowData.fulfilled,
      (
        state,
        action: PayloadAction<{
          ids: string[];
          manifest: Template.TemplateManifest;
          connections: Record<string, Template.Connection>;
          parameters: Record<string, Template.ParameterDefinition>;
        }>
      ) => {
        if (action.payload) {
          const { ids, manifest, connections, parameters } = action.payload;
          for (const id of ids) {
            delete state.workflows[id];
          }

          state.manifest = manifest;
          state.connections = connections;
          state.parameterDefinitions = parameters;
        }
      }
    );

    builder.addCase(loadCustomTemplate.fulfilled, (state, action: PayloadAction<{ status: string }>) => {
      if (action.payload) {
        const { status } = action.payload;
        state.status = status as Template.TemplateEnvironment;
        state.dataIsLoading = false;
      }
    });

    builder.addMatcher(
      isAnyOf(loadTemplate.fulfilled, loadCustomTemplateArtifacts.fulfilled),
      (state, action: PayloadAction<TemplatePayload | undefined>) => {
        if (action.payload) {
          const { workflows, parameterDefinitions, connections, errors, manifest } = action.payload;
          state.workflows = workflows;
          state.parameterDefinitions = parameterDefinitions;
          state.connections = connections;
          state.errors = errors;
          state.manifest = manifest;
        }
      }
    );

    builder.addMatcher(isAnyOf(loadTemplate.rejected, loadCustomTemplateArtifacts.rejected), (state) => {
      // TODO change to null for error handling case
      state.workflows = {};
      state.parameterDefinitions = {};
      state.connections = {};
      state.errors = {
        general: undefined,
        manifest: {},
        parameters: {},
        connections: undefined,
      };
    });
  },
});

export const {
  changeCurrentTemplateName,
  updateWorkflowName,
  updateKind,
  updateTemplateTriggerDescription,
  updateTemplateTriggerDescriptionValidationError,
  updateTemplateParameterValue,
  validateParameterValues,
  validateParameterDetails,
  validateConnections,
  clearTemplateDetails,
  updateWorkflowNameValidationError,
  updateTemplateParameterDefinition,
  validateWorkflowManifestsData,
  validateTemplateManifest,
  updateAllTemplateParameterDefinitions,
  updateWorkflowData,
  updateAllWorkflowsData,
  updateTemplateManifest,
  updateConnectionAndParameterDefinitions,
  updateEnvironment,
  setApiValidationErrors,
} = templateSlice.actions;
export default templateSlice.reducer;
