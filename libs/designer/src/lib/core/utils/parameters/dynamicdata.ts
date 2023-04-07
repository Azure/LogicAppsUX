import Constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import type { SerializedParameter } from '../../actions/bjsworkflow/serializer';
import { getConnection, getConnectorWithSwagger } from '../../queries/connections';
import { getDynamicSchemaProperties, getLegacyDynamicSchema, getLegacyDynamicValues, getListDynamicValues } from '../../queries/connector';
import { getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokensSlice';
import { buildOperationDetailsFromControls, loadInputValuesFromDefinition } from '../swagger/inputsbuilder';
import {
  getArrayTypeForOutputs,
  getInputsValueFromDefinitionForManifest,
  getJSONValueFromString,
  getParameterFromName,
  loadParameterValuesFromDefault,
  parameterValueToString,
  tryConvertStringToExpression,
} from './helper';
import type { ListDynamicValue, ManagedIdentityRequestProperties } from '@microsoft/designer-client-services-logic-apps';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import { TokenType, ValueSegmentType } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type {
  DynamicParameters,
  InputParameter,
  OutputParameter,
  OutputParameters,
  ResolvedParameter,
  SchemaProcessorOptions,
  SwaggerParser,
} from '@microsoft/parsers-logic-apps';
import {
  parseEx,
  splitEx,
  removeConnectionPrefix,
  isLegacyDynamicValuesExtension,
  ExtensionProperties,
  isDynamicPropertiesExtension,
  isDynamicListExtension,
  decodePropertySegment,
  expandAndEncodePropertySegment,
  toInputParameter,
  OutputMapKey,
  OutputSource,
  ParameterLocations,
  SchemaProcessor,
  WildIndexSegment,
} from '@microsoft/parsers-logic-apps';
import type { Connection, OperationInfo, OperationManifest } from '@microsoft/utils-logic-apps';
import {
  first,
  getObjectPropertyValue,
  safeSetObjectPropertyValue,
  isConnectionMultiAuthManagedIdentityType,
  isConnectionSingleAuthManagedIdentityType,
  UnsupportedException,
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
} from '@microsoft/utils-logic-apps';

export async function getDynamicValues(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  nodeMetadata: any,
  operationInfo: OperationInfo,
  connectionReference: ConnectionReference | undefined,
  idReplacements: Record<string, string>
): Promise<ListDynamicValue[]> {
  const { definition, parameter } = dependencyInfo;
  if (isDynamicListExtension(definition)) {
    const { dynamicState, parameters } = definition.extension;
    const operationParameters = getParameterValuesForDynamicInvoke(parameters, nodeInputs, idReplacements);

    return getListDynamicValues(
      connectionReference?.connection.id,
      operationInfo.connectorId,
      operationInfo.operationId,
      parameter?.alias,
      operationParameters,
      dynamicState,
      nodeInputs,
      nodeMetadata
    );
  } else if (isLegacyDynamicValuesExtension(definition)) {
    const { connectorId } = operationInfo;
    const connectionId = connectionReference?.connection.id as string;
    const { parameters, operationId } = definition.extension;
    const operationParameters = getParametersForDynamicInvoke(parameters, nodeInputs, idReplacements);
    const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    const { method, path } = parsedSwagger.getOperationByOperationId(operationId as string);
    const inputs = buildOperationDetailsFromControls(
      operationParameters,
      removeConnectionPrefix(path ?? ''),
      /* encodePathComponents */ true,
      method
    );
    const connection = (await getConnection(connectionId, connectorId)) as Connection;
    const isManagedIdentityTypeConnection =
      isConnectionSingleAuthManagedIdentityType(connection) || isConnectionMultiAuthManagedIdentityType(connection, connector);
    let managedIdentityRequestProperties: ManagedIdentityRequestProperties | undefined;

    // TODO - Update this when support for Managed identity is added.
    if (isManagedIdentityTypeConnection) {
      managedIdentityRequestProperties = {
        connection: { id: connection.id },
        connectionRuntimeUrl: connection.properties.connectionRuntimeUrl as string,
        connectionProperties: connectionReference?.connectionProperties as Record<string, any>,
        authentication: connectionReference?.authentication as any,
      };
    }

    return getLegacyDynamicValues(
      connectionId,
      connectorId,
      inputs,
      definition.extension,
      getArrayTypeForOutputs(parsedSwagger, operationId as string),
      isManagedIdentityTypeConnection,
      managedIdentityRequestProperties
    );
  }

  throw new UnsupportedException(`Dynamic extension '${definition.type}' is not supported for dynamic list`);
}

export async function getDynamicSchema(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  nodeMetadata: any,
  operationInfo: OperationInfo,
  connectionReference: ConnectionReference | undefined,
  variables: VariableDeclaration[] = [],
  idReplacements: Record<string, string> = {}
): Promise<OpenAPIV2.SchemaObject | null> {
  const { parameter, definition } = dependencyInfo;
  const emptySchema = {
    [ExtensionProperties.Alias]: parameter?.alias,
    title: parameter?.title,
    description: parameter?.description,
  };
  try {
    if (isDynamicPropertiesExtension(definition)) {
      const { dynamicState, parameters } = definition.extension;
      const operationParameters = getParameterValuesForDynamicInvoke(parameters, nodeInputs, idReplacements);
      let schema: OpenAPIV2.SchemaObject;

      switch (dynamicState?.extension?.builtInOperation) {
        case 'getVariableSchema':
          schema = { type: getSwaggerTypeFromVariableType(operationParameters['type']?.toLowerCase() ?? 'boolean') };
          break;
        case 'getVariable':
          // eslint-disable-next-line no-case-declarations
          const variable = variables.find((variable) => variable.name === operationParameters['name']);
          schema = variable ? { type: getSwaggerTypeFromVariableType(variable.type?.toLowerCase()) } : {};
          break;
        default:
          schema = await getDynamicSchemaProperties(
            connectionReference?.connection.id,
            operationInfo.connectorId,
            operationInfo.operationId,
            parameter?.alias,
            operationParameters,
            dynamicState,
            nodeInputs,
            nodeMetadata
          );
          break;
      }

      return schema ? { ...emptySchema, ...schema } : schema;
    } else {
      const { connectorId } = operationInfo;
      const { parameters, operationId } = definition.extension;
      const operationParameters = getParametersForDynamicInvoke(parameters, nodeInputs, idReplacements);
      const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
      const { method, path } = parsedSwagger.getOperationByOperationId(operationId as string);
      const inputs = buildOperationDetailsFromControls(
        operationParameters,
        removeConnectionPrefix(path ?? ''),
        /* encodePathComponents */ true,
        method
      );
      const connectionId = (connectionReference as ConnectionReference).connection.id;
      const connection = (await getConnection(connectionId, connectorId)) as Connection;
      const isManagedIdentityTypeConnection =
        isConnectionSingleAuthManagedIdentityType(connection) || isConnectionMultiAuthManagedIdentityType(connection, connector);

      let managedIdentityRequestProperties: ManagedIdentityRequestProperties | undefined;

      // TODO - Update this when support for Managed identity is added.
      if (isManagedIdentityTypeConnection) {
        managedIdentityRequestProperties = {
          connection: { id: connection.id },
          connectionRuntimeUrl: connection.properties.connectionRuntimeUrl as string,
          connectionProperties: (connectionReference as ConnectionReference).connectionProperties as Record<string, any>,
          authentication: (connectionReference as ConnectionReference).authentication as any,
        };
      }

      return getLegacyDynamicSchema(
        connectionId,
        connectorId,
        inputs,
        definition.extension,
        isManagedIdentityTypeConnection,
        managedIdentityRequestProperties
      );
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

  let outputParameters = schemaProperties.map((item) => ({ ...item, source, key: `${parameterLocation}.${item.key}` }));

  if (outputParameters.length > 1) {
    outputParameters = outputParameters.filter((parameter) => parameter.key !== 'outputs.$');
  }

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

export async function getDynamicInputsFromSchema(
  schema: OpenAPIV2.SchemaObject,
  dynamicParameter: InputParameter,
  operationInfo: NodeOperation,
  allInputKeys: string[],
  operationDefinition?: any
): Promise<InputParameter[]> {
  const isParameterNested = dynamicParameter.isNested;
  const processorOptions: SchemaProcessorOptions = {
    prefix: isParameterNested ? dynamicParameter.name : '',
    currentKey: isParameterNested ? undefined : dynamicParameter.name,
    keyPrefix: dynamicParameter.key,
    parentProperty: {
      visibility: dynamicParameter.visibility,
    },
    required: dynamicParameter.required,
    useAliasedIndexing: true,
  };
  const schemaProperties = new SchemaProcessor(processorOptions).getSchemaProperties(schema);
  let dynamicInputs: InputParameter[] = schemaProperties.map((schemaProperty) => ({
    ...toInputParameter(schemaProperty),
    isDynamic: true,
    in: dynamicParameter.in,
  }));

  if (!operationDefinition) {
    loadParameterValuesFromDefault(map(dynamicInputs, 'key'));
    return dynamicInputs;
  }

  if (!schemaProperties.length) {
    dynamicInputs = [dynamicParameter];
  }

  if (OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)) {
    const manifest = await getOperationManifest(operationInfo);
    const output = getManifestBasedInputParameters(dynamicInputs, dynamicParameter, allInputKeys, manifest, operationDefinition);
    return output;
  } else {
    const { parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);
    return getSwaggerBasedInputParameters(dynamicInputs, dynamicParameter, parsedSwagger, operationInfo, operationDefinition);
  }
}

function getParameterValuesForDynamicInvoke(
  referenceParameters: DynamicParameters,
  nodeInputs: NodeInputs,
  idReplacements: Record<string, string>
): Record<string, any> {
  return getParametersForDynamicInvoke(referenceParameters, nodeInputs, idReplacements).reduce(
    (result: Record<string, any>, parameter: SerializedParameter) => ({ ...result, [parameter.parameterName]: parameter.value }),
    {}
  );
}

function getParametersForDynamicInvoke(
  referenceParameters: DynamicParameters,
  nodeInputs: NodeInputs,
  idReplacements: Record<string, string>
): SerializedParameter[] {
  const intl = getIntl();
  const operationParameters: SerializedParameter[] = [];

  for (const [parameterName, parameter] of Object.entries(referenceParameters ?? {})) {
    const referenceParameterName = (parameter?.parameterReference ?? parameter?.parameter ?? 'undefined') as string;
    if (referenceParameterName === 'undefined') continue;
    const referencedParameter = getParameterFromName(nodeInputs, referenceParameterName);

    if (!referencedParameter) {
      throw new AssertionException(
        AssertionErrorCode.INVALID_PARAMETER_DEPENDENCY,
        intl.formatMessage(
          {
            defaultMessage: 'Parameter "{parameterName}" cannot be found for this operation',
            description: 'Error message to show in dropdown when dependent parameter is not found',
          },
          { parameterName: referenceParameterName }
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

    operationParameters.push({
      ...referencedParameter,
      parameterName,
      value: getJSONValueFromString(
        parameterValueToString(referencedParameter, false /* isDefinitionValue */, idReplacements),
        referencedParameter.type
      ),
    });
  }

  return operationParameters;
}

function getManifestBasedInputParameters(
  dynamicInputs: InputParameter[],
  dynamicParameter: InputParameter,
  allInputKeys: string[],
  manifest: OperationManifest,
  operationDefinition: any
): InputParameter[] {
  let result: InputParameter[] = [];
  const stepInputs = getInputsValueFromDefinitionForManifest(
    manifest.properties?.inputsLocation ?? ['inputs'],
    manifest,
    operationDefinition,
    dynamicInputs
  );
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
      /*
        We have two formats to support:
          Default:   inputs.$.foo.bar.baz                => foo.bar.baz
          OpenApi:   inputs.$.foo.foo/bar.foo/bar/baz    => foo/bar/baz
      */
      let inputPath = inputParameter.key.replace(`${keyPrefix}.`, '');
      if (isOpenApiParameter(inputParameter)) inputPath = splitEx(inputPath)?.at(-1) ?? '';
      clonedInputParameter.value = stepInputsAreNonEmptyObject ? getObjectValue(inputPath, stepInputs) : undefined;
    }
    result.push(clonedInputParameter);

    knownKeys.add(clonedInputParameter.key);
  }

  const pathParams = initializeDynamicPathParameters(dynamicInputs, dynamicParameter, operationDefinition);
  result = result.filter((input) => !pathParams.some((pathParam) => pathParam.key === input.key)).concat(pathParams);

  if (stepInputs !== undefined && !manifest.properties.inputsLocationSwapMap) {
    // load unknown inputs not in the schema by key.
    const resultParameters = map(result, 'key');
    loadUnknownManifestBasedParameters(keyPrefix, '', stepInputs, resultParameters, new Set<string>(), knownKeys);
    result = unmap(resultParameters);
  }

  return result;
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
      const encodedKey = expandAndEncodePropertySegment(key);
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

function getSwaggerBasedInputParameters(
  inputs: InputParameter[],
  dynamicParameter: InputParameter,
  swagger: SwaggerParser,
  operationInfo: NodeOperation,
  operationDefinition: any
): InputParameter[] {
  const operationPath = removeConnectionPrefix(swagger.getOperationByOperationId(operationInfo.operationId).path);
  const basePath = swagger.api.basePath;
  const { key, isNested } = dynamicParameter;
  const parameterKey =
    key === 'inputs.$'
      ? undefined
      : key.indexOf('inputs.$') === 0
      ? key.replace('inputs.$.', '')
      : key.indexOf('body.$') === 0
      ? key.replace('.$', '')
      : '';
  const propertyNames = parseEx(parameterKey).map((segment) => segment.value?.toString()) as string[];
  const dynamicInputDefinition = safeSetObjectPropertyValue(
    {},
    propertyNames,
    getObjectPropertyValue(operationDefinition.inputs, propertyNames)
  );
  const dynamicInputParameters = loadInputValuesFromDefinition(
    dynamicInputDefinition as Record<string, any>,
    isNested ? [dynamicParameter] : inputs,
    operationPath,
    basePath as string
  );

  if (isNested) {
    const parameter = first((inputParameter) => inputParameter.key === key, dynamicInputParameters);
    const isArrayParameter = parameter?.type === Constants.SWAGGER.TYPE.ARRAY;
    const parameterValue = ((value: any) => (value && isArrayParameter ? value[0] : value))(parameter?.value);
    const result: InputParameter[] = [];

    for (const inputParameter of inputs) {
      if (inputParameter.value === undefined) {
        // NOTE: For scenarios when dynamic parameter doesn't have any schema, then value is read for the whole
        // parameter from definition.
        if (inputParameter.key === parameter?.key) {
          inputParameter.value = parameterValue;
        } else {
          const key = inputParameter.name.replace(parameter?.name ?? '', '').slice(1);
          inputParameter.value = parameterValue ? getObjectValue(key, parameterValue) : undefined;
        }
      }

      result.push(inputParameter);
    }

    return result;
  } else {
    return dynamicInputParameters;
  }
}

function initializeDynamicPathParameters(
  inputs: InputParameter[],
  dynamicParameter: InputParameter,
  operationDefinition: any
): InputParameter[] {
  const swaggerKey = dynamicParameter.name;
  const basePath = '';
  const operationPath = inputs.find((input) => input.name === `${swaggerKey}.pathTemplate.template`)?.default;
  const parameterKey = 'uri';
  const propertyNames = parseEx(parameterKey).map((segment) => segment.value?.toString()) as string[];
  const dynamicInputDefinition = safeSetObjectPropertyValue(
    {},
    propertyNames,
    getObjectPropertyValue(operationDefinition.inputs, propertyNames)
  );
  const dynamicInputParameters = loadInputValuesFromDefinition(
    dynamicInputDefinition as Record<string, any>,
    inputs,
    operationPath,
    basePath as string
  );

  const result: InputParameter[] = [];

  for (const inputParameter of inputs) {
    if (inputParameter.default && inputParameter.value === undefined) {
      inputParameter.value = inputParameter.default;
    }
    if (inputParameter.value === undefined) {
      const inputKey = `${inputParameter.schema.in}.$.${inputParameter.schema.name}`;
      const value = dynamicInputParameters.find((parameter) => parameter.key === inputKey)?.value;
      inputParameter.value = value;
    }
    result.push(inputParameter);
  }
  return result;
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
    value = getPropertyValue(currentValue, currentKey);

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

function isOpenApiParameter(param: InputParameter): boolean {
  return !!param?.alias;
}
