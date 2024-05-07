import { getIntl, getRecordEntry, type LogicAppsV2, type Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';
import type { WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { convertWorkflowParameterTypeToSwaggerType } from '../../../core/utils/tokens';
import { validateType } from '../../../core/utils/validation';
import Constants from '../../../common/constants';

export interface TemplateParameterDefinition extends Template.Parameter {
  value?: any;
}

export interface TemplateState {
  templateName?: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | undefined;
  manifest: Template.Manifest | undefined;
  parameters: {
    definitions: Record<string, Template.Parameter>;
    validationErrors: Record<string, string | undefined>;
  };
  connections: Template.Connection[];
}

const initialState: TemplateState = {
  workflowDefinition: undefined,
  manifest: undefined,
  parameters: {
    definitions: {},
    validationErrors: {},
  },
  connections: [],
};

export const loadTemplate = createAsyncThunk(
  'template/loadTemplate',
  async (preLoadedManifest: Template.Manifest | undefined, thunkAPI) => {
    const currentState: RootState = thunkAPI.getState() as RootState;
    const currentTemplateResourcePath = currentState.template.templateName;

    if (currentTemplateResourcePath) {
      return loadTemplateFromGithub(currentTemplateResourcePath, preLoadedManifest);
    }

    return undefined;
  }
);

export const validateParameterValue = (data: { type: string; value?: string }, required = true): string | undefined => {
  const intl = getIntl();

  const { value: valueToValidate, type } = data;
  if (valueToValidate === '' || valueToValidate === undefined) {
    if (!required) {
      return undefined;
    }
    return intl.formatMessage({
      defaultMessage: 'Must provide value for parameter.',
      id: 'VL9wOu',
      description: 'Error message when the workflow parameter value is empty.',
    });
  }

  const swaggerType = convertWorkflowParameterTypeToSwaggerType(type);
  let error = validateType(swaggerType, /* parameterFormat */ '', valueToValidate);

  if (error) {
    return error;
  }

  switch (swaggerType) {
    case Constants.SWAGGER.TYPE.ARRAY: {
      let isInvalid = false;
      try {
        isInvalid = !Array.isArray(JSON.parse(valueToValidate));
      } catch {
        isInvalid = true;
      }

      error = isInvalid
        ? intl.formatMessage({ defaultMessage: 'Enter a valid Array.', id: 'JgugQX', description: 'Error validation message' })
        : undefined;
      break;
    }

    case Constants.SWAGGER.TYPE.OBJECT:
    case Constants.SWAGGER.TYPE.BOOLEAN: {
      try {
        JSON.parse(valueToValidate);
      } catch {
        error =
          swaggerType === Constants.SWAGGER.TYPE.BOOLEAN
            ? intl.formatMessage({ defaultMessage: 'Enter a valid Boolean.', id: 'b7BQdu', description: 'Error validation message' })
            : intl.formatMessage({ defaultMessage: 'Enter a valid JSON.', id: 'dEe6Ob', description: 'Error validation message' });
      }
      break;
    }

    default:
      break;
  }
  return error;
};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeCurrentTemplateName: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
    updateTemplateParameterValue: (state, action: PayloadAction<WorkflowParameterUpdateEvent>) => {
      const {
        id,
        newDefinition: { type, value, required },
      } = action.payload;
      const validationError = validateParameterValue({ type, value }, required);

      state.parameters.definitions[id] = {
        ...(getRecordEntry(state.parameters.definitions, id) ?? ({} as any)),
        value,
      };
      state.parameters.validationErrors[id] = validationError;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTemplate.fulfilled, (state, action) => {
      if (action.payload) {
        state.workflowDefinition = action.payload.workflowDefinition;
        state.manifest = action.payload.manifest;
        state.parameters = action.payload.parameters;
        state.connections = action.payload.connections;
      }
    });

    builder.addCase(loadTemplate.rejected, (state) => {
      // TODO change to null for error handling case
      state.workflowDefinition = undefined;
      state.manifest = undefined;
      state.parameters = {
        definitions: {},
        validationErrors: {},
      };
      state.connections = [];
    });
  },
});

export const { changeCurrentTemplateName, updateTemplateParameterValue } = templateSlice.actions;

const loadTemplateFromGithub = async (
  templateName: string,
  manifest: Template.Manifest | undefined
): Promise<TemplateState | undefined> => {
  try {
    const templateWorkflowDefinition: LogicAppsV2.WorkflowDefinition = await import(
      `${templatesPathFromState}/${templateName}/workflow.json`
    );

    const templateManifest: Template.Manifest =
      manifest ?? (await import(`${templatesPathFromState}/${templateName}/manifest.json`)).default;
    const parametersDefinitions = templateManifest.parameters?.reduce((result: Record<string, TemplateParameterDefinition>, parameter) => {
      result[parameter.name] = {
        ...parameter,
        value: parameter.default,
      };
      return result;
    }, {});

    return {
      workflowDefinition: (templateWorkflowDefinition as any)?.default ?? templateWorkflowDefinition,
      manifest: templateManifest,
      parameters: {
        definitions: parametersDefinitions,
        validationErrors: {},
      },
      connections: templateManifest.connections,
    };
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
