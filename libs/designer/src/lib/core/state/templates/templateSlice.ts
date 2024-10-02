import { getIntl, getRecordEntry } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { TemplatesParameterUpdateEvent } from '@microsoft/designer-ui';
import { validateConnectionsValue, validateParameterValue } from '../../templates/utils/helper';
import { initializeTemplateServices, loadTemplate, type TemplatePayload } from '../../actions/bjsworkflow/templates';

export interface TemplateState extends TemplatePayload {
  templateName?: string;
  servicesInitialized: boolean;
}

const initialState: TemplateState = {
  manifest: undefined,
  workflows: {},
  parameterDefinitions: {},
  connections: {},
  servicesInitialized: false,
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
    validateWorkflows: (state, action: PayloadAction<{ validateName: boolean; existingNames: string[] }>) => {
      const { validateName, existingNames } = action.payload;
      const workflows = Object.keys(state.workflows);
      if (workflows.length) {
        const intl = getIntl();
        for (const id of workflows) {
          if (!state.workflows[id].kind) {
            state.workflows[id].errors.kind = intl.formatMessage({
              defaultMessage: 'The value must not be empty.',
              id: 'JzvOUc',
              description: 'Error message when the stage progressed without selecting kind.',
            });
          }

          if (validateName) {
            state.workflows[id].errors.workflow = _validateWorkflowName(state.workflows[id].workflowName, existingNames);
          }
        }
      }
    },
    validateWorkflowName: (state, action: PayloadAction<{ id: string; existingNames: string[] }>) => {
      const { id, existingNames } = action.payload;
      if (!state.workflows[id]) {
        return;
      }
      const validationError = _validateWorkflowName(state.workflows[id].workflowName, existingNames);
      state.workflows[id].errors.workflow = validationError;
    },
    updateKind: (state, action: PayloadAction<{ id: string; kind: string }>) => {
      const { id, kind } = action.payload;
      if (!state.workflows[id]) {
        return;
      }
      state.workflows[id].kind = kind;
      state.workflows[id].errors.kind = undefined;
    },
    updateTemplateParameterValue: (state, action: PayloadAction<TemplatesParameterUpdateEvent>) => {
      const {
        newDefinition: { name, type, value, required },
      } = action.payload;

      const validationError = validateParameterValue({ type, value: value }, required);

      state.parameterDefinitions[name] = {
        ...(getRecordEntry(state.parameterDefinitions, name) ?? ({} as any)),
        value,
      };
      state.errors.parameters[name] = validationError;
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

    builder.addCase(initializeTemplateServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export const {
  changeCurrentTemplateName,
  updateWorkflowName,
  updateKind,
  validateWorkflows,
  updateTemplateParameterValue,
  validateParameters,
  validateConnections,
  clearTemplateDetails,
  validateWorkflowName,
} = templateSlice.actions;
export default templateSlice.reducer;

const _validateWorkflowName = (workflowName: string | undefined, existingWorkflowNames: string[]) => {
  const intl = getIntl();

  if (!workflowName) {
    return intl.formatMessage({
      defaultMessage: 'Must provide value for workflow name.',
      id: 'sKy720',
      description: 'Error message when the workflow name is empty.',
    });
  }
  const regex = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*$/;
  if (!regex.test(workflowName)) {
    return intl.formatMessage({
      defaultMessage: 'Name does not match the given pattern.',
      id: 'zMKxg9',
      description: 'Error message when the workflow name is invalid regex.',
    });
  }
  if (existingWorkflowNames.includes(workflowName)) {
    return intl.formatMessage(
      {
        defaultMessage: 'Workflow with name "{workflowName}" already exists.',
        id: '7F4Bzv',
        description: 'Error message when the workflow name already exists.',
      },
      { workflowName }
    );
  }
  return undefined;
};
