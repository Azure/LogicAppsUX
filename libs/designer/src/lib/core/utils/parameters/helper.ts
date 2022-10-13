import Constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import type { NodeDataWithOperationMetadata } from '../../actions/bjsworkflow/operationdeserializer';
import type { Settings } from '../../actions/bjsworkflow/settings';
import type {
  DependencyInfo,
  NodeDependencies,
  NodeInputs,
  NodeOperation,
  OutputInfo,
  ParameterGroup,
  UpdateParametersPayload,
} from '../../state/operation/operationMetadataSlice';
import {
  DynamicLoadStatus,
  addDynamicInputs,
  clearDynamicInputs,
  updateNodeParameters,
} from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokensSlice';
import type { Operations as Actions } from '../../state/workflow/workflowInterfaces';
import { initializeArrayViewModel } from '../editors/array';
import { loadDynamicOutputsInNode } from '../outputs';
import { hasSecureOutputs } from '../setting';
import { getRecurrenceParameters } from './builtins';
import { addCastToExpression, addFoldingCastToExpression } from './casting';
import { getDynamicInputsFromSchema, getDynamicSchema, getDynamicValues } from './dynamicdata';
import {
  createLiteralValueSegment,
  isExpressionToken,
  isFunctionValueSegment,
  isItemToken,
  isIterationIndexToken,
  isLiteralValueSegment,
  isOutputToken,
  isOutputTokenValueSegment,
  isParameterToken,
  isTokenValueSegment,
  isVariableToken,
  ValueSegmentConvertor,
} from './segment';
import { getIntl } from '@microsoft-logic-apps/intl';
import type {
  DynamicParameters,
  Expression,
  ExpressionFunction,
  ExpressionLiteral,
  InputParameter,
  OutputParameter,
  ResolvedParameter,
  SchemaProcessorOptions,
  SchemaProperty,
  Segment,
  SwaggerParser,
} from '@microsoft-logic-apps/parsers';
import {
  isLegacyDynamicValuesExtension,
  ParameterLocations,
  ExpressionType,
  createEx,
  convertToStringLiteral,
  decodePropertySegment,
  DefaultKeyPrefix,
  encodePropertySegment,
  isAncestorKey,
  isTemplateExpression,
  OutputKeys,
  OutputSource,
  parseEx,
  SchemaProcessor,
  SegmentType,
  Visibility,
} from '@microsoft-logic-apps/parsers';
import type { Exception, OperationManifest, RecurrenceSetting } from '@microsoft-logic-apps/utils';
import {
  isUndefinedOrEmptyString,
  aggregate,
  clone,
  endsWith,
  equals,
  first,
  format,
  getPropertyValue,
  guid,
  includes,
  isNullOrUndefined,
  isObject,
  startsWith,
  unmap,
  UnsupportedException,
  ValidationErrorCode,
  ValidationException,
} from '@microsoft-logic-apps/utils';
import type {
  AuthProps,
  DictionaryEditorItemProps,
  OutputToken,
  ParameterInfo,
  Token as SegmentToken,
  ValueSegment,
} from '@microsoft/designer-ui';
import { AuthenticationType, ColumnMode, DynamicCallStatus, ValueSegmentType, TokenType } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

// import { debounce } from 'lodash';

const ParameterIcon =
  'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBkPSJtMCAwaDMydjMyaC0zMnoiIGZpbGw9IiM5MTZmNmYiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0ibTE2LjAyMyAxMS41cTAuOTQ1MzEgMCAxLjc3MzQgMC4yODkwNiAwLjgyODEyIDAuMjg5MDYgMS40NDUzIDAuODM1OTQgMC42MTcxOSAwLjU0Njg4IDAuOTY4NzUgMS4zMjgxIDAuMzU5MzggMC43ODEyNSAwLjM1OTM4IDEuNzY1NiAwIDAuNTE1NjItMC4xNDA2MiAxLjA3ODEtMC4xMzI4MSAwLjU1NDY5LTAuNDIxODggMS4wMTU2LTAuMjgxMjUgMC40NTMxMi0wLjcyNjU2IDAuNzUtMC40Mzc1IDAuMjk2ODgtMS4wNDY5IDAuMjk2ODgtMC42NzE4OCAwLTAuOTY4NzUtMC4zNjcxOS0wLjI5Njg4LTAuMzY3MTktMC4zMDQ2OS0xLjAwNzhoLTAuMDMxMjVxLTAuMTc5NjkgMC42MTcxOS0wLjU4NTk0IDEtMC4zOTg0NCAwLjM3NS0xLjA3MDMgMC4zNzUtMC40NjA5NCAwLTAuNzk2ODgtMC4xNzk2OS0wLjMyODEyLTAuMTg3NS0wLjU0Njg4LTAuNDg0MzgtMC4yMTA5NC0wLjMwNDY5LTAuMzEyNS0wLjY4NzUtMC4xMDE1Ni0wLjM5MDYyLTAuMTAxNTYtMC44MDQ2OSAwLTAuNTQ2ODggMC4xNDA2Mi0xLjA5MzggMC4xNDg0NC0wLjU0Njg4IDAuNDQ1MzEtMC45NzY1NiAwLjI5Njg4LTAuNDI5NjkgMC43NS0wLjY5NTMxIDAuNDYwOTQtMC4yNzM0NCAxLjA4NTktMC4yNzM0NCAwLjE3OTY5IDAgMC4zNTkzOCAwLjA0Njg3IDAuMTg3NSAwLjA0Njg3IDAuMzUxNTYgMC4xNDA2MiAwLjE2NDA2IDAuMDkzNzUgMC4yODkwNiAwLjIzNDM4dDAuMTg3NSAwLjMyODEydi0wLjAzOTA1OHEwLjAxNTYzLTAuMTU2MjUgMC4wMjM0NC0wLjMxMjUgMC4wMTU2My0wLjE1NjI1IDAuMDMxMjUtMC4zMTI1aDAuNzI2NTZsLTAuMTg3NSAyLjIzNDRxLTAuMDIzNDQgMC4yNS0wLjA1NDY5IDAuNTA3ODEtMC4wMzEyNTEgMC4yNTc4MS0wLjAzMTI1MSAwLjUwNzgxIDAgMC4xNzE4OCAwLjAxNTYzIDAuMzgyODEgMC4wMjM0NCAwLjIwMzEyIDAuMDkzNzUgMC4zOTA2MiAwLjA3MDMxIDAuMTc5NjkgMC4yMDMxMiAwLjMwNDY5IDAuMTQwNjIgMC4xMTcxOSAwLjM3NSAwLjExNzE5IDAuMjgxMjUgMCAwLjUtMC4xMTcxOSAwLjIxODc1LTAuMTI1IDAuMzc1LTAuMzIwMzEgMC4xNjQwNi0wLjE5NTMxIDAuMjczNDQtMC40NDUzMSAwLjEwOTM4LTAuMjU3ODEgMC4xNzk2OS0wLjUyMzQ0IDAuMDcwMzEtMC4yNzM0NCAwLjA5Mzc1LTAuNTM5MDYgMC4wMzEyNS0wLjI2NTYyIDAuMDMxMjUtMC40ODQzOCAwLTAuODU5MzgtMC4yODEyNS0xLjUzMTJ0LTAuNzg5MDYtMS4xMzI4cS0wLjUtMC40NjA5NC0xLjIwMzEtMC43MDMxMi0wLjY5NTMxLTAuMjQyMTktMS41MjM0LTAuMjQyMTktMC44OTg0NCAwLTEuNjMyOCAwLjMzNTk0LTAuNzI2NTYgMC4zMzU5NC0xLjI1IDAuOTE0MDYtMC41MTU2MiAwLjU3MDMxLTAuNzk2ODggMS4zMzU5dC0wLjI4MTI1IDEuNjMyOHEwIDAuODk4NDQgMC4yNzM0NCAxLjYzMjggMC4yODEyNSAwLjcyNjU2IDAuNzk2ODggMS4yNDIydDEuMjQyMiAwLjc5Njg4cTAuNzM0MzggMC4yODEyNSAxLjYzMjggMC4yODEyNSAwLjYzMjgxIDAgMS4yNS0wLjEwMTU2IDAuNjI1LTAuMTAxNTYgMS4xOTUzLTAuMzc1djAuNzE4NzVxLTAuNTg1OTQgMC4yNS0xLjIyNjYgMC4zNDM3NS0wLjY0MDYzIDAuMDg1OTM4LTEuMjczNCAwLjA4NTkzOC0xLjAzOTEgMC0xLjg5ODQtMC4zMjAzMS0wLjg1OTM4LTAuMzI4MTItMS40ODQ0LTAuOTIxODgtMC42MTcxOS0wLjYwMTU2LTAuOTYwOTQtMS40NTMxLTAuMzQzNzUtMC44NTE1Ni0wLjM0Mzc1LTEuODk4NCAwLTEuMDU0NyAwLjM1MTU2LTEuOTUzMSAwLjM1MTU2LTAuODk4NDQgMC45ODQzOC0xLjU1NDcgMC42MzI4MS0wLjY1NjI1IDEuNTE1Ni0xLjAyMzQgMC44ODI4MS0wLjM3NSAxLjk1MzEtMC4zNzV6bS0wLjYwOTM3IDYuNjc5N3EwLjQ3NjU2IDAgMC43ODEyNS0wLjI2NTYyIDAuMzA0NjktMC4yNzM0NCAwLjQ3NjU2LTAuNjcxODggMC4xNzE4OC0wLjM5ODQ0IDAuMjM0MzgtMC44NTE1NiAwLjA3MDMxLTAuNDUzMTIgMC4wNzAzMS0wLjgyMDMxIDAtMC4yNjU2Mi0wLjA1NDY5LTAuNDkyMTktMC4wNTQ2OS0wLjIyNjU2LTAuMTc5NjktMC4zOTA2Mi0wLjExNzE5LTAuMTY0MDYtMC4zMjAzMS0wLjI1NzgxdC0wLjQ5MjE5LTAuMDkzNzVxLTAuNDUzMTIgMC0wLjc1NzgxIDAuMjM0MzgtMC4zMDQ2OSAwLjIzNDM4LTAuNDkyMTkgMC41ODU5NC0wLjE4NzUgMC4zNTE1Ni0wLjI3MzQ0IDAuNzczNDQtMC4wNzgxMyAwLjQxNDA2LTAuMDc4MTMgMC43ODEyNSAwIDAuMjU3ODEgMC4wNTQ2OSAwLjUyMzQ0IDAuMDU0NjkgMC4yNTc4MSAwLjE3OTY5IDAuNDY4NzUgMC4xMjUgMC4yMTA5NCAwLjMzNTk0IDAuMzQzNzUgMC4yMTA5NCAwLjEzMjgxIDAuNTE1NjIgMC4xMzI4MXptLTcuNDE0MS04LjE3OTdoM3YxaC0ydjEwaDJ2MWgtM3ptMTYgMHYxMmgtM3YtMWgydi0xMGgtMnYtMXoiIHN0cm9rZS13aWR0aD0iLjQiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';
const FxIcon =
  'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiNhZDAwOGMiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTMuNDg3LDEzLjI0OGE3LjA1NCw3LjA1NCwwLDAsMSwxLjg0OS0zLjY5QTUuMyw1LjMsMCwwLDEsMTguNTkzLDcuOWMuOTg1LDAsMS40NjcuNTg1LDEuNDQ3LDEuMDY5YTEuNTUxLDEuNTUxLDAsMCwxLS43NDQsMS4xNDkuNDA2LjQwNiwwLDAsMS0uNTQzLS4wNjFjLS41NDMtLjY2NS0xLjAwNS0xLjA2OS0xLjM2Ny0xLjA2OS0uNC0uMDItLjc2NC4yODItMS40MDcsNC4yNTVoMi4zMzJsLS40MjIuODA3LTIuMDkuMTYxYy0uMzQyLDEuODM1LS42LDMuNjMtMS4xNDYsNS45MDgtLjc4NCwzLjMyNy0xLjY4OCw0LjY1OC0zLjEsNS44MjdBMy43NDYsMy43NDYsMCwwLDEsOS4zNDcsMjdDOC42ODMsMjcsOCwyNi41NTYsOCwyNi4wMzJhMS42OTIsMS42OTIsMCwwLDEsLjcyNC0xLjE0OWMuMTYxLS4xMjEuMjgxLS4xNDEuNDIyLS4wNGEyLjg3MywyLjg3MywwLDAsMCwxLjU2OC43MDYuNjc1LjY3NSwwLDAsMCwuNjYzLS41LDI3LjQyNywyNy40MjcsMCwwLDAsLjg0NC00LjE3NGMuNDYyLTIuNzYyLjc0NC00LjY1OCwxLjA4NS02LjY1NEgxMS43bC0uMS0uMi42ODMtLjc2NloiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTcuMzIxLDE4LjljLjgxMi0xLjE4MywxLjY1NC0xLjg3NCwyLjIzNi0xLjg3NC40OSwwLC43MzUuNTIyLDEuMDU3LDEuNDlsLjIzLjcyMmMxLjE2NC0xLjY3NSwxLjczMS0yLjIxMiwyLjQtMi4yMTJhLjc0Mi43NDIsMCwwLDEsLjc1MS44NDUuOTIyLjkyMiwwLDAsMS0uOC44NzYuNDE0LjQxNCwwLDAsMS0uMjkxLS4xNjkuNDc3LjQ3NywwLDAsMC0uMzY4LS4xODRjLS4xNTMsMC0uMzM3LjEwOC0uNjEzLjM4NGE4LjU0Nyw4LjU0NywwLDAsMC0uODczLDEuMDc1bC42MTMsMS45NjZjLjE4NC42My4zNjcuOTUyLjU2Ny45NTIuMTg0LDAsLjUwNi0uMjQ2LDEuMDQyLS44OTFsLjMyMi4zODRjLS45LDEuNDI5LTEuNzYxLDEuOTItMi4zNDMsMS45Mi0uNTIxLDAtLjg1OC0uNDMtMS4xOC0xLjQ5bC0uMzUyLTEuMTY4Yy0xLjE3OSwxLjkyLTEuNzQ2LDIuNjU4LTIuNTQzLDIuNjU4YS44MTUuODE1LDAsMCwxLS44MTItLjg3NS45LjksMCwwLDEsLjc2Ni0uOTIyLjQ5My40OTMsMCwwLDEsLjI5MS4xNTQuNTE0LjUxNCwwLDAsMCwuMzY4LjE2OWMuMzM3LDAsLjk1LS42NzYsMS43MTUtMS44NTlsLS40LTEuMzY3Yy0uMjc2LS45MDYtLjQxNC0xLjAxNC0uNTY3LTEuMDE0LS4xMzgsMC0uNDE0LjItLjg4OC44MTRaIi8+DQo8L3N2Zz4NCg==';

export const ParameterGroupKeys = {
  DEFAULT: 'default',
  RECURRENCE: 'recurrence',
};

export interface RepetitionContext {
  splitOn?: string;
  repetitionReferences: RepetitionReference[];
}

export interface RepetitionReference {
  actionName: string;
  actionType: string;
  repetitionValue: any; // NOTE: the expression for foreach, and its type could be string or array.
  repetitionStep?: string; // NOTE: the output original step
  repetitionPath?: string; // NOTE: the full output path for repetition value if it coming from output
}

export function getParametersSortedByVisibility(parameters: ParameterInfo[]): ParameterInfo[] {
  const sortedParameters: ParameterInfo[] = parameters.filter((parameter) => parameter.required);

  for (const parameter of parameters) {
    if (!parameter.required && equals(parameter.visibility, Visibility.Important)) {
      sortedParameters.push(parameter);
    }
  }

  parameters.forEach((parameter) => {
    if (!parameter.required && !equals(parameter.visibility, Visibility.Important) && !equals(parameter.visibility, Visibility.Advanced)) {
      sortedParameters.push(parameter);
    }
  });

  parameters.forEach((parameter) => {
    if (!parameter.required && equals(parameter.visibility, Visibility.Advanced)) {
      sortedParameters.push(parameter);
    }
  });

  return sortedParameters;
}

export function addRecurrenceParametersInGroup(
  parameterGroups: Record<string, ParameterGroup>,
  recurrence: RecurrenceSetting | undefined,
  definition: any
): void {
  if (!recurrence) {
    return;
  }

  const recurrenceParameters = getRecurrenceParameters(recurrence, definition);

  if (recurrenceParameters.length) {
    const intl = getIntl();
    if (recurrence.useLegacyParameterGroup) {
      // eslint-disable-next-line no-param-reassign
      parameterGroups[ParameterGroupKeys.DEFAULT].parameters = recurrenceParameters;
    } else {
      // eslint-disable-next-line no-param-reassign
      parameterGroups[ParameterGroupKeys.RECURRENCE] = {
        id: ParameterGroupKeys.RECURRENCE,
        description: intl.formatMessage({
          defaultMessage: 'How often do you want to check for items?',
          description: 'Recurrence parameter group title',
        }),
        parameters: recurrenceParameters,
      };
    }
  }
}

export const getDependentParameters = (
  inputs: NodeInputs,
  parameters: Record<string, any> | DynamicParameters
): Record<string, { isValid: boolean }> => {
  return Object.keys(parameters).reduce((result: Record<string, { isValid: boolean }>, key: string) => {
    const parameter = parameters[key];
    const operationInput = getParameterFromName(inputs, parameter.parameter ?? parameter.parameterReference);
    if (operationInput) {
      return {
        ...result,
        [operationInput.id]: { isValid: parameterValidForDynamicCall(operationInput) },
      };
    }

    return result;
  }, {});
};

/**
 * Converts to parameter info map.
 * @arg {InputParameter[]} inputParameters - The input parameters.
 * @arg {any} [stepDefinition] - The step definition.
 * @arg {string} [nodeId] - The graph node id which contains the specified parameters.
 */
export function toParameterInfoMap(inputParameters: InputParameter[], stepDefinition?: any, nodeId?: string): ParameterInfo[] {
  const metadata = stepDefinition && stepDefinition.metadata;
  const result: ParameterInfo[] = [];

  for (const inputParameter of inputParameters) {
    let repetitionContext: RepetitionContext | null;
    if (nodeId) {
      repetitionContext = getRepetitionContext(); // TODO: Get repetition context from redux for this node
    } else {
      repetitionContext = null;
    }

    if (!inputParameter.dynamicSchema) {
      const parameter = createParameterInfo(inputParameter, repetitionContext, metadata);
      result.push(parameter);
    }
  }

  return result;
}

/**
 * Gets the parameter info object for UI elements from the resolved parameters from schema, swagger, definition, etc.
 * @arg {InputParameter} parameter - An object with metadata about a Swagger input parameter.
 * @arg {RepetitionContext} repetitionContext - An object contains the repetition related context data.
 * @arg {Record<string, string>} [metadata] - A hash mapping dynamic value lookup values to their display strings.
 * @arg {boolean} [shouldIgnoreDefaultValue=false] - True if should not populate with default value of dynamic parameter.
 * @return {ParameterInfo} - An object with the view model for an input parameter field.
 */
export function createParameterInfo(
  parameter: ResolvedParameter,
  repetitionContext?: RepetitionContext | null,
  metadata?: Record<string, string>,
  shouldIgnoreDefaultValue = false
): ParameterInfo {
  if (!repetitionContext) {
    // eslint-disable-next-line no-param-reassign
    repetitionContext = {
      repetitionReferences: [],
    };
  }

  const editor = getParameterEditorProps(parameter, shouldIgnoreDefaultValue);
  const parameterInfo: ParameterInfo = {
    alternativeKey: parameter.alternativeKey,
    id: guid(),
    dynamicData: parameter.dynamicValues ? { status: DynamicCallStatus.NOTSTARTED } : undefined,
    editor: editor.type,
    editorOptions: editor.options,
    editorViewModel: editor.viewModel,
    info: {
      alias: parameter.alias,
      encode: parameter.encode,
      format: parameter.format,
      in: parameter.in,
      isDynamic: !!parameter.isDynamic,
      isUnknown: parameter.isUnknown,
      serialization: parameter.serialization,
    },
    hideInUI: parameter?.hideInUI ?? equals(parameter.visibility, 'hideInUI'),
    label: parameter.title || parameter.summary || parameter.name,
    parameterKey: parameter.key,
    parameterName: parameter.name,
    placeholder: parameter.description,
    preservedValue: getPreservedValue(parameter),
    required: !!parameter.required,
    schema: editor.schema,
    showErrors: false,
    showTokens: false,
    suppressCasting: parameter.suppressCasting,
    type: parameter.type,
    value: loadParameterValue(parameter),
    visibility: parameter.visibility,
  };

  return parameterInfo;
}

// TODO - Need to figure out a way to get the managedIdentity for the app for authentication editor
export function getParameterEditorProps(inputParameter: InputParameter, shouldIgnoreDefaultValue = false): ParameterEditorProps {
  let type = inputParameter.editor;
  let editorViewModel;
  let schema = inputParameter.schema;
  const { dynamicValues } = inputParameter;

  if (
    !type &&
    inputParameter.type === Constants.SWAGGER.TYPE.ARRAY &&
    !!inputParameter.itemSchema &&
    !equals(inputParameter.visibility, Visibility.Internal)
  ) {
    type = Constants.EDITOR.ARRAY;
    editorViewModel = initializeArrayViewModel(inputParameter, shouldIgnoreDefaultValue);
    schema = { ...schema, ...{ 'x-ms-editor': Constants.EDITOR.ARRAY } };
  } else if (type === Constants.EDITOR.DICTIONARY) {
    editorViewModel = toDictionaryViewModel(inputParameter.value);
  } else if (type === Constants.EDITOR.TABLE) {
    editorViewModel = toTableViewModel(inputParameter.value, inputParameter.editorOptions);
  } else if (type === Constants.EDITOR.AUTHENTICATION) {
    editorViewModel = toAuthenticationViewModel(inputParameter.value);
  } else if (dynamicValues && isLegacyDynamicValuesExtension(dynamicValues) && dynamicValues.extension.builtInOperation) {
    type = undefined;
  }

  return {
    type,
    options: !type ? undefined : inputParameter.editorOptions,
    viewModel: editorViewModel,
    schema,
  };
}

function toDictionaryViewModel(value: any): { items: DictionaryEditorItemProps[] | undefined } {
  let items: DictionaryEditorItemProps[] | undefined = [];
  const valueToParse = value !== null ? value ?? {} : value;
  const canParseObject = valueToParse !== null && isObject(valueToParse);

  if (canParseObject) {
    const keys = Object.keys(valueToParse);
    for (const itemKey of keys) {
      items.push({
        key: loadParameterValue({ value: itemKey } as any),
        value: loadParameterValue({ value: valueToParse[itemKey] } as any),
      });
    }

    if (!keys.length) {
      items.push({ key: [createLiteralValueSegment('')], value: [createLiteralValueSegment('')] });
    }
  } else {
    items = undefined;
  }

  return { items };
}

function toTableViewModel(value: any, editorOptions: any): { items: DictionaryEditorItemProps[]; columnMode: ColumnMode } {
  const placeholderItem = { key: [createLiteralValueSegment('')], value: [createLiteralValueSegment('')] };
  if (Array.isArray(value)) {
    const keys = editorOptions.columns.keys;
    const items: DictionaryEditorItemProps[] = [];
    for (const item of value) {
      items.push({
        key: loadParameterValue({ value: item[keys[0]] } as any),
        value: loadParameterValue({ value: item[keys[1]] } as any),
      });
    }

    return { items: !value.length ? [placeholderItem] : items, columnMode: ColumnMode.Custom };
  }

  return { items: [placeholderItem], columnMode: ColumnMode.Automatic };
}

function toAuthenticationViewModel(value: any): { type: AuthenticationType; authenticationValue: AuthProps } {
  const emptyValue = { type: AuthenticationType.NONE, authenticationValue: {} };

  if (value && isObject(value)) {
    switch (value.type) {
      case AuthenticationType.BASIC:
        return {
          type: value.type,
          authenticationValue: {
            basic: {
              basicUsername: loadParameterValue({ value: value.username } as any),
              basicPassword: loadParameterValue({ value: value.password } as any),
            },
          },
        };
      case AuthenticationType.CERTIFICATE:
        return {
          type: value.type,
          authenticationValue: {
            clientCertificate: {
              clientCertificatePfx: loadParameterValue({ value: value.pfx } as any),
              clientCertificatePassword: loadParameterValue({ value: value.password } as any),
            },
          },
        };

      case AuthenticationType.OAUTH:
        return {
          type: value.type,
          authenticationValue: {
            aadOAuth: {
              oauthAuthority: loadParameterValue({ value: value.authority } as any),
              oauthTenant: loadParameterValue({ value: value.tenant } as any),
              oauthAudience: loadParameterValue({ value: value.audience } as any),
              oauthClientId: loadParameterValue({ value: value.clientId } as any),
              oauthTypeSecret: loadParameterValue({ value: value.secret } as any),
              oauthTypeCertificatePfx: loadParameterValue({ value: value.pfx } as any),
              oauthTypeCertificatePassword: loadParameterValue({ value: value.password } as any),
            },
          },
        };

      case AuthenticationType.RAW:
        return {
          type: value.type,
          authenticationValue: {
            raw: {
              rawValue: loadParameterValue({ value: value.value } as any),
            },
          },
        };

      case AuthenticationType.MSI:
        return {
          type: value.type,
          authenticationValue: {
            msi: {
              msiAudience: loadParameterValue({ value: value.audience } as any),
              msiIdentity: value.identity,
            },
          },
        };

      default:
        throw new Error(`Cannot fetch authentication editor details. Invalid authentication type '${value.type}'`);
    }
  }

  return emptyValue;
}

interface ParameterEditorProps {
  type?: string;
  options?: Record<string, any>;
  viewModel?: any;
  schema: any;
}

export function shouldIncludeSelfForRepetitionReference(manifest: OperationManifest, parameterName?: string): boolean {
  if (manifest?.properties.repetition?.self) {
    return !parameterName || !(manifest.properties.repetition.self.parametersToExclude ?? []).includes(parameterName);
  }

  return false;
}

export function loadParameterValue(parameter: InputParameter): ValueSegment[] {
  const valueObject = parameter.isNotificationUrl ? `@${Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME}` : parameter.value;

  // TODO - Might need more parsing for Javascript code editor
  let valueSegments = convertToValueSegments(valueObject, undefined /* repetitionContext */, !parameter.suppressCasting /* shouldUncast */);

  // TODO - Need to set value display name correctly from metadata for file/folder picker.

  valueSegments = compressSegments(valueSegments);

  for (const segment of valueSegments) {
    ensureExpressionValue(segment);
  }

  return valueSegments;
}

export function compressSegments(segments: ValueSegment[], addInsertAnchorIfNeeded = false): ValueSegment[] {
  const result: ValueSegment[] = [];

  if (!segments || !segments.length) {
    if (addInsertAnchorIfNeeded) {
      result.push(createLiteralValueSegment(''));
    }

    return result;
  }

  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    if (isLiteralValueSegment(current) && isLiteralValueSegment(segments[i])) {
      current.value += segments[i].value;
    } else {
      result.push(current);

      // We create empty literals around tokens, so that value insertion is possible
      if (isTokenValueSegment(segments[i]) && !isLiteralValueSegment(current)) {
        result.push(createLiteralValueSegment(''));
      }

      current = segments[i];
    }
  }

  result.push(current);
  return result;
}

export function convertToTokenExpression(value: any): string {
  if (isNullOrUndefined(value)) {
    return '';
  } else if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  } else {
    return value.toString();
  }
}

export function convertToValueSegments(
  value: any,
  repetitionContext: RepetitionContext | undefined,
  shouldUncast: boolean
): ValueSegment[] {
  try {
    const convertor = new ValueSegmentConvertor({
      repetitionContext,
      shouldUncast,
      rawModeEnabled: true,
    });
    return convertor.convertToValueSegments(value);
  } catch {
    return [createLiteralValueSegment(typeof value === 'string' ? value : JSON.stringify(value, null, 2))];
  }
}

export function getAllInputParameters(nodeInputs: NodeInputs): ParameterInfo[] {
  const { parameterGroups } = nodeInputs;
  return aggregate(Object.keys(parameterGroups).map((groupKey) => parameterGroups[groupKey].parameters));
}

export function ensureExpressionValue(valueSegment: ValueSegment): void {
  if (isTokenValueSegment(valueSegment)) {
    // eslint-disable-next-line no-param-reassign
    valueSegment.value = getTokenExpressionValue(valueSegment.token as SegmentToken, valueSegment.value);
  }
}

export function getExpressionValueForOutputToken(token: OutputToken, nodeType: string): string | undefined {
  const {
    key,
    name,
    outputInfo: { type: tokenType, actionName, required, arrayDetails, functionArguments },
  } = token;
  let method: string;
  switch (tokenType) {
    case TokenType.PARAMETER:
    case TokenType.VARIABLE:
      return getTokenValueFromToken(tokenType, functionArguments as string[]);

    case TokenType.ITERATIONINDEX:
      return `iterationIndexes(${convertToStringLiteral(actionName as string)})`;

    case TokenType.ITEM:
      if (nodeType.toLowerCase() === Constants.NODE.TYPE.FOREACH && key === Constants.FOREACH_CURRENT_ITEM_KEY) {
        return `items(${convertToStringLiteral(actionName as string)})`;
      } else {
        let propertyPath: string;
        if (
          !name ||
          equals(name, OutputKeys.Queries) ||
          equals(name, OutputKeys.Headers) ||
          equals(name, OutputKeys.Body) ||
          endsWith(name, OutputKeys.Item) ||
          equals(name, OutputKeys.Outputs) ||
          equals(name, OutputKeys.StatusCode) ||
          equals(name, OutputKeys.Name) ||
          equals(name, OutputKeys.Properties) ||
          equals(name, OutputKeys.PathParameters)
        ) {
          propertyPath = '';
        } else {
          propertyPath = convertPathToBracketsFormat(name, !required);
        }
        return `items(${convertToStringLiteral(actionName as string)})${propertyPath}`;
      }

    default:
      method = arrayDetails
        ? Constants.ITEM
        : actionName
        ? `${Constants.OUTPUTS}(${convertToStringLiteral(actionName)})`
        : Constants.TRIGGER_OUTPUTS_OUTPUT;

      return _generateExpressionFromKey(method, key, actionName, !!arrayDetails);
  }
}

// NOTE: For example, if tokenKey is outputs.$.foo.[*].bar, which means
// the root outputs is an object, and the object has a property foo which is an array.
// Every item in the array has a bar property, and the expression would something like item()?['bar'].
function _generateExpressionFromKey(method: string, tokenKey: string, actionName: string | undefined, isInsideArray: boolean): string {
  const segments = parseEx(tokenKey);
  segments.shift();
  segments.shift();
  const result = [];
  // NOTE: Use @body for tokens that come from the body path like outputs.$.Body.weather
  let rootMethod = method;
  if (!isInsideArray && segments[0]?.value?.toString()?.toLowerCase() === OutputSource.Body) {
    segments.shift();
    rootMethod = actionName ? `${OutputSource.Body}(${convertToStringLiteral(actionName)})` : `triggerBody()`;
  }

  while (segments.length) {
    const segment = segments.pop() as Segment;
    if (segment.type === SegmentType.Index) {
      break;
    } else {
      const propertyName = segment.value as string;
      result.push(`?[${convertToStringLiteral(propertyName)}]`);
    }
  }

  result.push(rootMethod);
  return result.reverse().join('');
}

function getTokenValueFromToken(tokenType: TokenType, functionArguments: string[]): string | undefined {
  return tokenType === TokenType.PARAMETER
    ? `parameters(${convertToStringLiteral(functionArguments[0])})`
    : tokenType === TokenType.VARIABLE
    ? `variables(${convertToStringLiteral(functionArguments[0])})`
    : undefined;
}

export function getTokenExpressionValue(token: SegmentToken, currentValue?: string): string {
  const { name } = token;

  if (isExpressionToken(token) || isParameterToken(token) || isVariableToken(token) || isIterationIndexToken(token)) {
    return currentValue as string;
  } else if (isItemToken(token)) {
    // TODO - Update when array item tokens are correctly created
    if (currentValue) {
      return currentValue as string;
    } else {
      return `${Constants.ITEM}`;
    }
  } else if (isOutputToken(token)) {
    if (currentValue) {
      return currentValue as string;
    } else {
      if (name && equals(name, Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME)) {
        return name;
      } else {
        return getNonOpenApiTokenExpressionValue(token);
      }
    }
  }

  return currentValue as string;
}

function getNonOpenApiTokenExpressionValue(token: SegmentToken): string {
  const { actionName, name, source, required, key, arrayDetails } = token;
  const optional = !isNullOrUndefined(required) && !required;
  let propertyPath: string;

  if (
    !name ||
    equals(name, OutputKeys.Queries) ||
    equals(name, OutputKeys.Headers) ||
    equals(name, OutputKeys.Body) ||
    endsWith(name, OutputKeys.Item) ||
    equals(name, OutputKeys.Outputs) ||
    equals(name, OutputKeys.StatusCode) ||
    equals(name, OutputKeys.Name) ||
    equals(name, OutputKeys.Properties) ||
    equals(name, OutputKeys.PathParameters)
  ) {
    propertyPath = '';
  } else {
    propertyPath = convertPathToBracketsFormat(name, optional);
  }

  // NOTE: If the token is inside array, instead of serialize to the wrong definition, we serialize to item() for now.
  // TODO: Need to have a full story for showing/hiding tokens that represent item().
  if (arrayDetails) {
    if (arrayDetails.loopSource) {
      return `@items(${convertToStringLiteral(arrayDetails.loopSource)})${propertyPath}`;
    } else {
      return `${Constants.ITEM}${propertyPath}`;
    }
  }

  let expressionValue: string;
  const propertyInQueries = !!source && equals(source, OutputSource.Queries);
  const propertyInHeaders = !!source && equals(source, OutputSource.Headers);
  const propertyInOutputs = !!source && equals(source, OutputSource.Outputs);
  const propertyInStatusCode = !!source && equals(source, OutputSource.StatusCode);

  if (!actionName) {
    if (propertyInQueries) {
      expressionValue = `${Constants.TRIGGER_QUERIES_OUTPUT}${propertyPath}`;
    } else if (propertyInHeaders) {
      expressionValue = `${Constants.TRIGGER_HEADERS_OUTPUT}${propertyPath}`;
    } else if (propertyInStatusCode) {
      expressionValue = `${Constants.TRIGGER_OUTPUTS_OUTPUT}['${Constants.OUTPUT_LOCATIONS.STATUS_CODE}']`;
    } else if (propertyInOutputs) {
      if (equals(name, OutputKeys.PathParameters) || includes(key, OutputKeys.PathParameters)) {
        expressionValue = `${Constants.TRIGGER_OUTPUTS_OUTPUT}['${Constants.OUTPUT_LOCATIONS.RELATIVE_PATH_PARAMETERS}']${propertyPath}`;
      } else {
        expressionValue = `${Constants.TRIGGER_OUTPUTS_OUTPUT}${propertyPath}`;
      }
    } else {
      expressionValue = `${Constants.TRIGGER_BODY_OUTPUT}${propertyPath}`;
    }
  } else {
    // Note: We escape the characters in step name to convert it to string literal for generating the expression.
    const stepName = convertToStringLiteral(actionName);
    if (propertyInQueries) {
      expressionValue = `${Constants.OUTPUTS}(${stepName})['${Constants.OUTPUT_LOCATIONS.QUERIES}']${propertyPath}`;
    } else if (propertyInHeaders) {
      expressionValue = `${Constants.OUTPUTS}(${stepName})['${Constants.OUTPUT_LOCATIONS.HEADERS}']${propertyPath}`;
    } else if (propertyInStatusCode) {
      expressionValue = `${Constants.OUTPUTS}(${stepName})['${Constants.OUTPUT_LOCATIONS.STATUS_CODE}']`;
    } else if (propertyInOutputs) {
      expressionValue = `${Constants.OUTPUTS}(${stepName})${propertyPath}`;
    } else {
      expressionValue = `${Constants.OUTPUT_LOCATIONS.BODY}(${stepName})${propertyPath}`;
    }
  }

  return expressionValue;
}

export function convertPathToBracketsFormat(path: string, optional: boolean): string {
  const pathSegments = path.split('.');

  const value = pathSegments
    .map((pathSegment) => {
      const propertyStartsWithOptional = startsWith(pathSegment, '?');
      const pathSegmentValue = propertyStartsWithOptional ? pathSegment.substr(1) : pathSegment;
      const optionalQuestionMark = optional ? '?' : '';
      return `${optionalQuestionMark}[${convertToStringLiteral(decodePropertySegment(pathSegmentValue))}]`;
    })
    .join('');

  return optional && !startsWith(value, '?') ? `?${value}` : value;
}

function getPreservedValue(parameter: InputParameter): any {
  return shouldUseCsvValue(parameter) && Array.isArray(parameter.value)
    ? parameter.value.join(Constants.RECURRENCE_TITLE_JOIN_SEPARATOR)
    : parameter.value;
}

function shouldUseCsvValue(parameter: InputParameter): boolean {
  return !!parameter.editorOptions && !!parameter.editorOptions.csvValue;
}

export function loadParameterValuesFromDefault(inputParameters: Record<string, InputParameter>): void {
  for (const indexKey of Object.keys(inputParameters)) {
    const inputParameter = inputParameters[indexKey];
    if (inputParameter.default !== undefined) {
      inputParameter.value = inputParameter.default;
    }
  }
}

export function updateParameterWithValues(
  parameterKey: string,
  parameterValue: any,
  parameterLocation: string,
  availableInputParameters: InputParameter[],
  createInvisibleParameter = true,
  useDefault = true
): InputParameter[] {
  const parameters: InputParameter[] = [];
  let inputParameter = first((parameter) => parameter.key === parameterKey, availableInputParameters);

  const clonedParameterValue =
    typeof parameterValue === 'object' && !Array.isArray(parameterValue) ? clone(parameterValue) : parameterValue;

  if (isNullOrUndefined(clonedParameterValue) && useDefault) {
    // assign the default value to input parameter
    parameters.push(...availableInputParameters.map((parameter) => transformInputParameter(parameter, parameter.default)));
  } else {
    if (Array.isArray(clonedParameterValue) && clonedParameterValue.length !== 1 && inputParameter) {
      // if inputParameter type is array, and the value is also array, but it contains more than one item
      // just assign the array value to input directly
      parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
    } else {
      const keySegments = parseEx(parameterKey);
      const descendantInputParameters = availableInputParameters.filter((item) => isAncestorKey(item.key, parameterKey));

      if (descendantInputParameters.length > 0) {
        if (isNullOrUndefined(clonedParameterValue)) {
          parameters.push(
            ...descendantInputParameters.map((parameter) => transformInputParameter(parameter, /* parameterValue */ undefined))
          );
        } else {
          const valueExpandable =
            isObject(clonedParameterValue) || (Array.isArray(clonedParameterValue) && clonedParameterValue.length === 1);
          if (valueExpandable) {
            for (const descendantInputParameter of descendantInputParameters) {
              const extraSegments = getExtraSegments(descendantInputParameter.key, parameterKey);
              const descendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, extraSegments);
              let alternativeParameterKeyExtraSegment: Segment[] | null = null;

              if (descendantInputParameter.alternativeKey) {
                alternativeParameterKeyExtraSegment = getExtraSegments(descendantInputParameter.alternativeKey, parameterKey);
                const alternativeParameterKeyDescendantValue = getPropertyValueWithSpecifiedPathSegments(
                  clonedParameterValue,
                  alternativeParameterKeyExtraSegment
                );
                if (alternativeParameterKeyDescendantValue !== descendantValue) {
                  throw new ValidationException(
                    ValidationErrorCode.UNSPECIFIED,
                    format(
                      "The value '{0}' in '{1}' section and value '{2}' in '{3}' section should match.",
                      descendantValue,
                      descendantInputParameter.key.replace('$.', ''),
                      alternativeParameterKeyDescendantValue,
                      descendantInputParameter.alternativeKey.replace('$.', '')
                    )
                  );
                }
              }

              parameters.push(transformInputParameter(descendantInputParameter, descendantValue, /* invisible */ false));
              deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, extraSegments);
              if (alternativeParameterKeyExtraSegment) {
                deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, alternativeParameterKeyExtraSegment);
              }
            }

            // for the rest properties, create corresponding invisible parameter to preserve the value when serialize
            if (createInvisibleParameter) {
              for (const restPropertyName of Object.keys(clonedParameterValue)) {
                const propertyValue = clonedParameterValue[restPropertyName];
                if (propertyValue !== undefined) {
                  const childKeySegments = [...keySegments, { value: restPropertyName, type: SegmentType.Property }];
                  const restInputParameter: ResolvedParameter = {
                    key: createEx(childKeySegments) as string,
                    name: restPropertyName,
                    type: Constants.SWAGGER.TYPE.ANY,
                    in: parameterLocation,
                    required: false,
                    isUnknown: true,
                  };

                  parameters.push(transformInputParameter(restInputParameter, propertyValue, /* invisible */ false));
                }
              }
            }
          } else {
            // NOTE: the value is not expandable, we should create a raw input for the specified parameterKey
            // if the input parameter is not exist, then create the corresponding input parameter with specified key
            if (inputParameter) {
              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            } else {
              const segments = parseEx(parameterKey);
              const lastSegment = segments[segments.length - 1];
              const required = descendantInputParameters.some((item) => item.required);
              let name: string = lastSegment.value as string;
              let summary = name;

              if (lastSegment.value === '$' && lastSegment.type === SegmentType.Property) {
                name = parameterLocation;
                summary = 'Raw inputs';
              }

              inputParameter = {
                key: parameterKey,
                name,
                type: Constants.SWAGGER.TYPE.OBJECT,
                summary,
                in: parameterLocation,
                required,
              };

              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            }
          }
        }
      } else {
        let invisible = false;
        if (!inputParameter && createInvisibleParameter) {
          invisible = true;
        }

        if (inputParameter) {
          parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
        } else {
          const segments = parseEx(parameterKey);
          const lastSegment = segments[segments.length - 1];
          if (
            lastSegment.value === '$' &&
            lastSegment.type === SegmentType.Property &&
            typeof clonedParameterValue === Constants.SWAGGER.TYPE.OBJECT &&
            Object.keys(clonedParameterValue).length > 0
          ) {
            // expand the object
            for (const propertyName of Object.keys(clonedParameterValue)) {
              const childInputParameter = {
                key: createEx([...segments, { type: SegmentType.Property, value: propertyName }]) as string,
                name: propertyName,
                type: Constants.SWAGGER.TYPE.ANY,
                in: parameterLocation,
                required: false,
              };

              parameters.push(transformInputParameter(childInputParameter, clonedParameterValue[propertyName], invisible));
            }
          } else {
            inputParameter = {
              key: parameterKey,
              name: lastSegment.value as string,
              type: Constants.SWAGGER.TYPE.ANY,
              in: parameterLocation,
              required: false,
            };

            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
          }
        }
      }
    }
  }

  return parameters;
}

function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive = false): any {
  if (segments.length === 0) {
    return value;
  }

  if (typeof value !== 'object' && !Array.isArray(value)) {
    return undefined;
  }

  const cloneSegments = [...segments];
  const firstSegment = cloneSegments.shift();
  const propertyName = getAndEscapeSegment(firstSegment as Segment);

  let propertyValue: any;
  if (typeof propertyName === 'string') {
    propertyValue = caseSensitive ? value[propertyName] : getPropertyValue(value, propertyName);
  } else {
    propertyValue = value[propertyName];
  }
  return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive = false) {
  let reachEnd = true;
  const cloneSegments = [...segments];
  while (cloneSegments.length > 0) {
    const deleteValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    if (deleteValue === undefined) {
      break;
    }

    const lastSegment = cloneSegments.pop();
    const parentValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    let propertyName = getAndEscapeSegment(lastSegment as Segment);
    if (!caseSensitive && typeof parentValue === 'object' && typeof propertyName === 'string') {
      for (const key of Object.keys(parentValue)) {
        if (equals(key, propertyName)) {
          propertyName = key;
          break;
        }
      }
    }

    if (reachEnd) {
      reachEnd = false;
      delete parentValue[propertyName];
    } else {
      let ableDelete = true;
      if (typeof deleteValue === 'object' && Object.keys(deleteValue).some((key) => deleteValue[key] !== undefined)) {
        ableDelete = false;
      } else if (Array.isArray(deleteValue) && deleteValue.some((item) => item !== undefined)) {
        ableDelete = false;
      }

      if (ableDelete) {
        delete parentValue[propertyName];
      }
    }
  }
}

export function getAndEscapeSegment(segment: Segment): string | number {
  // NOTE: for property segment, return the property name as key; for index segment, return the index value or 0
  switch (segment.type) {
    case SegmentType.Property:
      return tryConvertStringToExpression(decodePropertySegment(segment.value as string));
    case SegmentType.Index:
      return segment.value || 0;
    default:
      return segment.value as string | number;
  }
}

/**
 * Converts the value to a string that will be evaluated to the original value at runtime.
 * @arg {string} value - The value that the returned string will be evaluated to.
 * @return {string}
 */
export function tryConvertStringToExpression(value: string): string {
  if (isTemplateExpression(value)) {
    if (value.charAt(0) === '@') {
      return `@${value}`;
    } else {
      return value.replace(/@{/g, '@@{');
    }
  } else {
    return value;
  }
}

function getExtraSegments(key: string, ancestorKey: string): Segment[] {
  let childSegments: Segment[] = [];
  let startIndex = 0;

  if (key && ancestorKey) {
    childSegments = parseEx(key);
    const ancestorSegments = parseEx(ancestorKey);
    let ancestorStartIndex = 0;
    if (ancestorSegments.length < childSegments.length) {
      for (startIndex = 0; startIndex < childSegments.length; startIndex++) {
        const childSegment = childSegments[startIndex];
        const ancestorSegment = ancestorSegments[ancestorStartIndex];
        if (childSegment.type === SegmentType.Property && childSegment.value === ancestorSegment.value) {
          ancestorStartIndex++;
        }
        if (ancestorStartIndex === ancestorSegments.length) {
          startIndex++;
          break;
        }
      }
    }
  }

  return childSegments.slice(startIndex);
}

export function transformInputParameter(inputParameter: InputParameter, parameterValue: any, invisible = false): InputParameter {
  return { ...inputParameter, hideInUI: invisible, value: parameterValue };
}

/**
 * Check whether the specified value is compatiable with provided schema
 * @arg {any} value - The specified value.
 * @arg {any} schema - The provided schema. If isArray is true, it is the array's item schema, otherwise, it's the object schema
 * @arg {boolean} isArray - The flag to check for an array value.
 * @arg {boolean} shallowArrayCheck - The flag to indicate whether the checking is shallow check only or dive into property or nested item.
 * @return {boolean} - Return true if the value match the schema, otherwise return false.
 */
export function isArrayOrObjectValueCompatibleWithSchema(value: any, schema: any, isArray: boolean, shallowArrayCheck = false): boolean {
  if (isNullOrUndefined(schema)) {
    return false;
  } else if (isNullOrUndefined(value)) {
    return true;
  }

  if (isArray) {
    if (shallowArrayCheck) {
      return Array.isArray(value);
    } else if (!Array.isArray(value)) {
      return false;
    }
  } else if (typeof value !== 'object') {
    return false;
  } else if (!isArray && !Array.isArray(value) && schema.type === Constants.SWAGGER.TYPE.OBJECT && schema.properties === undefined) {
    // NOTE: for schema.additionalProperties as boolean value case, it just ignore the checking and return true.
    if (schema.additionalProperties && schema.additionalProperties.type) {
      return Object.keys(value).every(
        (key) =>
          (typeof value[key] === 'string' && isTemplateExpression(value[key])) ||
          (schema.additionalProperties.type !== 'object' && typeof value[key] === schema.additionalProperties.type) ||
          (schema.additionalProperties.type === 'object' && isObject(value[key])) ||
          (schema.additionalProperties.type === 'array' && Array.isArray(value[key]))
      );
    }

    return true;
  }

  const schemaProcessorOptions: SchemaProcessorOptions = {
    isInputSchema: true,
    expandArrayOutputs: true,
    expandArrayOutputsDepth: Constants.MAX_EXPAND_ARRAY_DEPTH,
    excludeAdvanced: false,
    excludeInternal: false,
  };

  let inputs: SchemaProperty[];
  const schemaWithEscapedProperties = { ...schema };

  if (schema.type === Constants.SWAGGER.TYPE.ARRAY) {
    if (schema.itemSchema && schema.itemSchema.properties) {
      schemaWithEscapedProperties.itemSchema = {
        ...schemaWithEscapedProperties.itemSchema,
        properties: escapeSchemaProperties(schema.itemSchema.properties),
      };
    }
  } else if (schema.type === Constants.SWAGGER.TYPE.OBJECT && schema.properties) {
    schemaWithEscapedProperties.properties = { ...escapeSchemaProperties(schema.properties) };
  }

  try {
    inputs = new SchemaProcessor(schemaProcessorOptions).getSchemaProperties(schemaWithEscapedProperties);
  } catch {
    return false;
  }

  if (isArray) {
    // NOTE: for simple primitive array, check whether the value type is same as the designated type or string type (expression)
    if ((value as any[]).every((item) => typeof item !== 'object')) {
      return inputs.length === 1 && (value as any[]).every((item) => typeof item === inputs[0].type || isTemplateExpression(item));
    }
  }

  const copyValue = isArray ? [...value] : value;
  let isCompatible = true;
  let itemValue = isArray ? copyValue.shift() : copyValue;
  const inputKeys = inputs.map((input) => input.name);
  let itemInput: SchemaProperty | undefined;
  const rootItemKey = createEx([
    { type: SegmentType.Property, value: DefaultKeyPrefix },
    { type: SegmentType.Index, value: undefined },
  ]);
  if (schema.type === Constants.SWAGGER.TYPE.ARRAY) {
    itemInput = first((item) => item.key === rootItemKey, inputs);
  }

  while (itemValue && isCompatible) {
    // if itemValue is referring to primitive array
    if (
      itemInput &&
      itemInput.type !== Constants.SWAGGER.TYPE.ARRAY &&
      itemInput.type !== Constants.SWAGGER.TYPE.OBJECT &&
      !shallowArrayCheck
    ) {
      isCompatible =
        Array.isArray(itemValue) && (itemValue as any[]).every((item) => typeof item === itemInput?.type || typeof item === 'string');
    } else {
      const valueKeys = Object.keys(itemValue).map((key) => encodePropertySegment(key));
      if (valueKeys.length > inputKeys.length) {
        isCompatible = false;
        break;
      }

      for (const valueKey of valueKeys) {
        const propertyValue = itemValue[valueKey];
        const propertySchema =
          schema.type === Constants.SWAGGER.TYPE.ARRAY ? schema.items : schema['properties'] && schema['properties'][valueKey];
        // NOTE: if the property value is array or object, check the value/schema compatibility recursively
        if (Array.isArray(propertyValue) && !shallowArrayCheck) {
          if (
            !isArrayOrObjectValueCompatibleWithSchema(
              propertyValue,
              propertySchema && propertySchema.items,
              /* isArray */ true,
              shallowArrayCheck
            )
          ) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (isObject(propertyValue)) {
          if (!isArrayOrObjectValueCompatibleWithSchema(propertyValue, propertySchema, /* isArray */ false, shallowArrayCheck)) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (inputKeys.indexOf(valueKey) < 0) {
          isCompatible = false;
          break;
        }
      }
    }

    itemValue = isArray ? copyValue.shift() : undefined;
  }

  return isCompatible;
}

export async function updateParameterAndDependencies(
  nodeId: string,
  groupId: string,
  parameterId: string,
  properties: Partial<ParameterInfo>,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  nodeInputs: NodeInputs,
  dependencies: NodeDependencies,
  variables: VariableDeclaration[],
  settings: Settings,
  dispatch: Dispatch,
  operationDefinition?: any
): Promise<void> {
  const parameter = nodeInputs.parameterGroups[groupId].parameters.find((param) => param.id === parameterId) ?? {};
  const updatedParameter = { ...parameter, ...properties } as ParameterInfo;

  const parametersToUpdate = [
    {
      groupId,
      parameterId,
      propertiesToUpdate: properties,
    },
  ];
  const payload: UpdateParametersPayload = {
    nodeId,
    parameters: parametersToUpdate,
  };

  const dependenciesToUpdate = getDependenciesToUpdate(dependencies, parameterId, updatedParameter);
  if (dependenciesToUpdate) {
    payload.dependencies = dependenciesToUpdate;

    const inputDependencies = dependenciesToUpdate.inputs;
    for (const key of Object.keys(inputDependencies)) {
      if (inputDependencies[key].dependencyType === 'ListValues' && inputDependencies[key].dependentParameters[parameterId]) {
        const dependentParameter = nodeInputs.parameterGroups[groupId].parameters.find(
          (param) => param.parameterKey === key
        ) as ParameterInfo;
        payload.parameters.push({
          groupId,
          parameterId: dependentParameter.id,
          propertiesToUpdate: {
            dynamicData: { status: DynamicCallStatus.NOTSTARTED },
            editorOptions: { options: [] },
          },
        });
      }
    }
  }

  dispatch(updateNodeParameters(payload));

  if (dependenciesToUpdate) {
    loadDynamicData(
      nodeId,
      isTrigger,
      operationInfo,
      connectionReference,
      dependenciesToUpdate,
      updateNodeInputsWithParameter(nodeInputs, parameterId, groupId, properties),
      settings,
      variables,
      dispatch,
      operationDefinition
    );
  }
}

function getDependenciesToUpdate(
  dependencies: NodeDependencies,
  parameterId: string,
  updatedParameter: ParameterInfo
): NodeDependencies | undefined {
  let dependenciesToUpdate: NodeDependencies | undefined;

  // TODO - Add a method to properly validate parameter's value with its type.
  const hasParameterValue = parameterHasValue(updatedParameter);
  const isParameterValidForDynamicCall = parameterValidForDynamicCall(updatedParameter);

  for (const inputKey of Object.keys(dependencies.inputs)) {
    if (dependencies.inputs[inputKey].dependentParameters[parameterId]) {
      if (!dependenciesToUpdate) {
        dependenciesToUpdate = { inputs: {}, outputs: {} };
      }

      dependenciesToUpdate.inputs[inputKey] = clone(dependencies.inputs[inputKey]);
      dependenciesToUpdate.inputs[inputKey].dependentParameters[parameterId].isValid =
        dependencies.inputs[inputKey].dependencyType === 'StaticSchema' ? hasParameterValue : isParameterValidForDynamicCall;
    }
  }

  for (const outputKey of Object.keys(dependencies.outputs)) {
    if (dependencies.outputs[outputKey].dependentParameters[parameterId]) {
      if (!dependenciesToUpdate) {
        dependenciesToUpdate = { inputs: {}, outputs: {} };
      }

      dependenciesToUpdate.outputs[outputKey] = clone(dependencies.outputs[outputKey]);
      dependenciesToUpdate.outputs[outputKey].dependentParameters[parameterId].isValid =
        dependencies.outputs[outputKey].dependencyType === 'StaticSchema' ? hasParameterValue : isParameterValidForDynamicCall;
    }
  }

  return dependenciesToUpdate;
}

export async function loadDynamicData(
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  dependencies: NodeDependencies,
  nodeInputs: NodeInputs,
  settings: Settings,
  variables: VariableDeclaration[],
  dispatch: Dispatch,
  operationDefinition?: any
): Promise<void> {
  if (Object.keys(dependencies.outputs).length) {
    loadDynamicOutputsInNode(nodeId, isTrigger, operationInfo, connectionReference, dependencies.outputs, nodeInputs, settings, dispatch);
  }

  if (Object.keys(dependencies.inputs).length) {
    loadDynamicContentForInputsInNode(
      nodeId,
      dependencies.inputs,
      operationInfo,
      connectionReference,
      nodeInputs,
      variables,
      dispatch,
      operationDefinition
    );
  }
}

async function loadDynamicContentForInputsInNode(
  nodeId: string,
  inputDependencies: Record<string, DependencyInfo>,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  allInputs: NodeInputs,
  variables: VariableDeclaration[],
  dispatch: Dispatch,
  operationDefinition?: any
): Promise<void> {
  for (const inputKey of Object.keys(inputDependencies)) {
    const info = inputDependencies[inputKey];
    if (info.dependencyType === 'ApiSchema') {
      dispatch(clearDynamicInputs(nodeId));

      if (isDynamicDataReadyToLoad(info)) {
        const inputSchema = await getDynamicSchema(info, allInputs, operationInfo, connectionReference, variables);
        const allInputParameters = getAllInputParameters(allInputs);
        const allInputKeys = allInputParameters.map((param) => param.parameterKey);
        const schemaInputs = inputSchema
          ? await getDynamicInputsFromSchema(
              inputSchema,
              info.parameter as InputParameter,
              operationInfo,
              allInputKeys,
              operationDefinition
            )
          : [];
        const inputParameters = schemaInputs.map((input) => ({
          ...createParameterInfo(input),
          schema: input,
        })) as ParameterInfo[];
        // TODO - Initialize Editor View for dynamic inputs
        dispatch(addDynamicInputs({ nodeId, groupId: ParameterGroupKeys.DEFAULT, inputs: inputParameters }));
      }
    }
  }
}

export async function loadDynamicValuesForParameter(
  nodeId: string,
  groupId: string,
  parameterId: string,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  nodeInputs: NodeInputs,
  dependencies: NodeDependencies,
  dispatch: Dispatch
): Promise<void> {
  const groupParameters = nodeInputs.parameterGroups[groupId].parameters;
  const parameter = groupParameters.find((parameter) => parameter.id === parameterId) as ParameterInfo;
  if (!parameter) {
    return;
  }

  const dependencyInfo = dependencies.inputs[parameter.parameterKey];
  if (dependencyInfo) {
    if (isDynamicDataReadyToLoad(dependencyInfo)) {
      dispatch(
        updateNodeParameters({
          nodeId,
          parameters: [
            {
              parameterId,
              groupId,
              propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.STARTED }, editorOptions: { options: [] } },
            },
          ],
        })
      );

      try {
        const dynamicValues = await getDynamicValues(dependencyInfo, nodeInputs, operationInfo, connectionReference);

        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.SUCCEEDED }, editorOptions: { options: dynamicValues } },
              },
            ],
          })
        );
      } catch (error) {
        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.FAILED, error: error as Exception } },
              },
            ],
          })
        );
      }
    } else {
      const intl = getIntl();
      const invalidParameterNames = Object.keys(dependencyInfo.dependentParameters)
        .filter((key) => !dependencyInfo.dependentParameters[key].isValid)
        .map((id) => groupParameters.find((param) => param.id === id)?.parameterName);

      dispatch(
        updateNodeParameters({
          nodeId,
          parameters: [
            {
              parameterId,
              groupId,
              propertiesToUpdate: {
                dynamicData: {
                  error: {
                    name: 'DynamicListFailed',
                    message: intl.formatMessage(
                      {
                        defaultMessage: 'Required parameters {parameters} not set or invalid',
                        description: 'Error message to show when required parameters are not set or invalid',
                      },
                      { parameters: `${invalidParameterNames.join(' , ')}` }
                    ),
                  },
                  status: DynamicCallStatus.FAILED,
                },
              },
            },
          ],
        })
      );
    }
  }
}

export function shouldLoadDynamicInputs(nodeInputs: NodeInputs): boolean {
  return nodeInputs.dynamicLoadStatus === DynamicLoadStatus.FAILED || nodeInputs.dynamicLoadStatus === DynamicLoadStatus.NOTSTARTED;
}

export function isDynamicDataReadyToLoad({ dependentParameters }: DependencyInfo): boolean {
  return Object.keys(dependentParameters).every((key) => dependentParameters[key].isValid);
}

function getStringifiedValueFromEditorViewModel(parameter: ParameterInfo, isDefinitionValue: boolean): string | undefined {
  const { editor, editorOptions, editorViewModel } = parameter;
  switch (editor?.toLowerCase()) {
    case Constants.EDITOR.TABLE:
      if (editorViewModel?.columnMode === ColumnMode.Custom && editorOptions?.columns) {
        const { keys, types } = editorOptions.columns;
        const value: any = [];
        const commonProperties = { supressCasting: parameter.suppressCasting, info: parameter.info };

        // We do not parse here, since the type is string for table columns [assumed currently may change later]
        for (const item of editorViewModel.items) {
          const keyValue = parameterValueToString({ type: types[0], value: item.key, ...commonProperties } as any, isDefinitionValue);
          const valueValue = parameterValueToString({ type: types[1], value: item.value, ...commonProperties } as any, isDefinitionValue);

          if (keyValue || valueValue) {
            value.push({ [keys[0]]: keyValue, [keys[1]]: valueValue });
          }
        }

        return JSON.stringify(value);
      }
      return undefined;
    default:
      return undefined;
  }
}

function updateNodeInputsWithParameter(
  nodeInputs: NodeInputs,
  parameterId: string,
  groupId: string,
  properties: Partial<ParameterInfo>
): NodeInputs {
  const inputs = clone(nodeInputs);
  const parameterGroup = inputs.parameterGroups[groupId];
  const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
  if (index > -1) {
    parameterGroup.parameters[index] = { ...parameterGroup.parameters[index], ...properties };
  }

  return inputs;
}

export function getParameterFromName(nodeInputs: NodeInputs, parameterName: string): ParameterInfo | undefined {
  for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
    const parameterGroup = nodeInputs.parameterGroups[groupId];
    const parameter = parameterGroup.parameters.find((parameter) => parameter.parameterName === parameterName);
    if (parameter) {
      return parameter;
    }
  }

  return undefined;
}

export function parameterHasValue(parameter: ParameterInfo): boolean {
  const value = parameter.value;

  if (!isNullOrUndefined(parameter.preservedValue)) {
    return true;
  }

  return !!value && !!value.length && value.some((segment) => !!segment.value);
}

export function parameterValidForDynamicCall(parameter: ParameterInfo): boolean {
  const hasTokenSegment = parameter.value.some((segment) => segment.type === ValueSegmentType.TOKEN);
  return parameter.required ? parameterHasValue(parameter) && !hasTokenSegment : !hasTokenSegment;
}

export function getGroupAndParameterFromParameterKey(
  nodeInputs: NodeInputs,
  parameterKey: string
): { groupId: string; parameter: ParameterInfo } | undefined {
  for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
    const parameter = nodeInputs.parameterGroups[groupId].parameters.find((param) => param.parameterKey === parameterKey);
    if (parameter) {
      return { groupId, parameter };
    }
  }

  return undefined;
}

export function getInputsValueFromDefinitionForManifest(inputsLocation: string[], stepDefinition: any): any {
  let inputsValue = stepDefinition;

  for (const property of inputsLocation) {
    // NOTE: Currently this only supports single item array. Might need to be updated when multiple array support operations are added.
    // None right now in any connectors.
    inputsValue = property === '[*]' ? inputsValue[0] : getPropertyValue(inputsValue, property);
  }

  return inputsValue;
}

export function escapeSchemaProperties(schemaProperties: Record<string, any>): Record<string, any> {
  const escapedSchemaProperties: Record<string, any> = {};

  for (const propertyName of Object.keys(schemaProperties)) {
    const escapedPropertyName = tryConvertStringToExpression(propertyName);
    escapedSchemaProperties[escapedPropertyName] = schemaProperties[propertyName];
  }

  return escapedSchemaProperties;
}

export function getNormalizedName(name: string): string {
  if (!name) {
    return name;
  }

  // Replace occurrences of ?[ from the name.
  let normalizedName = name.replace(/\?\[/g, '');

  // Replace occurrences of ?. from the name.
  normalizedName = normalizedName.replace(/\?\./g, '');

  // Replace occurrences of [ ] ' . from the name.
  // eslint-disable-next-line no-useless-escape
  normalizedName = normalizedName.replace(/[\['\]\.]/g, '');

  return normalizedName || name;
}

export function getRepetitionReference(repetitionContext: RepetitionContext, actionName?: string): RepetitionReference | undefined {
  if (actionName) {
    return first((item) => equals(item.actionName, actionName), repetitionContext.repetitionReferences);
  } else {
    return getClosestRepetitionReference(repetitionContext);
  }
}

function getClosestRepetitionReference(repetitionContext: RepetitionContext): RepetitionReference | undefined {
  if (repetitionContext && repetitionContext.repetitionReferences && repetitionContext.repetitionReferences.length) {
    return repetitionContext.repetitionReferences[0];
  }

  return undefined;
}

export function updateTokenMetadata(
  valueSegment: ValueSegment,
  actionNodes: Record<string, string>,
  triggerNodeId: string,
  nodes: Record<string, NodeDataWithOperationMetadata>,
  operations: Actions,
  parameterType?: string
): ValueSegment {
  const token = valueSegment.token as SegmentToken;

  switch (token?.tokenType) {
    case TokenType.PARAMETER:
      token.brandColor = '#916F6F';
      token.icon = ParameterIcon;
      // TODO - Update type correctly when workflow parameters are implemented.
      token.type = 'string';
      return valueSegment;

    case TokenType.FX:
      token.brandColor = '#AD008C';
      token.icon = FxIcon;
      token.title = getExpressionTokenTitle(token.expression as Expression);
      return valueSegment;

    case TokenType.ITERATIONINDEX:
      // TODO - Need implementation for loops
      break;
    default:
      break;
  }

  const { name, actionName, arrayDetails } = valueSegment.token as SegmentToken;
  const tokenNodeId = actionName ? getPropertyValue(actionNodes, actionName) : triggerNodeId;

  if (arrayDetails?.loopSource) {
    // TODO - Item token details
  }

  const { settings, nodeOutputs, brandColor: nodeBrandColor, iconUri: nodeIconUri } = nodes[tokenNodeId];
  const tokenNodeOperation = operations[tokenNodeId];
  const nodeType = tokenNodeOperation?.type;
  const isSecure = hasSecureOutputs(nodeType, settings ?? {});
  const nodeOutputInfo = getOutputByTokenInfo(unmap(nodeOutputs.outputs), valueSegment.token as SegmentToken, parameterType);

  const brandColor = token.tokenType === TokenType.ITEM ? '#486991' : nodeBrandColor;

  const iconUri =
    token.tokenType === TokenType.ITEM
      ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg=='
      : nodeIconUri;

  // TODO - Code to get parent array name for item tokens.

  // If we do not get any nodeOutputInfo, we need to check if it is a body parameter, compose parameter, or not
  if (!nodeOutputInfo) {
    if (!name) {
      token.title = 'Body';
    } else if (equals(nodeType, Constants.NODE.TYPE.COMPOSE)) {
      token.title = 'Outputs';
    } else if (token.tokenType === TokenType.ITEM) {
      // TODO: Remove this and other parts in this method when the Feature flag (foreach tokens) is removed.
      token.title = 'Current item';
      token.type = Constants.SWAGGER.TYPE.ANY;
    } else {
      token.title = getTitleFromTokenName(name, '');
    }
  } else {
    if (!nodeOutputInfo.title && name) {
      token.title = getTitleFromTokenName(name, nodeOutputInfo.parentArray as string);
    } else {
      token.title = nodeOutputInfo.title;
    }

    token.key = nodeOutputInfo.key;
    token.type = nodeOutputInfo.type;
    token.format = nodeOutputInfo.format;
    token.name = nodeOutputInfo.name;
    token.description = nodeOutputInfo.description;
    token.required = token.required !== undefined ? token.required : nodeOutputInfo.required;

    if (arrayDetails) {
      token.arrayDetails = {
        ...token.arrayDetails,
        parentArrayName: nodeOutputInfo.parentArray,
        itemSchema: nodeOutputInfo.itemSchema,
      };
    }

    if (!!nodeOutputInfo.parentArray && valueSegment.token?.arrayDetails && !valueSegment.token.arrayDetails.loopSource) {
      // TODO - Update parent array and loop source in case of foreach or item tokens
    }
  }

  token.icon = iconUri;
  token.brandColor = brandColor;
  token.isSecure = isSecure;

  return valueSegment;
}

export function getExpressionTokenTitle(expression: Expression): string {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return (expression as ExpressionLiteral).value;
    case ExpressionType.Function:
      // eslint-disable-next-line no-case-declarations
      const functionExpression = expression as ExpressionFunction;
      return `${functionExpression.name}(${functionExpression.arguments.length > 0 ? '...' : ''})`;
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}

function getOutputByTokenInfo(
  nodeOutputs: OutputInfo[],
  tokenInfo: SegmentToken,
  type = Constants.SWAGGER.TYPE.ANY
): OutputInfo | undefined {
  const { name, arrayDetails } = tokenInfo;

  if (!name) {
    return undefined;
  }

  const supportedTypes: string[] = getPropertyValue(Constants.TOKENS, type);
  const allOutputs = supportedTypes.map((supportedType) => getOutputsByType(nodeOutputs, supportedType));
  const outputs = aggregate(allOutputs);

  if (!outputs) {
    return undefined;
  }

  const normalizedTokenName = decodePropertySegment(getNormalizedTokenName(name));
  for (const output of outputs) {
    const bothNotInArray = !arrayDetails && !output.isInsideArray;
    const sameArray = equals(getNormalizedName(arrayDetails?.parentArrayName || ''), getNormalizedName(output.parentArray || ''));
    const sameName = decodePropertySegment(getNormalizedTokenName(output.name)) === normalizedTokenName;
    // Optional outputs end up getting ? added to their name. This should be stripped out on alias comparison.
    if (sameName && (sameArray || bothNotInArray)) {
      return output;
    }

    if (isOutputToken(tokenInfo)) {
      if (output.key === tokenInfo.key) {
        return output;
      }
    }
  }

  return undefined;
}

function getOutputsByType(allOutputs: OutputInfo[], type = Constants.SWAGGER.TYPE.ANY): OutputInfo[] {
  if (type === Constants.SWAGGER.TYPE.ANY || type === Constants.SWAGGER.TYPE.OBJECT) {
    return allOutputs;
  }

  return allOutputs.filter((output) => equals(type, output.type));
}

export function getTitleFromTokenName(tokenName: string, parentArray: string, parentArrayTitle?: string): string {
  if (equals(tokenName, OutputKeys.Body)) {
    return 'Body';
  } else if (equals(tokenName, OutputKeys.Headers)) {
    return 'Headers';
  } else if (
    equals(tokenName, OutputKeys.Item) ||
    (!!parentArray && equals(tokenName, `${getNormalizedName(parentArray)}-${OutputKeys.Item}`))
  ) {
    let parentArrayDisplayName = parentArrayTitle;

    if (!parentArrayDisplayName) {
      const parentArrayName = parentArray && parentArray.match(/'(.*?)'/g);
      parentArrayDisplayName = parentArrayName ? parentArrayName.map((property) => property.replace(/'/g, '')).join('.') : undefined;
    }

    return parentArrayDisplayName ? format('{0} - Item', parentArrayDisplayName) : 'Item';
  } else if (equals(tokenName, OutputKeys.Outputs)) {
    return 'Outputs';
  } else if (equals(tokenName, OutputKeys.StatusCode)) {
    return 'Status Code';
  } else if (equals(tokenName, OutputKeys.Queries)) {
    return 'Queries';
  } else {
    // Remove all the '?' from token name.
    const tokenNameWithoutOptionalOperator = tokenName.replace(/\?/g, '');
    return tokenNameWithoutOptionalOperator
      .split('.')
      .map((segment) => decodePropertySegment(segment))
      .join('.');
  }
}

export function getNormalizedTokenName(tokenName: string): string {
  if (!tokenName) {
    return tokenName;
  }

  // Replace occurences of ? from the tokenName.
  return tokenName.replace(/\?/g, '');
}

// TODO - Add code to get correct repetition context to handle nested foreach and foreach scenarios
export function getRepetitionContext(_includeSelf?: boolean): RepetitionContext {
  const repetitionReferences: RepetitionReference[] = [];
  return {
    repetitionReferences,
  };
}

export function getRepetitionValue(manifest: OperationManifest, nodeInputs: ParameterInfo[]): any {
  const loopParameter = manifest.properties.repetition?.loopParameter;

  if (loopParameter) {
    const parameter = nodeInputs.find((input) => input.parameterName === loopParameter);
    return parameter ? parameter.value : undefined;
  }

  return undefined;
}

export function getInterpolatedExpression(expression: string, parameterType: string, parameterFormat: string): string {
  if (isUndefinedOrEmptyString(expression)) {
    return expression;
  } else if (parameterType === Constants.SWAGGER.TYPE.STRING && parameterFormat !== Constants.SWAGGER.FORMAT.BINARY) {
    return `@{${expression}}`;
  } else {
    return `@${expression}`;
  }
}

export function parameterValueToString(parameterInfo: ParameterInfo, isDefinitionValue: boolean): string | undefined {
  const preservedValue = parameterInfo.preservedValue;
  if (preservedValue !== undefined && isDefinitionValue) {
    switch (typeof preservedValue) {
      case 'string':
        return preservedValue;
      default:
        return JSON.stringify(preservedValue);
    }
  }

  const valueFromEditor = getStringifiedValueFromEditorViewModel(parameterInfo, isDefinitionValue);
  if (valueFromEditor !== undefined) {
    return valueFromEditor;
  }

  const parameter = { ...parameterInfo };
  const isPathParameter = parameter.info.in === ParameterLocations.Path;
  const value = parameter.value.filter((segment) => segment.value !== '');

  if (!value || !value.length) {
    if (isPathParameter && isDefinitionValue) {
      if (parameter.required) {
        return encodePathValueWithFunction("''", parameter.info.encode);
      } else {
        return '';
      }
    } else {
      return parameter.required ? '' : undefined;
    }
  }

  const parameterType = getInferredParameterType(value, parameter.type);
  const parameterFormat = parameter.info.format ?? '';
  const parameterSuppressesCasting = !!parameterInfo.suppressCasting;

  const shouldCast = requiresCast(parameterType, parameterFormat, value, parameterSuppressesCasting);
  if (!isPathParameter && shouldCast) {
    return castParameterValueToString(value, parameterFormat, parameterType);
  }

  if (
    parameterType === Constants.SWAGGER.TYPE.OBJECT ||
    parameterType === Constants.SWAGGER.TYPE.ARRAY ||
    (parameter.schema && parameter.schema['oneOf'])
  ) {
    return parameterValueToJSONString(value, /* applyCasting */ !parameterSuppressesCasting);
  }

  const segmentsAfterCasting = parameterInfo.suppressCasting ? value : castTokenSegmentsInValue(value, parameterType, parameterFormat);

  // Note: Path parameter values are always enclosed inside encodeComponent function if specified.
  if (isPathParameter && isDefinitionValue) {
    const segmentValues = segmentsAfterCasting.map((segment) => {
      if (!isTokenValueSegment(segment)) {
        return convertToStringLiteral(segment.value);
      } else {
        return segment.value;
      }
    });

    return encodePathValueWithFunction(fold(segmentValues, parameter.type) ?? '', parameter.info.encode);
  }

  const shouldInterpolate = value.length > 1;
  return segmentsAfterCasting
    .map((segment) => {
      let expressionValue = segment.value;
      if (isTokenValueSegment(segment)) {
        if (shouldInterpolate) {
          expressionValue = parameterType === Constants.SWAGGER.TYPE.STRING ? `@{${expressionValue}}` : `@${expressionValue}`;
        } else {
          if (!isUndefinedOrEmptyString(expressionValue)) {
            // Note: Token segment should be auto casted using interpolation if token type is
            // non string and referred in a string parameter.
            expressionValue =
              !parameterInfo.suppressCasting && parameterType === 'string' && segment.token?.type !== 'string'
                ? `@{${expressionValue}}`
                : `@${expressionValue}`;
          }
        }
      }

      return expressionValue;
    })
    .join('');
}

export function parameterValueToJSONString(parameterValue: ValueSegment[], applyCasting = true, forValidation = false): string {
  let shouldInterpolate = false,
    parameterValueString = '',
    numberOfDoubleQuotes = 0;
  const rawStringFormat = parameterValueToStringWithoutCasting(parameterValue, forValidation);
  const updatedParameterValue: ValueSegment[] = parameterValue.map((expression) => ({ ...expression }));

  // We return the raw stringified form, if value is not a valid json
  if (!isValidJSONObjectFormat(rawStringFormat) && !isValidJSONArrayFormat(rawStringFormat)) {
    return rawStringFormat;
  }

  for (let i = 0; i < updatedParameterValue.length; i++) {
    const expression = updatedParameterValue[i];
    let tokenExpression: string = expression.value;

    if (isTokenValueSegment(expression)) {
      // Note: Stringify the token expression to escape double quotes and other characters which must be escaped in JSON.
      if (shouldInterpolate) {
        if (applyCasting) {
          tokenExpression = addCastToExpression(
            expression.token?.format ?? '',
            '',
            tokenExpression,
            expression.token?.type,
            Constants.SWAGGER.TYPE.STRING
          );
        }

        const stringifiedTokenExpression = JSON.stringify(tokenExpression).slice(1, -1);
        tokenExpression = `@{${stringifiedTokenExpression}}`;
      } else {
        // Add quotes around tokens. Tokens directly after a literal need a leading quote, and those before another literal need an ending quote.
        const lastExpressionWasLiteral = i > 0 && updatedParameterValue[i - 1].type !== ValueSegmentType.TOKEN;
        const nextExpressionIsLiteral =
          i < updatedParameterValue.length - 1 && updatedParameterValue[i + 1].type !== ValueSegmentType.TOKEN;

        const stringifiedTokenExpression = JSON.stringify(tokenExpression).slice(1, -1);
        tokenExpression = `@${stringifiedTokenExpression}`;
        // eslint-disable-next-line no-useless-escape
        tokenExpression = lastExpressionWasLiteral ? `\"${tokenExpression}` : tokenExpression;
        // eslint-disable-next-line no-useless-escape
        tokenExpression = nextExpressionIsLiteral ? `${tokenExpression}\"` : `${tokenExpression}`;
      }

      parameterValueString += tokenExpression;
    } else {
      numberOfDoubleQuotes += (tokenExpression.replace(/\\"/g, '').match(/"/g) || []).length;

      shouldInterpolate = numberOfDoubleQuotes % 2 === 1;
      parameterValueString += expression.value;
    }
  }

  try {
    // This is to validate if this is a valid json, else we return the original raw stringified format to retain user input.
    const jsonValue = JSON.parse(parameterValueString);
    return JSON.stringify(jsonValue);
  } catch {
    return updatedParameterValue.length === 1 && isTokenValueSegment(updatedParameterValue[0]) ? parameterValueString : rawStringFormat;
  }
}

export function getJSONValueFromString(value: any, type: string): any {
  const canParse = !isNullOrUndefined(value);
  let parameterValue: any;

  if (canParse) {
    try {
      // The value is already a string. If the type is also a string, don't do any parsing
      if (type !== Constants.SWAGGER.TYPE.STRING) {
        parameterValue = JSON.parse(value);
      } else {
        parameterValue = value;
      }
    } catch {
      parameterValue = value;
    }
  }

  return parameterValue;
}

/**
 * @arg {ValueSegment[]} value
 * @arg {boolean} [forValidation=false]
 * @return {string}
 */
function parameterValueToStringWithoutCasting(value: ValueSegment[], forValidation = false): string {
  const shouldInterpolateTokens = value.length > 1 && value.some(isTokenValueSegment);

  return value
    .map((expression) => {
      let expressionValue = !forValidation ? expression.value : expression.value || null;
      if (isTokenValueSegment(expression)) {
        expressionValue = shouldInterpolateTokens ? `@{${expressionValue}}` : `@${expressionValue}`;
      }

      return expressionValue;
    })
    .join('');
}

function castParameterValueToString(value: ValueSegment[], parameterFormat: string, parameterType: string): string | undefined {
  // In case of only one token or only user entered text, we get the casting function from expression format.
  if (value.length === 1) {
    const [expression] = value;
    const { value: tokenExpression } = expression;
    const isTokenSegment = isTokenValueSegment(expression);
    const uncastExpression = isTokenSegment ? tokenExpression : `'${tokenExpression}'`;
    const valueType = expression.token?.type ?? '';
    const segmentFormat = expression.token?.format ?? '';
    const castExpression = addCastToExpression(segmentFormat, parameterFormat, uncastExpression, valueType, parameterType);

    return getInterpolatedExpression(castExpression, parameterType, parameterFormat);
  } else {
    // TODO: We might need to revisit adding encodeURIComponent if path parameters contains format
    return addFoldingCastToExpression(parameterFormat, value, parameterType, parameterFormat);
  }
}

function castTokenSegmentsInValue(parameterValue: ValueSegment[], parameterType: string, parameterFormat: string): ValueSegment[] {
  return parameterValue.map((segment) => {
    const newSegment = { ...segment };
    const segmentValue = newSegment.value;

    if (isOutputTokenValueSegment(segment)) {
      newSegment.value = addCastToExpression(
        segment.token?.format ?? '',
        parameterFormat,
        segmentValue,
        segment.token?.type,
        parameterType
      );
    }

    return newSegment;
  });
}

function requiresCast(
  parameterType: string,
  parameterFormat: string,
  parameterValue: ValueSegment[],
  parameterSuppressesCasting: boolean
): boolean {
  if (parameterSuppressesCasting) {
    return false;
  }

  const castFormats = [Constants.SWAGGER.FORMAT.BINARY, Constants.SWAGGER.FORMAT.BYTE, Constants.SWAGGER.FORMAT.DATAURI];

  if (castFormats.indexOf(parameterFormat) > -1 || parameterType === Constants.SWAGGER.TYPE.FILE) {
    if (parameterValue.length === 1) {
      const firstValueSegment = parameterValue[0];
      if (isFunctionValueSegment(firstValueSegment)) {
        return false;
      }

      return !(
        (parameterFormat === Constants.SWAGGER.FORMAT.BINARY || parameterType === Constants.SWAGGER.TYPE.FILE) &&
        isLiteralValueSegment(firstValueSegment)
      );
    }

    return true;
  } else if (parameterValue.length === 1) {
    const { token } = parameterValue[0];
    return (
      parameterType === Constants.SWAGGER.TYPE.STRING &&
      !parameterFormat &&
      isOutputTokenValueSegment(parameterValue[0]) &&
      token?.type === Constants.SWAGGER.TYPE.STRING &&
      token?.format === Constants.SWAGGER.FORMAT.BINARY
    );
  }

  return false;
}

function getInferredParameterType(value: ValueSegment[], type: string): string {
  let parameterType = type;

  if (type === Constants.SWAGGER.TYPE.ANY || type === undefined) {
    const stringValueWithoutCasting = parameterValueToStringWithoutCasting(value);
    if (isValidJSONObjectFormat(stringValueWithoutCasting)) {
      parameterType = Constants.SWAGGER.TYPE.OBJECT;
    } else if (isValidJSONArrayFormat(stringValueWithoutCasting)) {
      parameterType = Constants.SWAGGER.TYPE.ARRAY;
    } else if (value.length > 1) {
      // This is the case when there are mix of tokens
      parameterType = Constants.SWAGGER.TYPE.STRING;
    }
  }

  return parameterType;
}

function fold(expressions: string[], type: string): string | undefined {
  if (expressions.length === 0) {
    return type === Constants.SWAGGER.TYPE.STRING ? '' : undefined;
  } else {
    return expressions.join(',');
  }
}

function isValidJSONObjectFormat(value: string): boolean {
  const parameterValue = (value || '').trim();
  return startsWith(parameterValue, '{') && endsWith(parameterValue, '}');
}

function isValidJSONArrayFormat(value: string): boolean {
  const parameterValue = (value || '').trim();
  return startsWith(parameterValue, '[') && endsWith(parameterValue, ']');
}

/**
 * Encode the path value to the number of times specified in encodeValue
 */
function encodePathValueWithFunction(value: string, encodeValue?: string): string {
  const encodeCount = getEncodeValue(encodeValue ?? '');
  let encodedValue = value;

  if (!isUndefinedOrEmptyString(encodedValue)) {
    for (let i = 0; i < encodeCount; i++) {
      encodedValue = `encodeURIComponent(${encodedValue})`;
    }

    return `@{${encodedValue}}`;
  }

  return '';
}

export function encodePathValue(pathValue: string, encodeCount: number): string {
  let encodedValue = pathValue;

  if (encodedValue) {
    for (let i = 0; i < encodeCount; i++) {
      encodedValue = encodeURIComponent(encodedValue);
    }
  }

  return encodedValue;
}

export function getEncodeValue(value: string): number {
  switch (value.toLowerCase()) {
    case 'double':
      return 2;
    default:
      return 1;
  }
}

export function getArrayTypeForOutputs(parsedSwagger: SwaggerParser, operationId: string): string {
  const outputs = parsedSwagger.getOutputParameters(operationId, { excludeInternalOperations: false });
  const outputKeys = Object.keys(outputs);

  let itemKeyOutputParameter: OutputParameter | undefined = undefined;
  for (const key of outputKeys) {
    const output: OutputParameter = getPropertyValue(outputs, key);
    if (output.name === OutputKeys.Item) {
      itemKeyOutputParameter = output;
      break;
    }
  }

  return itemKeyOutputParameter?.type ?? '';
}
