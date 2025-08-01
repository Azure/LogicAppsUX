import Constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { getCustomSwaggerIfNeeded } from '../../actions/bjsworkflow/initialize';
import type { SerializedParameter } from '../../actions/bjsworkflow/serializer';
import { getConnection, getConnectorWithSwagger } from '../../queries/connections';
import {
  getDynamicSchemaProperties,
  getDynamicTreeItems,
  getLegacyDynamicSchema,
  getLegacyDynamicTreeItems,
  getLegacyDynamicValues,
  getListDynamicValues,
} from '../../queries/connector';
import { getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokens/tokensSlice';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import { isConnectionMultiAuthManagedIdentityType, isConnectionSingleAuthManagedIdentityType } from '../connectors/connections';
import { buildOperationDetailsFromControls, loadFormDataValue, loadInputValuesFromDefinition } from '../swagger/inputsbuilder';
import {
  getArrayTypeForOutputs,
  getInputsValueFromDefinitionForManifest,
  getJSONValueFromString,
  getParameterFromName,
  loadParameterValuesFromDefault,
  parameterHasValue,
  parameterValueToString,
  shouldEncodeParameterValueForOperationBasedOnMetadata,
  toParameterInfoMap,
  tryConvertStringToExpression,
} from './helper';
import type {
  ListDynamicValue,
  ManagedIdentityRequestProperties,
  TreeDynamicValue,
  DynamicParameters,
  ExpressionEvaluatorOptions,
  InputParameter,
  OutputParameter,
  OutputParameters,
  ResolvedParameter,
  SchemaProcessorOptions,
  SwaggerParser,
  Connection,
  Connector,
  OpenAPIV2,
  OperationInfo,
  OperationManifest,
} from '@microsoft/logic-apps-shared';
import {
  getIntl,
  ExpressionEvaluator,
  isTemplateExpression,
  isLegacyDynamicValuesTreeExtension,
  isDynamicTreeExtension,
  parseEx,
  splitEx,
  removeConnectionPrefix,
  isLegacyDynamicValuesExtension,
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
  replaceSubsegmentSeparator,
  first,
  getObjectPropertyValue,
  safeSetObjectPropertyValue,
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
  TryGetOperationManifestService,
} from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { TokenType, ValueSegmentType } from '@microsoft/designer-ui';

export async function getDynamicValues(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  operationInfo: OperationInfo,
  connectionReference: ConnectionReference | undefined,
  idReplacements: Record<string, string>,
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Promise<ListDynamicValue[]> {
  const { definition } = dependencyInfo;
  const shouldEncodeBasedOnMetadata = shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo);
  if (isDynamicListExtension(definition)) {
    const { dynamicState, parameters } = definition.extension;
    const operationParameters = getParameterValuesForDynamicInvoke(
      parameters,
      nodeInputs,
      idReplacements,
      workflowParameters,
      shouldEncodeBasedOnMetadata
    );

    return getListDynamicValues(
      connectionReference?.connection.id,
      operationInfo.connectorId,
      operationInfo.operationId,
      operationParameters,
      dynamicState
    );
  }
  if (isLegacyDynamicValuesExtension(definition)) {
    const { connectorId } = operationInfo;
    const connectionId = connectionReference?.connection.id as string;
    const { parameters, operationId } = definition.extension;
    const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    const inputs = getParameterValuesForLegacyDynamicOperation(
      parsedSwagger,
      operationId,
      parameters,
      nodeInputs,
      idReplacements,
      workflowParameters,
      shouldEncodeBasedOnMetadata
    );
    const managedIdentityRequestProperties = await getManagedIdentityRequestProperties(
      connector,
      connectionId,
      connectionReference as ConnectionReference
    );

    return getLegacyDynamicValues(
      connectionId,
      connectorId,
      inputs,
      definition.extension,
      getArrayTypeForOutputs(parsedSwagger, operationId as string),
      managedIdentityRequestProperties
    );
  }

  throw new UnsupportedException(`Dynamic extension '${definition.type}' is not supported for dynamic list`);
}

export async function getDynamicSchema(
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  operationInfo: OperationInfo,
  connectionReference: ConnectionReference | undefined,
  variables: VariableDeclaration[] = [],
  idReplacements: Record<string, string> = {},
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Promise<OpenAPIV2.SchemaObject | null> {
  const { parameter, definition } = dependencyInfo;
  const emptySchema = {
    title: parameter?.schema?.title,
    description: parameter?.schema?.description,
    summary: parameter?.schema?.summary,
    name: parameter?.schema?.name,
  };
  const shouldEncodeBasedOnMetadata = shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo);
  try {
    if (isDynamicPropertiesExtension(definition)) {
      const { dynamicState, parameters } = definition.extension;
      const operationParameters = getParameterValuesForDynamicInvoke(
        parameters,
        nodeInputs,
        idReplacements,
        workflowParameters,
        shouldEncodeBasedOnMetadata
      );
      let schema: OpenAPIV2.SchemaObject;
      switch (dynamicState?.extension?.builtInOperation) {
        case 'getVariableSchema': {
          schema = {
            type: getSwaggerTypeFromVariableType(operationParameters['type']?.toLowerCase() ?? 'boolean'),
            enum: getSwaggerEnumFromVariableType(operationParameters['type']?.toLowerCase() ?? 'boolean'),
          };

          break;
        }
        case 'getVariable': {
          const variable = variables.find((variable) => variable.name === operationParameters['name']);
          schema = variable
            ? {
                type: getSwaggerTypeFromVariableType(variable.type?.toLowerCase()),
                enum: getSwaggerEnumFromVariableType(variable.type?.toLowerCase()),
              }
            : {};
          break;
        }
        default: {
          schema = await getDynamicSchemaProperties(
            connectionReference?.connection.id,
            operationInfo.connectorId,
            operationInfo.operationId,
            operationParameters,
            dynamicState
          );
          break;
        }
      }

      return schema ? { ...emptySchema, ...schema } : schema;
    }
    const { connectorId } = operationInfo;
    const { parameters, operationId } = definition.extension;
    const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    const inputs = getParameterValuesForLegacyDynamicOperation(
      parsedSwagger,
      operationId,
      parameters,
      nodeInputs,
      idReplacements,
      workflowParameters,
      shouldEncodeBasedOnMetadata
    );
    const connectionId = (connectionReference as ConnectionReference).connection.id;
    const managedIdentityRequestProperties = await getManagedIdentityRequestProperties(
      connector,
      connectionId,
      connectionReference as ConnectionReference
    );

    return getLegacyDynamicSchema(connectionId, connectorId, inputs, definition.extension, managedIdentityRequestProperties);
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

export function getDynamicOutputsFromSchema(
  schema: OpenAPIV2.SchemaObject,
  dynamicParameter: OutputParameter,
  operationInfo: NodeOperation
): OutputParameters {
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
    useAliasedIndexing: TryGetOperationManifestService()?.isAliasingSupported(operationInfo.type, operationInfo.kind),
  };

  const schemaProperties = new SchemaProcessor(processorOptions).getSchemaProperties(schema);
  const parameterLocation = equals(source, OutputSource.Outputs) ? OutputSource.Outputs : ParameterLocations.Body;

  let outputParameters = schemaProperties.map((item) => ({ ...item, source, key: `${parameterLocation}.${item.key}` }));

  if (outputParameters.length > 1) {
    outputParameters = outputParameters.filter((parameter) => parameter.key !== 'outputs.$');
  }

  const outputs = map(outputParameters, OutputMapKey);

  for (const key of Object.keys(outputs)) {
    outputs[key].isDynamic = true;
  }
  return outputs;
}

export async function getDynamicInputsFromSchema(
  schema: OpenAPIV2.SchemaObject,
  dynamicParameter: InputParameter,
  operationInfo: NodeOperation,
  allInputKeys: string[],
  operationDefinition?: any
): Promise<InputParameter[]> {
  const isParameterNested = dynamicParameter.isNested;
  const schemaHasRequiredParameters = schema?.required && schema.required.length > 0;
  const service = TryGetOperationManifestService();
  const processorOptions: SchemaProcessorOptions = {
    prefix: isParameterNested ? dynamicParameter.name : '',
    currentKey: isParameterNested ? undefined : dynamicParameter.name,
    keyPrefix: dynamicParameter.key,
    parentProperty: {
      visibility: dynamicParameter.visibility,
    },
    required: dynamicParameter.required || schemaHasRequiredParameters,
    useAliasedIndexing: service?.isAliasingSupported(operationInfo.type, operationInfo.kind),
    excludeAdvanced: false,
    excludeInternal: false,
    includeParentObject: true,
    isInputSchema: true,
  };
  const schemaProperties = new SchemaProcessor(processorOptions).getSchemaProperties(schema);
  let dynamicInputs: InputParameter[] = schemaProperties.map((schemaProperty) => ({
    ...toInputParameter(schemaProperty),
    isDynamic: true,
    dynamicParameterReference: dynamicParameter.key,
    in: dynamicParameter.in,
    required: (schemaProperty.schema?.required as any) ?? schemaProperty.required ?? false,
  }));

  // TODO: This code should be removed once keys are correctly stamped for aliasing inputs since in normal parsing this does not happen.
  // We are recieving some swagger parameters with keys in the following format, ex:
  //     body.$.body/content.body/content/appId
  // We need to reformat to the below string:
  //     body.$.content.appId
  for (const inputParameter of dynamicInputs) {
    const { key: _key, in: _in } = inputParameter;
    if (isOpenApiParameter(inputParameter) && _in && _key !== `${_in}.$`) {
      // _key = body.$.body/content.body/content/appId
      const path = replaceSubsegmentSeparator(_key.split('.').pop() ?? '');
      // path = body.content.appId
      const key = `${_in}.$.${path.replace(`${_in}.`, '')}`;
      // key = body.$.content.appId
      const name = path.split('.').pop() ?? '';
      // name = appId

      inputParameter.key = key;
      inputParameter.name = name;
      inputParameter.title = name;
    }
  }

  if (!operationDefinition) {
    loadParameterValuesFromDefault(map(dynamicInputs, 'key'));
    return removeParentObjectInputsIfNotNeeded(dynamicInputs);
  }

  if (!schemaProperties.length) {
    dynamicInputs = [getDynamicInputParameterFromDynamicParameter(dynamicParameter)];
  }

  if (service?.isSupported(operationInfo.type, operationInfo.kind)) {
    const manifest = await getOperationManifest(operationInfo);
    const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operationDefinition);
    return getManifestBasedInputParameters(dynamicInputs, dynamicParameter, allInputKeys, manifest, customSwagger, operationDefinition);
  }
  const { parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);
  return getSwaggerBasedInputParameters(dynamicInputs, dynamicParameter, parsedSwagger, operationInfo, operationDefinition);
}

export async function getFolderItems(
  selectedValue: any | undefined,
  dependencyInfo: DependencyInfo,
  nodeInputs: NodeInputs,
  operationInfo: OperationInfo,
  connectionReference: ConnectionReference | undefined,
  idReplacements: Record<string, string>,
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Promise<TreeDynamicValue[]> {
  const { definition, filePickerInfo } = dependencyInfo;
  const shouldEncodeBasedOnMetadata = shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo);

  if (isLegacyDynamicValuesTreeExtension(definition) && filePickerInfo) {
    const { open, browse } = filePickerInfo;
    const { connectorId } = operationInfo;
    const connectionId = connectionReference?.connection.id as string;
    const { operationId, parameters: referenceParameters } = selectedValue ? browse : open;
    const pickerParameters: Record<string, any> = {};
    for (const [paramKey, paramValue] of Object.entries(referenceParameters ?? {})) {
      if (paramValue?.selectedItemValuePath || paramValue?.['value-property']) {
        pickerParameters[paramKey] = getPropertyValue(
          selectedValue,
          paramValue.selectedItemValuePath ?? paramValue['value-property'] ?? ''
        );
      } else {
        pickerParameters[paramKey] = referenceParameters?.[paramKey];
      }
    }

    const parameters = { ...definition.extension.parameters, ...pickerParameters };
    const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    const inputs = getParameterValuesForLegacyDynamicOperation(
      parsedSwagger,
      operationId,
      parameters,
      nodeInputs,
      idReplacements,
      workflowParameters,
      shouldEncodeBasedOnMetadata
    );
    const managedIdentityRequestProperties = await getManagedIdentityRequestProperties(
      connector,
      connectionId,
      connectionReference as ConnectionReference
    );

    return getLegacyDynamicTreeItems(connectionId, connectorId, operationId, inputs, filePickerInfo, managedIdentityRequestProperties);
  }
  if (isDynamicTreeExtension(definition) && filePickerInfo) {
    const { open, browse } = filePickerInfo;
    const { connectorId } = operationInfo;
    const connectionId = connectionReference?.connection.id as string;
    const { operationId, parameters } = selectedValue ? browse : open;

    const operationParameters = getParameterValuesForDynamicInvoke(
      parameters as DynamicParameters,
      nodeInputs,
      idReplacements,
      workflowParameters,
      shouldEncodeBasedOnMetadata
    );

    const dynamicExtension = {
      dynamicState: definition.extension.dynamicState,
      selectionState: selectedValue ? selectedValue.selectionState : undefined,
    };

    return getDynamicTreeItems(connectionId, connectorId, operationId, operationParameters, dynamicExtension);
  }

  throw new UnsupportedException(`Dynamic extension '${definition.type}' is not implemented yet or not supported`);
}

function getParameterValuesForDynamicInvoke(
  referenceParameters: DynamicParameters,
  nodeInputs: NodeInputs,
  idReplacements: Record<string, string>,
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  shouldEncodeBasedOnMetadata = true
): Record<string, any> {
  const retVal: Record<string, any> = {};
  const iter = getParametersForDynamicInvoke(
    referenceParameters,
    nodeInputs,
    idReplacements,
    workflowParameters,
    /* operationInputs */ undefined,
    shouldEncodeBasedOnMetadata
  );
  for (const parameter of iter) {
    retVal[parameter.parameterName] = parameter.value;
  }
  return retVal;
}

function getParameterValuesForLegacyDynamicOperation(
  swagger: SwaggerParser,
  operationId: string,
  parameters: Record<string, any>,
  nodeInputs: NodeInputs,
  idReplacements: Record<string, string>,
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  shouldEncodeBasedOnMetadata = true
): Record<string, any> {
  const operation = swagger.getOperationByOperationId(operationId);
  if (!operation) {
    throw new Error('APIM Operation not found');
  }

  const { method, path } = operation;
  const operationInputs = map(
    toParameterInfoMap(
      unmap(swagger.getInputParameters(operationId as string, { excludeInternalParameters: false, excludeInternalOperations: false }).byId),
      undefined,
      shouldEncodeBasedOnMetadata
    ),
    'parameterName'
  );
  const operationParameters = getParametersForDynamicInvoke(
    parameters,
    nodeInputs,
    idReplacements,
    workflowParameters,
    operationInputs,
    shouldEncodeBasedOnMetadata
  );
  return buildOperationDetailsFromControls(
    operationParameters,
    removeConnectionPrefix(path ?? ''),
    /* encodePathComponents */ true,
    method
  );
}

function getParametersForDynamicInvoke(
  referenceParameters: DynamicParameters,
  nodeInputs: NodeInputs,
  idReplacements: Record<string, string>,
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  operationInputs?: Record<string, ParameterInfo>,
  shouldEncodeBasedOnMetadata = true
): SerializedParameter[] {
  const intl = getIntl();
  const operationParameters: SerializedParameter[] = [];
  const inputsToAdd = { ...(operationInputs ?? {}) };

  // Get app settings from query client
  const queryClient = getReactQueryClient();
  const appSettings = queryClient.getQueryData(['appSettings']);

  for (const [parameterName, parameter] of Object.entries(referenceParameters ?? {})) {
    const referenceParameterName = (parameter?.parameterReference ?? parameter?.parameter ?? 'undefined') as string;
    const operationParameter = operationInputs?.[parameterName];
    delete inputsToAdd[parameterName];

    if (referenceParameterName === 'undefined') {
      if (!operationParameter) {
        continue;
      }

      operationParameters.push({
        ...operationParameter,
        parameterName,
        value: parameter,
      });
    } else {
      const referencedParameter = getParameterFromName(nodeInputs, referenceParameterName);

      if (!referencedParameter) {
        throw new AssertionException(
          AssertionErrorCode.INVALID_PARAMETER_DEPENDENCY,
          intl.formatMessage(
            {
              defaultMessage: 'Parameter "{parameterName}" cannot be found for this operation',
              id: '7LmpNN',
              description: 'Error message to show in dropdown when dependent parameter is not found',
            },
            { parameterName: referenceParameterName }
          )
        );
      }

      // Parameter tokens are supported, we are stamping them at the end.
      // We only replace single instance of parameters and appsettings but not when it is included in a combination of text.
      if (
        referencedParameter.value.some(
          (segment) => segment.type === ValueSegmentType.TOKEN && segment.token?.tokenType !== TokenType.PARAMETER
        )
      ) {
        throw new ValidationException(
          ValidationErrorCode.INVALID_VALUE_SEGMENT_TYPE,
          intl.formatMessage({
            defaultMessage: 'Value contains function expressions which cannot be resolved. Only constant values supported',
            id: 'yB6PB/',
            description: 'Error message to show in dropdown when dependent parameter value cannot be resolved',
          })
        );
      }

      operationParameters.push({
        ...(operationParameter ?? referencedParameter),
        parameterName,
        value: getJSONValueFromString(
          parameterValueToString(referencedParameter, false /* isDefinitionValue */, idReplacements, shouldEncodeBasedOnMetadata),
          referencedParameter.type
        ),
      });
    }
  }

  for (const [parameterName, parameter] of Object.entries(inputsToAdd)) {
    if (parameterHasValue(parameter)) {
      operationParameters.push({
        ...parameter,
        parameterName,
        value: getJSONValueFromString(
          parameterValueToString(parameter, false /* isDefinitionValue */, idReplacements, shouldEncodeBasedOnMetadata),
          parameter.type
        ),
      });
    }
  }

  evaluateTemplateExpressions(operationParameters, workflowParameters, appSettings);

  return operationParameters;
}

async function getManagedIdentityRequestProperties(
  connector: Connector,
  connectionId: string,
  connectionReference: ConnectionReference
): Promise<ManagedIdentityRequestProperties | undefined> {
  const connection = (await getConnection(connectionId, connector.id)) as Connection;
  const isManagedIdentityTypeConnection =
    isConnectionSingleAuthManagedIdentityType(connection) || isConnectionMultiAuthManagedIdentityType(connection, connector);

  let managedIdentityRequestProperties: ManagedIdentityRequestProperties | undefined;

  if (isManagedIdentityTypeConnection) {
    managedIdentityRequestProperties = {
      connection: { id: connection.id },
      connectionRuntimeUrl: connection.properties.connectionRuntimeUrl as string,
      connectionProperties: connectionReference.connectionProperties as Record<string, any>,
      authentication: connectionReference.authentication as any,
    };
  }

  return managedIdentityRequestProperties;
}

export function getManifestBasedInputParameters(
  dynamicInputs: InputParameter[],
  dynamicParameter: InputParameter,
  allInputKeys: string[],
  manifest: OperationManifest,
  customSwagger: SwaggerParser | undefined,
  operationDefinition: any
): InputParameter[] {
  let result: InputParameter[] = [];
  const stepInputs = getInputsValueFromDefinitionForManifest(
    manifest.properties?.inputsLocation ?? ['inputs'],
    manifest,
    customSwagger,
    operationDefinition,
    dynamicInputs
  );
  const stepInputsAreNonEmptyObject = !isNullOrEmpty(stepInputs) && isObject(stepInputs);

  // Mark all of the known inputs as seen.
  const knownKeys = new Set<string>(allInputKeys);
  const keyPrefix = 'inputs.$';

  const isFormDataInput = (param: InputParameter) => param.serialization?.property?.type === 'formdata';
  const formDataInputs: InputParameter[] = [];
  let formDataInputKeyPrefix = '';
  let formDataLocation = '';
  // Load known parameters directly by key.
  const suppressCasting = !manifest.properties?.autoCast;

  for (const inputParameter of dynamicInputs) {
    const clonedInputParameter = copy({ copyNonEnumerableProps: false }, {}, inputParameter);
    clonedInputParameter.suppressCasting = suppressCasting;
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
      if (isOpenApiParameter(inputParameter)) {
        inputPath = splitEx(inputPath)?.at(-1) ?? '';
      }
      clonedInputParameter.value = stepInputsAreNonEmptyObject ? getObjectValue(inputPath, stepInputs) : undefined;
    }

    if (isFormDataInput(clonedInputParameter)) {
      if (formDataLocation === '') {
        formDataInputKeyPrefix = clonedInputParameter.key.substring(0, clonedInputParameter.key.indexOf('.formData'));
        formDataLocation = formDataInputKeyPrefix.replace(`${keyPrefix}.`, '');
      }

      formDataInputs.push({ ...clonedInputParameter, key: clonedInputParameter.serialization?.property?.parameterReference });
    } else {
      result.push(clonedInputParameter);
      knownKeys.add(clonedInputParameter.key);
    }
  }

  result = removeParentObjectInputsIfNotNeeded(result);

  if (
    !operationDefinition.metadata?.noUnknownParametersWithManifest &&
    stepInputs !== undefined &&
    !manifest.properties.inputsLocationSwapMap
  ) {
    // load unknown inputs not in the schema by key.
    const resultParameters = map(result, 'key');
    loadUnknownManifestBasedParameters(keyPrefix, '', stepInputs, resultParameters, new Set<string>(), knownKeys, dynamicParameter.key);
    result = unmap(resultParameters);
  }

  if (formDataInputs.length) {
    const formDataInputsValue = getObjectValue(formDataLocation, stepInputs);
    result.push(
      ...loadFormDataValue(formDataInputsValue, formDataInputs).map((input) => ({
        ...input,
        key: input.key.replace('formData.$', `${formDataInputKeyPrefix}.formData`),
      }))
    );
  }

  return result;
}

function removeParentObjectInputsIfNotNeeded(inputs: InputParameter[]): InputParameter[] {
  const objectInputKeysWithExpressionValues = inputs
    .filter((input) => input.type === Constants.SWAGGER.TYPE.OBJECT && isTemplateExpression(input.value))
    .map((input) => input.key);

  const filteredInputs = inputs.filter((input) => {
    if (input.type !== Constants.SWAGGER.TYPE.OBJECT) {
      return !objectInputKeysWithExpressionValues.some((parentInputKey) => input.key.startsWith(`${parentInputKey}.`));
    }

    return isTemplateExpression(input.value) || !objectHasLeafProperties(inputs, input.key);
  });

  return filteredInputs;
}

function objectHasLeafProperties(allInputs: InputParameter[], key: string): boolean {
  return allInputs.some((input) => input.key.startsWith(`${key}.`));
}

function loadUnknownManifestBasedParameters(
  keyPrefix: string,
  previousKeyPath: string,
  input: any,
  result: Record<string, InputParameter>,
  seenKeys: Set<string>,
  knownKeys: Set<string>,
  dynamicParameterReference: string
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
        dynamicParameterReference,
        isUnknown: true,
      } as ResolvedParameter;
      knownKeys.add(keyPrefix);
    }
  } else if (!result[keyPrefix] && !knownKeys.has(keyPrefix)) {
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
        knownKeys,
        dynamicParameterReference
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
  const operation = swagger.getOperationByOperationId(operationInfo.operationId);
  if (!operation) {
    throw new Error('APIM Operation not found');
  }

  const operationPath = removeConnectionPrefix(operation.path);
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
  let dynamicInputParameters = loadInputValuesFromDefinition(
    dynamicInputDefinition as Record<string, any>,
    isNested ? [getDynamicInputParameterFromDynamicParameter(dynamicParameter)] : inputs,
    operationPath,
    basePath as string
  );

  dynamicInputParameters = removeParentObjectInputsIfNotNeeded(dynamicInputParameters);

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

    return removeParentObjectInputsIfNotNeeded(result);
  }
  return removeParentObjectInputsIfNotNeeded(dynamicInputParameters);
}

// We should remove any reference to dynamic schema if parameter containing dynamic schema is used directly as an input.
function getDynamicInputParameterFromDynamicParameter(dynamicParameter: InputParameter): InputParameter {
  const result = {
    ...dynamicParameter,
    isDynamic: true,
    dynamicParameterReference: dynamicParameter.key,
    in: dynamicParameter.in,
    required: (dynamicParameter.schema?.required as any) ?? dynamicParameter.required ?? false,
  };

  delete result.dynamicSchema;
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

function getSwaggerEnumFromVariableType(variableType: string): boolean[] | undefined {
  switch (variableType) {
    case 'boolean':
      return [true, false];
    default:
      return undefined;
  }
}

function isOpenApiParameter(param: InputParameter): boolean {
  return !!param?.alias;
}

function evaluateTemplateExpressions(
  parameters: SerializedParameter[],
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  appSettings: any
): void {
  if (!Object.keys(workflowParameters).length) {
    return;
  }

  const outputParameters: Record<string, any> = {};
  for (const value of Object.values(workflowParameters)) {
    outputParameters[value.name as string] = value.defaultValue ?? value.value;
  }

  const options: ExpressionEvaluatorOptions = {
    fuzzyEvaluation: true,
    context: {
      parameters: outputParameters,
      appsettings: appSettings,
    },
  };

  const evaluator = new ExpressionEvaluator(options);
  for (const parameter of parameters) {
    evaluateParameter(parameter, evaluator);
  }
}

// Recursively evaluate in case there is a expression within the expression
function evaluateParameter(parameter: SerializedParameter, evaluator: ExpressionEvaluator): void {
  const value = parameter.value;
  if (isTemplateExpression(value)) {
    // eslint-disable-next-line no-param-reassign
    parameter.value = evaluator.evaluate(value);
  }
  if (value !== parameter.value) {
    evaluateParameter(parameter, evaluator);
  }
}
