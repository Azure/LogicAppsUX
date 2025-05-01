import { getRecordEntry, type Template } from '@microsoft/logic-apps-shared';
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
import { getSupportedSkus } from '../../configuretemplate/utils/helper';

export type TemplateEnvironment = 'Production' | 'Testing' | 'Development';
export interface TemplateState extends TemplatePayload {
  templateName?: string;
  status?: TemplateEnvironment;
}

const initialState: TemplateState = {
  manifest: undefined,
  workflows: {},
  parameterDefinitions: {},
  connections: {},
  errors: {
    manifest: {},
    parameters: {},
    connections: undefined,
  },
  status: 'Production',
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
        state.workflows[workflowId].errors = validateWorkflowData(workflowData, workflowKeys.length > 1);
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
    updateAllWorkflowsData: (state, action: PayloadAction<Record<string, Partial<WorkflowTemplateData>>>) => {
      const workflowsToUpdate = action.payload;
      const workflows: Record<string, WorkflowTemplateData> = {};

      for (const id of Object.keys(workflowsToUpdate)) {
        const data = workflowsToUpdate[id];
        workflows[id] = { ...(state.workflows[id] ?? {}), ...data };
      }

      // Update the manifest with the trigger type if there is only one workflow, otherwise undefined
      state.manifest = {
        ...(state.manifest ?? {}),
        details: {
          ...(state.manifest?.details ?? {}),
          Trigger: Object.keys(workflows).length === 1 ? workflows[Object.keys(workflows)[0]].triggerType : undefined,
        },
      } as Template.TemplateManifest;

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
        (state.manifest as Template.TemplateManifest).skus = getSupportedSkus(action.payload.connections);
      }
    },
    updateEnvironment: (state, action: PayloadAction<TemplateEnvironment>) => {
      state.status = action.payload;
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
          connectionKeys: string[];
          parameterKeys: string[];
          parametersToUpdate: Record<string, Partial<Template.ParameterDefinition>>;
        }>
      ) => {
        if (action.payload) {
          const { ids, connectionKeys, parameterKeys, parametersToUpdate } = action.payload;
          for (const id of ids) {
            delete state.workflows[id];
          }

          // Update the manifest with the trigger type if there is only one workflow, otherwise undefined
          state.manifest = {
            ...(state.manifest ?? {}),
            details: {
              ...(state.manifest?.details ?? {}),
              Trigger: Object.keys(state.workflows).length === 1 ? state.workflows[Object.keys(state.workflows)[0]].triggerType : undefined,
            },
          } as Template.TemplateManifest;

          for (const key of connectionKeys) {
            delete state.connections[key];
          }

          state.parameterDefinitions = { ...state.parameterDefinitions, ...(parametersToUpdate as any) };
          for (const key of parameterKeys) {
            delete state.parameterDefinitions[key];
          }
        }
      }
    );

    builder.addCase(loadCustomTemplate.fulfilled, (state, action: PayloadAction<{ status: string }>) => {
      if (action.payload) {
        const { status } = action.payload;
        state.status = status as TemplateEnvironment;
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
} = templateSlice.actions;
export default templateSlice.reducer;
