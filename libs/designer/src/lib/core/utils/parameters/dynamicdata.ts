import Constants from '../../../common/constants';
import { getDynamicSchemaProperties, getListDynamicValues } from '../../queries/connector';
import type { DependencyInfo, NodeInputs } from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokensSlice';
import {
  getInputsValueFromDefinitionForManifest,
  getJSONValueFromString,
  getParameterFromName,
  loadParameterValuesFromDefault,
  parameterValueToString,
  tryConvertStringToExpression,
} from './helper';
import type { ListDynamicValue } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import type {
  DynamicParameters,
  InputParameter,
  OutputParameter,
  OutputParameters,
  ResolvedParameter,
  SchemaProcessorOptions,
} from '@microsoft-logic-apps/parsers';
import {
  ExtensionProperties,
  isDynamicPropertiesExtension,
  isDynamicListExtension,
  decodePropertySegment,
  encodePropertySegment,
  toInputParameter,
  OutputMapKey,
  OutputSource,
  ParameterLocations,
  SchemaProcessor,
  WildIndexSegment,
} from '@microsoft-logic-apps/parsers';
import type { OperationInfo, OperationManifest } from '@microsoft-logic-apps/utils';
import {
  UnsupportedExceptionCode,
  UnsupportedExceptionName,
  ValidationExceptionName,
  AssertionErrorCode,
  AssertionException,
  ValidationErrorCode,
  ValidationException,
  clone,
  equals,
  getPropertyValue,
  isNullOrEmpty,
  isObject,
  map,
  copy,
  unmap,
} from '@microsoft-logic-apps/utils';
import { TokenType, ValueSegmentType } from '@microsoft/designer-ui';

export async function getDynamicValues(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  connectionId: string,
  operationInfo: OperationInfo
): Promise<ListDynamicValue[]> {
  const { definition, parameter } = dependencyInfo;
  if (isDynamicListExtension(definition)) {
    const { dynamicState, parameters } = definition.extension;
    const operationParameters = getParametersForDynamicInvoke(parameters, nodeInputs);

    return getListDynamicValues(
      connectionId,
      operationInfo.connectorId,
      operationInfo.operationId,
      parameter?.alias,
      operationParameters,
      dynamicState
    );
  } else {
    // TODO - Add for swagger based dynamic calls
    return [];
  }
}

export async function getDynamicSchema(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  connectionId: string,
  operationInfo: OperationInfo,
  variables: VariableDeclaration[] = []
): Promise<OpenAPIV2.SchemaObject> {
  const { parameter, definition } = dependencyInfo;
  const emptySchema = {
    [ExtensionProperties.Alias]: parameter?.alias,
    title: parameter?.title,
    description: parameter?.description,
  };
  try {
    if (isDynamicPropertiesExtension(definition)) {
      const { dynamicState, parameters } = definition.extension;
      const operationParameters = getParametersForDynamicInvoke(parameters, nodeInputs);
      let schema: OpenAPIV2.SchemaObject;

      switch (dynamicState?.extension?.builtInOperation) {
        case 'getVariableSchema':
          schema = { type: getSwaggerTypeFromVariableType(operationParameters['type']?.toLowerCase()) };
          break;
        case 'getVariable':
          // eslint-disable-next-line no-case-declarations
          const variable = variables.find((variable) => variable.name === operationParameters['name']);
          schema = variable ? { type: getSwaggerTypeFromVariableType(variable.type?.toLowerCase()) } : {};
          break;
        default:
          schema = await getDynamicSchemaProperties(
            connectionId,
            operationInfo.connectorId,
            operationInfo.operationId,
            parameter?.alias,
            operationParameters,
            dynamicState
          );
          break;
      }

      return schema ? { ...emptySchema, ...schema } : schema;
    } else {
      // TODO - Add for swagger based dynamic calls
      return emptySchema;
    }
  } catch (error: any) {
    if (
      (error.name === UnsupportedExceptionName && error.code === UnsupportedExceptionCode.RUNTIME_EXPRESSION) ||
      (error.name === ValidationExceptionName && error.code === ValidationErrorCode.INVALID_VALUE_SEGMENT_TYPE)
    ) {
      return emptySchema;
    }

    throw error;
  }
}

export function getDynamicOutputsFromSchema(schema: OpenAPIV2.SchemaObject, dynamicParameter: OutputParameter): OutputParameters {
  const { key, name, parentArray, required, source } = dynamicParameter;
  const keyPrefix = _getKeyPrefixFromParameter(key);
  const processorOptions: SchemaProcessorOptions = {
    required,
    keyPrefix,
    prefix: _shouldAddPrefixForOutputs(keyPrefix) ? name : '',
    expandArrayOutputs: true,
    expandArrayOutputsDepth: Constants.MAX_INTEGER_NUMBER,
    includeParentObject: true,
    parentProperty: parentArray ? { arrayName: parentArray, isArray: true } : undefined,
    dataKeyPrefix: '$',
  };

  const schemaProperties = new SchemaProcessor(processorOptions).getSchemaProperties(schema);
  const parameterLocation = equals(source, OutputSource.Outputs) ? OutputSource.Outputs : ParameterLocations.Body;

  const outputParameters = schemaProperties.map((item) => ({ ...item, source, key: `${parameterLocation}.${item.key}` }));
  const outputs = map(outputParameters, OutputMapKey);

  return Object.keys(outputs).reduce(
    (previous, key) => ({
      ...previous,
      [key]: {
        ...outputs[key],
        isDynamic: true,
      },
    }),
    outputs
  );
}

export function getDynamicInputsFromSchema(
  schema: OpenAPIV2.SchemaObject,
  dynamicParameter: InputParameter,
  manifest: OperationManifest,
  allInputKeys: string[],
  operationDefinition?: any
): InputParameter[] {
  // TODO: Need to handle it correctly for nested parameters.
  const isParameterNested = false;
  const processorOptions: SchemaProcessorOptions = {
    prefix: isParameterNested ? dynamicParameter.name : '',
    currentKey: isParameterNested ? undefined : dynamicParameter.name,
    keyPrefix: dynamicParameter.key,
    parentProperty: {
      visibility: dynamicParameter.visibility,
    },
    required: dynamicParameter.required,
  };
  const schemaProperties = new SchemaProcessor(processorOptions).getSchemaProperties(schema);
  let dynamicInputs: InputParameter[] = schemaProperties.map((schemaProperty) => ({
    ...toInputParameter(schemaProperty),
    isDynamic: true,
  }));

  if (!operationDefinition) {
    loadParameterValuesFromDefault(map(dynamicInputs, 'key'));
    return dynamicInputs;
  }

  if (!schemaProperties.length) {
    dynamicInputs = [dynamicParameter];
  }

  let result: InputParameter[] = [];
  const stepInputs = getInputsValueFromDefinitionForManifest(manifest.properties.inputsLocation ?? ['inputs'], operationDefinition);
  const stepInputsAreNonEmptyObject = !isNullOrEmpty(stepInputs) && isObject(stepInputs);

  // Mark all of the known inputs as seen.
  const knownKeys = new Set<string>(allInputKeys);
  const keyPrefix = 'inputs.$';

  // Load known parameters directly by key.
  for (const inputParameter of dynamicInputs) {
    const clonedInputParameter = copy({ copyNonEnumerableProps: false }, {}, inputParameter);
    if (inputParameter.key === keyPrefix) {
      // Load the entire input if the key is the entire input.
      clonedInputParameter.value = stepInputs;
    } else {
      // slice off the beginning of the key and directly search the input body.
      const inputPath = inputParameter.key.replace(`${keyPrefix}.`, '');
      clonedInputParameter.value = stepInputsAreNonEmptyObject ? getObjectValue(inputPath, stepInputs) : undefined;
    }
    result.push(clonedInputParameter);

    knownKeys.add(clonedInputParameter.key);
  }

  if (stepInputs !== undefined) {
    // load unknown inputs not in the schema by key.
    const resultParameters = map(result, 'key');
    loadUnknownManifestBasedParameters(keyPrefix, '', stepInputs, resultParameters, new Set<string>(), knownKeys);
    result = unmap(resultParameters);
  }

  return result;
}

function getParametersForDynamicInvoke(referenceParameters: DynamicParameters, nodeInputs: NodeInputs): Record<string, any> {
  const intl = getIntl();
  const operationParameters: Record<string, any> = {};

  for (const [parameterName, parameter] of Object.entries(referenceParameters)) {
    // TODO(trbaratc): <2337657> Verify nested dependency parameters work once dynamic values available on api.
    const referencedParameter = getParameterFromName(nodeInputs, parameter.parameterReference);

    if (!referencedParameter) {
      throw new AssertionException(
        AssertionErrorCode.INVALID_PARAMETER_DEPENDENCY,
        intl.formatMessage(
          {
            defaultMessage: 'Parameter "{parameterName}" cannot be found for this operation',
            description: 'Error message to show in dropdown when dependent parameter is not found',
          },
          { parameterName: parameter.parameterReference }
        )
      );
    }

    // Stamp with @parameters and @appsetting values here for some parameters

    // Parameter tokens are supported.
    if (
      referencedParameter.value.some(
        (segment) => segment.type === ValueSegmentType.TOKEN && segment.token?.tokenType !== TokenType.PARAMETER
      )
    ) {
      throw new ValidationException(
        ValidationErrorCode.INVALID_VALUE_SEGMENT_TYPE,
        intl.formatMessage({
          defaultMessage: 'Value contains function expressions which cannot be resolved. Only constant values supported',
          description: 'Error message to show in dropdown when dependent parameter value cannot be resolved',
        })
      );
    }

    operationParameters[parameterName] = getJSONValueFromString(
      parameterValueToString(referencedParameter, true /* isDefinitionValue */),
      referencedParameter.type
    );
  }

  return operationParameters;
}

function loadUnknownManifestBasedParameters(
  keyPrefix: string,
  previousKeyPath: string,
  input: any,
  result: Record<string, InputParameter>,
  seenKeys: Set<string>,
  knownKeys: Set<string>
) {
  if (seenKeys.has(keyPrefix)) {
    return;
  }

  // Mark this path as visited to avoid any sort of potential looping issues.
  seenKeys.add(keyPrefix);

  // If we've hit value and it's not a known input, add it as an unknown parameter.
  if (isNullOrEmpty(input) || !isObject(input)) {
    if (!knownKeys.has(keyPrefix)) {
      // Add a generic unknown parameter.
      // eslint-disable-next-line no-param-reassign
      result[keyPrefix] = {
        key: keyPrefix,
        name: previousKeyPath,
        type: Constants.SWAGGER.TYPE.ANY,
        required: false,
        value: input,
        isDynamic: true,
        isUnknown: true,
      } as ResolvedParameter;
      knownKeys.add(keyPrefix);
    }
  } else if (!result[keyPrefix]) {
    // If it is an object, recurse down and find the other unknown values.
    Object.keys(input).forEach((key) => {
      // encode the key to match the paths of the known parameters.
      const encodedKey = encodePropertySegment(key);
      loadUnknownManifestBasedParameters(
        `${keyPrefix}.${encodedKey}`,
        isNullOrEmpty(previousKeyPath) ? encodedKey : `${previousKeyPath}.${encodedKey}`,
        input[key],
        result,
        seenKeys,
        knownKeys
      );
    });
  }
}

function _getKeyPrefixFromParameter(parameterKey: string): string {
  const separator = '.';
  const keySegments = parameterKey.split(separator);
  return keySegments.slice(1).join(separator);
}

function _shouldAddPrefixForOutputs(keyPrefix: string): boolean {
  const keySegments = keyPrefix.split('.');
  const lastSegment = keySegments.slice(-1)[0];

  return keySegments.length > 1 && lastSegment !== WildIndexSegment;
}

function getObjectValue(key: string, currentObject: any): any {
  let currentValue = clone(currentObject);
  let value: any;
  /* tslint:enable: no-any */
  const keyPaths = key.split('.');
  let foundValue = false;

  for (const keyPath of keyPaths) {
    const currentKey = tryConvertStringToExpression(decodePropertySegment(keyPath));
    value = getPropertyValue(currentObject, currentKey);

    if (value !== undefined) {
      currentValue = value;
      foundValue = true;
    } else {
      return undefined;
    }
  }

  if (foundValue) {
    value = currentValue;
  }

  return value;
}

function getSwaggerTypeFromVariableType(variableType: string): string | undefined {
  switch (variableType) {
    case 'float':
      return 'number';
    case 'integer':
    case 'boolean':
    case 'string':
    case 'array':
    case 'object':
      return variableType;
    default:
      return undefined;
  }
}
