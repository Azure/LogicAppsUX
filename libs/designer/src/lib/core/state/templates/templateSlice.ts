import { getRecordEntry, type Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { validateConnectionsValue, validateParameterValue } from '../../templates/utils/helper';
import { loadTemplate, validateWorkflowsBasicInfo, type TemplatePayload } from '../../actions/bjsworkflow/templates';

export interface TemplateState extends TemplatePayload {
  templateName?: string;
}

const initialState: TemplateState = {
  manifest: undefined,
  workflows: {},
  parameterDefinitions: {},
  connections: {},
  errors: {
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
    updateTemplateParameterValue: (state, action: PayloadAction<Template.ParameterDefinition>) => {
      const { name, type, value, required } = action.payload;

      const validationError = validateParameterValue({ type, value: value }, required);

      state.parameterDefinitions[name] = {
        ...(getRecordEntry(state.parameterDefinitions, name) ?? ({} as any)),
        value,
      };
      state.errors.parameters[name] = validationError;
    },
    updateTemplateParameterDefinitions: (state, action: PayloadAction<Record<string, Template.ParameterDefinition>>) => {
      state.parameterDefinitions = { ...state.parameterDefinitions, ...action.payload };
    },
    validateParameters: (state) => {
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
        parameters: {},
        connections: undefined,
      };
      state.templateName = undefined;
      state.manifest = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTemplate.fulfilled, (state, action: PayloadAction<TemplatePayload | undefined>) => {
      if (action.payload) {
        const { workflows, parameterDefinitions, connections, errors, manifest } = action.payload;
        state.workflows = workflows;
        state.parameterDefinitions = parameterDefinitions;
        state.connections = connections;
        state.errors = errors;
        state.manifest = manifest;
      }
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflows = {};
      state.parameterDefinitions = {};
      state.connections = {};
      state.errors = {
        parameters: {},
        connections: undefined,
      };
    });

    builder.addCase(
      validateWorkflowsBasicInfo.fulfilled,
      (state, action: PayloadAction<Record<string, { kindError?: string; nameError?: string }>>) => {
        const workflows = action.payload;
        for (const workflowId of Object.keys(workflows)) {
          const { kindError, nameError } = workflows[workflowId];
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].errors.kind = kindError;
            state.workflows[workflowId].errors.workflow = nameError;
          }
        }
      }
    );
  },
});

export const {
  changeCurrentTemplateName,
  updateWorkflowName,
  updateKind,
  updateTemplateParameterValue,
  validateParameters,
  validateConnections,
  clearTemplateDetails,
  updateWorkflowNameValidationError,
  updateTemplateParameterDefinitions,
} = templateSlice.actions;
export default templateSlice.reducer;
