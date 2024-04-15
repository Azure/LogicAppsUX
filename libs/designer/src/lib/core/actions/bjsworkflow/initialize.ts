import type { CustomCodeFileNameMapping } from '../../..';
import Constants from '../../../common/constants';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import { ImpersonationSource } from '../../../common/models/workflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectorWithSwagger, getSwaggerFromEndpoint } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOutputs, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { updateNodeSettings, updateNodeParameters, DynamicLoadStatus, updateOutputs } from '../../state/operation/operationMetadataSlice';
import type { UpdateUpstreamNodesPayload } from '../../state/tokens/tokensSlice';
import { updateTokens, updateUpstreamNodes } from '../../state/tokens/tokensSlice';
import { WorkflowKind } from '../../state/workflow/workflowInterfaces';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import { initializeParameters } from '../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../store';
import { getTriggerNodeId, isRootNodeInGraph } from '../../utils/graph';
import { getSplitOnOptions, getUpdatedManifestForSchemaDependency, getUpdatedManifestForSplitOn, toOutputInfo } from '../../utils/outputs';
import {
  addRecurrenceParametersInGroup,
  getAllInputParameters,
  getCustomCodeFileName,
  getDependentParameters,
  getInputsValueFromDefinitionForManifest,
  getParameterFromName,
  getParametersSortedByVisibility,
  loadParameterValuesArrayFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../../utils/parameters/helper';
import { createLiteralValueSegment } from '../../utils/parameters/segment';
import { getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../utils/tokens';
import type { NodeInputsWithDependencies, NodeOutputsWithDependencies } from './operationdeserializer';
import type { Settings } from './settings';
import type {
  IConnectionService,
  IOperationManifestService,
  ISearchService,
  IOAuthService,
  IWorkflowService,
  CustomSwaggerServiceDetails,
  InputParameter,
  OperationInfo,
  OperationManifest,
  OperationManifestProperties,
  OutputParameter,
  SchemaProperty,
  SwaggerParser,
} from '@microsoft/logic-apps-shared';
import {
  WorkflowService,
  LoggerService,
  LogEntryLevel,
  OperationManifestService,
  FunctionService,
  ApiManagementService,
  clone,
  ConnectionReferenceKeyFormat,
  CustomSwaggerServiceNames,
  DynamicSchemaType,
  equals,
  getBrandColorFromConnector,
  getIconUriFromConnector,
  getObjectPropertyValue,
  getRecordEntry,
  isDynamicListExtension,
  isDynamicPropertiesExtension,
  isDynamicSchemaExtension,
  isDynamicTreeExtension,
  isLegacyDynamicValuesExtension,
  isLegacyDynamicValuesTreeExtension,
  ManifestParser,
  PropertyName,
  unmap,
  UnsupportedException,
  isNullOrEmpty,
} from '@microsoft/logic-apps-shared';
import type { OutputToken, ParameterInfo } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  oAuthService: IOAuthService;
  workflowService: IWorkflowService;
}

export const updateWorkflowParameters = (parameters: Record<string, WorkflowParameter>, dispatch: Dispatch): void => {
  let parametersObj: Record<string, WorkflowParameterDefinition> = {};
  for (const [key, param] of Object.entries(parameters)) {
    parametersObj[key] = { name: key, isEditable: false, ...param };
  }

  dispatch(initializeParameters(parametersObj));
};

export const getInputParametersFromManifest = (
  _nodeId: string,
  manifest: OperationManifest,
  presetParameterValues?: Record<string, any>,
  customSwagger?: SwaggerParser,
  stepDefinition?: any
): NodeInputsWithDependencies => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(
    false /* includeParentObject */,
    0 /* expandArrayPropertiesDepth */,
    undefined,
    undefined
  );
  const allInputParameters = unmap(
    new ManifestParser(manifest).getInputParameters(
      true /* includeParentObject */,
      Constants.MAX_EXPAND_ARRAY_DEPTH /* expandArrayPropertiesDepth */
    )
  );
  let primaryInputParametersInArray = unmap(primaryInputParameters);

  if (stepDefinition) {
    const { inputsLocation } = manifest.properties;
    const operationData = clone(stepDefinition);

    // In the case of retry policy, it is treated as an input
    // avoid pushing a parameter for it as it is already being
    // handled in the settings store.
    // NOTE: this could be expanded to more settings that are treated as inputs.
    if (manifest.properties.settings?.retryPolicy && operationData.inputs?.[PropertyName.RETRYPOLICY]) {
      delete operationData.inputs.retryPolicy;
    }

    if (manifest.properties.connectionReference?.referenceKeyFormat === ConnectionReferenceKeyFormat.Function) {
      delete operationData.inputs.function;
    }

    primaryInputParametersInArray = updateParameterWithValues(
      'inputs.$',
      getInputsValueFromDefinitionForManifest(
        inputsLocation ?? ['inputs'],
        manifest,
        customSwagger,
        operationData,
        primaryInputParametersInArray
      ),
      '',
      primaryInputParametersInArray,
      !operationData.metadata?.noUnknownParametersWithManifest &&
        (!inputsLocation || !!inputsLocation.length) &&
        !manifest.properties.inputsLocationSwapMap /* createInvisibleParameter */,
      false /* useDefault */
    );
  } else {
    loadParameterValuesArrayFromDefault(primaryInputParametersInArray);
  }

  if (presetParameterValues) {
    for (const [parameterName, parameterValue] of Object.entries(presetParameterValues)) {
      const parameter = primaryInputParametersInArray.find((parameter) => parameter.name === parameterName);
      if (parameter) {
        parameter.value = parameterValue;
      }
    }
  }

  const allParametersAsArray = toParameterInfoMap(primaryInputParametersInArray, stepDefinition);
  const dynamicInput = primaryInputParametersInArray.find((parameter) => parameter.dynamicSchema);

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = {
    [ParameterGroupKeys.DEFAULT]: defaultParameterGroup,
  };

  addRecurrenceParametersInGroup(parameterGroups, manifest.properties.recurrence, stepDefinition);

  defaultParameterGroup.parameters = getParametersSortedByVisibility(defaultParameterGroup.parameters);

  const nodeInputs = { dynamicLoadStatus: dynamicInput ? DynamicLoadStatus.NOTSTARTED : undefined, parameterGroups };
  return { inputs: nodeInputs, dependencies: getInputDependencies(nodeInputs, allInputParameters) };
};

export const getOutputParametersFromManifest = (
  manifest: OperationManifest,
  isTrigger: boolean,
  inputs: NodeInputs,
  splitOnValue?: string,
  operationInfo?: OperationInfo,
  nodeId?: string
): NodeOutputsWithDependencies => {
  let manifestToParse = manifest;
  let originalOutputs: Record<string, OutputInfo> | undefined;

  if (manifest.properties.outputsSchema) {
    manifestToParse = getUpdatedManifestForSchemaDependency(manifest, inputs);
  }

  if (isTrigger) {
    const originalOperationOutputs = new ManifestParser(manifestToParse).getOutputParameters(
      true /* includeParentObject */,
      Constants.MAX_INTEGER_NUMBER /* expandArrayOutputsDepth */,
      false /* expandOneOf */,
      undefined /* data */,
      true /* selectAllOneOfSchemas */
    );

    originalOutputs = {};
    for (const output of Object.values(originalOperationOutputs)) {
      originalOutputs[output.key] = toOutputInfo(output);
    }

    manifestToParse = getUpdatedManifestForSplitOn(manifestToParse, splitOnValue);
  }

  let operationOutputs: Record<string, OutputParameter>;

  if (operationInfo?.operationId?.toLowerCase() === 'foreach') {
    operationOutputs = {
      'builtin.$.item': {
        key: Constants.FOREACH_CURRENT_ITEM_KEY,
        name: `${Constants.FOREACH_CURRENT_ITEM_EXPRESSION_NAME}('${nodeId}')`,
        required: false,
        title: manifest.properties.outputs.title,
        type: Constants.SWAGGER.TYPE.ANY,
      },
    };
  } else {
    operationOutputs = new ManifestParser(manifestToParse).getOutputParameters(
      true /* includeParentObject */,
      Constants.MAX_INTEGER_NUMBER /* expandArrayOutputsDepth */,
      false /* expandOneOf */,
      undefined /* data */,
      true /* selectAllOneOfSchemas */
    );
  }

  const nodeOutputs: Record<string, OutputInfo> = {};
  let dynamicOutput: SchemaProperty | undefined;
  for (const [key, output] of Object.entries(operationOutputs)) {
    if (!output.dynamicSchema) {
      nodeOutputs[key] = toOutputInfo(output);
    } else if (!dynamicOutput) {
      dynamicOutput = output;
    }
  }

  const dependencies: Record<string, DependencyInfo> = {};
  if (dynamicOutput && dynamicOutput.dynamicSchema) {
    if (dynamicOutput.dynamicSchema.type === DynamicSchemaType.DynamicProperties) {
      dependencies[dynamicOutput.key] = {
        definition: dynamicOutput.dynamicSchema,
        dependencyType: 'ApiSchema',
        dependentParameters: getDependentParameters(inputs, dynamicOutput.dynamicSchema.extension.parameters ?? {}),
        parameter: dynamicOutput,
      };
    }
  }

  const { outputsSchema } = manifest.properties;
  if (outputsSchema) {
    const allOutputs = unmap(nodeOutputs);
    for (const outputPath of outputsSchema.outputPaths) {
      const outputName = outputPath.outputLocation.filter((location) => location !== 'properties').join('.');
      const matchingOutput = allOutputs.find((output) => output.name === outputName);
      const dependentInput = getAllInputParameters(inputs).find((input) => input.parameterName === outputPath.name);

      if (matchingOutput && dependentInput) {
        dependencies[matchingOutput.key] = {
          definition: outputPath,
          dependencyType: 'StaticSchema',
          dependentParameters: {
            [dependentInput.id]: { isValid: !dependentInput.validationErrors?.length },
          },
        };
      }
    }
  }

  return {
    outputs: { dynamicLoadStatus: dynamicOutput ? DynamicLoadStatus.NOTSTARTED : undefined, outputs: nodeOutputs, originalOutputs },
    dependencies,
  };
};

export const updateOutputsAndTokens = async (
  nodeId: string,
  operationInfo: NodeOperation,
  dispatch: Dispatch,
  isTrigger: boolean,
  inputs: NodeInputs,
  settings: Settings,
  shouldProcessSettings = false,
  workflowKind?: WorkflowKind,
  forceEnableSplitOn?: boolean
): Promise<void> => {
  const { type, kind, connectorId } = operationInfo;
  const supportsManifest = OperationManifestService().isSupported(type, kind);
  const splitOnValue = settings.splitOn?.value?.enabled ? settings.splitOn.value.value : undefined;
  let nodeOutputs: NodeOutputs;
  let tokens: OutputToken[];
  if (supportsManifest) {
    const manifest = await getOperationManifest(operationInfo);
    nodeOutputs = getOutputParametersFromManifest(manifest, isTrigger, inputs, splitOnValue, operationInfo, nodeId).outputs;
    tokens = [
      ...getBuiltInTokens(manifest),
      ...convertOutputsToTokens(
        isTrigger ? undefined : nodeId,
        type,
        nodeOutputs.outputs ?? {},
        { iconUri: manifest.properties.iconUri, brandColor: manifest.properties.brandColor },
        settings
      ),
    ];
  } else {
    const { connector, parsedSwagger } = await getConnectorWithSwagger(connectorId);
    nodeOutputs = getOutputParametersFromSwagger(isTrigger, parsedSwagger, operationInfo, inputs, splitOnValue).outputs;
    tokens = convertOutputsToTokens(
      isTrigger ? undefined : nodeId,
      type,
      nodeOutputs.outputs ?? {},
      { iconUri: getIconUriFromConnector(connector), brandColor: getBrandColorFromConnector(connector) },
      settings
    );
  }

  dispatch(updateOutputs({ id: nodeId, nodeOutputs }));
  dispatch(updateTokens({ id: nodeId, tokens }));

  // NOTE: Split On setting changes as outputs of trigger changes, so we will be recalculating such settings in this block for triggers.
  if (shouldProcessSettings && isTrigger && (workflowKind !== WorkflowKind.STATELESS || forceEnableSplitOn)) {
    const isSplitOnSupported = getSplitOnOptions(nodeOutputs, supportsManifest).length > 0;
    if (settings.splitOn?.isSupported !== isSplitOnSupported) {
      dispatch(updateNodeSettings({ id: nodeId, settings: { splitOn: { ...settings.splitOn, isSupported: isSplitOnSupported } } }));
    }
  }
};

export const getInputDependencies = (
  nodeInputs: NodeInputs,
  allInputs: InputParameter[],
  swagger?: SwaggerParser
): Record<string, DependencyInfo> => {
  const dependencies: Record<string, DependencyInfo> = {};
  for (const inputParameter of allInputs) {
    const { dynamicValues, dynamicSchema } = inputParameter;
    if (dynamicValues) {
      if (isLegacyDynamicValuesTreeExtension(dynamicValues) && !!swagger?.api['x-ms-capabilities']) {
        const pickerCapability = swagger.api['x-ms-capabilities'][Constants.PROPERTY.FILE_PICKER];
        dependencies[inputParameter.key] = {
          definition: dynamicValues,
          dependencyType: 'TreeNavigation',
          dependentParameters: {},
          filePickerInfo: {
            open: pickerCapability[Constants.PROPERTY.OPEN],
            browse: pickerCapability[Constants.PROPERTY.BROWSE],
            collectionPath: pickerCapability[Constants.PROPERTY.VALUE_COLLECTION],
            valuePath: dynamicValues.extension['value-path'],
            titlePath: pickerCapability[Constants.PROPERTY.VALUE_TITLE],
            fullTitlePath: Constants.PATH,
            folderPropertyPath: pickerCapability[Constants.PROPERTY.VALUE_FOLDER_PROPERTY],
            mediaPropertyPath: pickerCapability[Constants.PROPERTY.VALUE_MEDIA_PROPERTY],
          },
          parameter: inputParameter,
        };
      } else if (isDynamicTreeExtension(dynamicValues)) {
        dependencies[inputParameter.key] = {
          definition: dynamicValues,
          dependencyType: 'TreeNavigation',
          dependentParameters: {},
          filePickerInfo: {
            open: dynamicValues.extension.open,
            browse: dynamicValues.extension.browse,
            fullTitlePath: 'fullyQualifiedDisplayName',
            valuePath: 'value',
          },
          parameter: inputParameter,
        };
      } else if (isLegacyDynamicValuesExtension(dynamicValues) || isDynamicListExtension(dynamicValues)) {
        dependencies[inputParameter.key] = {
          definition: dynamicValues,
          dependencyType: 'ListValues',
          dependentParameters: getDependentParameters(nodeInputs, dynamicValues.extension.parameters ?? {}),
          parameter: inputParameter,
        };
      }
    } else if (dynamicSchema) {
      if (isDynamicSchemaExtension(dynamicSchema) || isDynamicPropertiesExtension(dynamicSchema)) {
        dependencies[inputParameter.key] = {
          definition: dynamicSchema,
          dependencyType: 'ApiSchema',
          dependentParameters: getDependentParameters(nodeInputs, dynamicSchema.extension.parameters ?? {}),
          parameter: inputParameter,
        };
      }
    }
  }

  return dependencies;
};

export const updateCallbackUrl = async (rootState: RootState, dispatch: Dispatch): Promise<void> => {
  const trigger = getTriggerNodeId(rootState.workflow);
  const operationInfo = rootState.operations.operationInfo[trigger];
  const nodeInputs = clone(rootState.operations.inputParameters[trigger]);
  const updatedParameter = await updateCallbackUrlInInputs(trigger, operationInfo, nodeInputs);

  if (updatedParameter) {
    dispatch(
      updateNodeParameters({
        nodeId: trigger,
        parameters: [{ groupId: ParameterGroupKeys.DEFAULT, parameterId: updatedParameter.id, propertiesToUpdate: updatedParameter }],
      })
    );
  }
};

export const updateCallbackUrlInInputs = async (
  nodeId: string,
  { type, kind }: NodeOperation,
  nodeInputs: NodeInputs
): Promise<ParameterInfo | undefined> => {
  if (
    equals(type, Constants.NODE.TYPE.REQUEST) &&
    (equals(kind, Constants.NODE.KIND.HTTP) || equals(kind, Constants.NODE.KIND.TEAMSWEBHOOK))
  ) {
    try {
      const callbackInfo = await WorkflowService().getCallbackUrl(nodeId);
      const parameter = getParameterFromName(nodeInputs, 'callbackUrl');

      if (parameter && callbackInfo) {
        parameter.value = [createLiteralValueSegment(callbackInfo.value)];

        return parameter;
      }
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'CallbackUrl_Update',
        message: `Unable to initialize callback url for manual trigger, error ${error}`,
      });
    }
  }

  return;
};

export const updateCustomCodeInInputs = async (
  nodeId: string,
  fileExtension: string,
  nodeInputs: NodeInputs,
  customCode: CustomCodeFileNameMapping
) => {
  if (isNullOrEmpty(customCode)) return;
  // getCustomCodeFileName does not return the file extension because the editor view model is not populated yet
  const fileName = getCustomCodeFileName(nodeId, nodeInputs) + fileExtension;
  try {
    const customCodeValue = getRecordEntry(customCode, fileName)?.fileData;
    const parameter = getParameterFromName(nodeInputs, Constants.DEFAULT_CUSTOM_CODE_INPUT);

    if (parameter && customCodeValue) {
      parameter.editorViewModel = {
        customCodeData: { fileData: customCodeValue, fileExtension, fileName },
      };
    }
  } catch (error) {
    const errorMessage = `Failed to populate code file ${fileName}: ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'fetchCustomCode',
      message: errorMessage,
      error: error instanceof Error ? error : undefined,
    });
    return;
  }
};

export const updateAllUpstreamNodes = (state: RootState, dispatch: Dispatch): void => {
  const allOperations = state.workflow.operations;
  const payload: UpdateUpstreamNodesPayload = {};
  const nodeMap: Record<string, string> = {};
  for (const id of Object.keys(allOperations)) {
    nodeMap[id] = id;
  }

  for (const nodeId of Object.keys(allOperations)) {
    if (!isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata)) {
      payload[nodeId] = getTokenNodeIds(
        nodeId,
        state.workflow.graph as WorkflowNode,
        state.workflow.nodesMetadata,
        {},
        state.operations.operationInfo,
        nodeMap
      );
    }
  }

  dispatch(updateUpstreamNodes(payload));
};

export const getCustomSwaggerIfNeeded = async (
  manifestProperties: OperationManifestProperties,
  stepDefinition?: any
): Promise<SwaggerParser | undefined> => {
  if (!manifestProperties.customSwagger || !stepDefinition) {
    return undefined;
  }

  const { location, service } = manifestProperties.customSwagger;

  if (!location && !service) {
    return undefined;
  }

  return location
    ? getSwaggerFromEndpoint(getObjectPropertyValue(stepDefinition, location))
    : getSwaggerFromService(
        service as CustomSwaggerServiceDetails,
        getObjectPropertyValue(stepDefinition, manifestProperties.inputsLocation ?? ['inputs'])
      );
};

const getSwaggerFromService = async (serviceDetails: CustomSwaggerServiceDetails, stepInputs: any): Promise<SwaggerParser> => {
  const { name, operationId, parameters } = serviceDetails;
  let service: any;
  switch (name) {
    case CustomSwaggerServiceNames.Function:
      service = FunctionService();
      break;
    case CustomSwaggerServiceNames.ApiManagement:
      service = ApiManagementService();
      break;
    default:
      throw new UnsupportedException(`The custom swagger service name '${name}' is not supported`);
  }

  if (!service || !service[operationId]) {
    throw new UnsupportedException(`The custom swagger service name '${name}' for operation '${operationId}' is not supported`);
  }

  const operationParameters = Object.keys(parameters).map((parameterName) =>
    getObjectPropertyValue(stepInputs, parameters[parameterName].parameterReference.split('.'))
  );
  return service[operationId](...operationParameters);
};

export const updateInvokerSettings = (
  isTrigger: boolean,
  triggerNodeManifest: OperationManifest | undefined,
  settings: Settings,
  updateNodeSettingsCallback: (invokerSettings: Settings) => void,
  references?: ConnectionReferences
): void => {
  if (!isTrigger && triggerNodeManifest?.properties?.settings?.invokerConnection) {
    updateNodeSettingsCallback({ invokerConnection: { ...settings.invokerConnection, isSupported: true } });
  }
  if (references) {
    Object.keys(references).forEach((key) => {
      const impersonationSource = references[key].impersonation?.source;
      if (impersonationSource === ImpersonationSource.Invoker) {
        updateNodeSettingsCallback({ invokerConnection: { isSupported: true, value: { enabled: true } } });
      }
    });
  }
};
