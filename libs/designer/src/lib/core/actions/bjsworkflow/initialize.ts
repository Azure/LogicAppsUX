/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { WorkflowParameter } from '../../../common/models/workflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOutputs, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { updateNodeSettings, updateNodeParameters, DynamicLoadStatus, updateOutputs } from '../../state/operation/operationMetadataSlice';
import type { UpdateUpstreamNodesPayload } from '../../state/tokensSlice';
import { updateTokens, updateUpstreamNodes } from '../../state/tokensSlice';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import { initializeParameters } from '../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../store';
import { getBrandColorFromConnector, getIconUriFromConnector } from '../../utils/card';
import { getTriggerNodeId, isRootNodeInGraph } from '../../utils/graph';
import { getSplitOnOptions, getUpdatedManifestForSchemaDependency, getUpdatedManifestForSpiltOn, toOutputInfo } from '../../utils/outputs';
import {
  addRecurrenceParametersInGroup,
  getAllInputParameters,
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
} from '@microsoft/designer-client-services-logic-apps';
import { WorkflowService, LoggerService, LogEntryLevel, OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { OutputToken, ParameterInfo } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { SchemaProperty, InputParameter } from '@microsoft/parsers-logic-apps';
import {
  isDynamicListExtension,
  isDynamicPropertiesExtension,
  isDynamicSchemaExtension,
  isLegacyDynamicValuesExtension,
  DynamicSchemaType,
  ManifestParser,
  PropertyName,
} from '@microsoft/parsers-logic-apps';
import type { OperationManifest } from '@microsoft/utils-logic-apps';
import { clone, equals, ConnectionReferenceKeyFormat, unmap } from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  oAuthService: IOAuthService;
  workflowService: IWorkflowService;
}

export const parseWorkflowParameters = (parameters: Record<string, WorkflowParameter>, dispatch: Dispatch): void => {
  dispatch(
    initializeParameters(
      Object.keys(parameters).reduce(
        (result: Record<string, WorkflowParameterDefinition>, currentKey: string) => ({
          ...result,
          [currentKey]: { name: currentKey, isEditable: false, ...parameters[currentKey] },
        }),
        {}
      )
    )
  );
};

export const getInputParametersFromManifest = (
  nodeId: string,
  manifest: OperationManifest,
  stepDefinition?: any,
  additionalInputParameters?: InputParameter[]
): NodeInputsWithDependencies => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(
    false /* includeParentObject */,
    0 /* expandArrayPropertiesDepth */
  );
  const allInputParameters = unmap(
    new ManifestParser(manifest).getInputParameters(
      true /* includeParentObject */,
      Constants.MAX_EXPAND_ARRAY_DEPTH /* expandArrayPropertiesDepth */
    )
  );
  let primaryInputParametersInArray = unmap(primaryInputParameters);

  if (additionalInputParameters) {
    primaryInputParametersInArray = primaryInputParametersInArray.concat(additionalInputParameters);
  }

  if (stepDefinition) {
    const { inputsLocation } = manifest.properties;
    const operationData = clone(stepDefinition);

    // In the case of retry policy, it is treated as an input
    // avoid pushing a parameter for it as it is already being
    // handled in the settings store.
    // NOTE: this could be expanded to more settings that are treated as inputs.
    if (
      manifest.properties.settings &&
      manifest.properties.settings.retryPolicy &&
      operationData.inputs &&
      operationData.inputs[PropertyName.RETRYPOLICY]
    ) {
      delete operationData.inputs.retryPolicy;
    }

    if (
      manifest.properties.connectionReference &&
      manifest.properties.connectionReference.referenceKeyFormat === ConnectionReferenceKeyFormat.Function
    ) {
      delete operationData.inputs.function;
    }

    primaryInputParametersInArray = updateParameterWithValues(
      'inputs.$',
      getInputsValueFromDefinitionForManifest(inputsLocation ?? ['inputs'], manifest, operationData),
      '',
      primaryInputParametersInArray,
      !inputsLocation || !!inputsLocation.length /* createInvisibleParameter */,
      false /* useDefault */
    );
  } else {
    loadParameterValuesArrayFromDefault(primaryInputParametersInArray);
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
  splitOnValue?: string
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
    originalOutputs = Object.values(originalOperationOutputs).reduce((result: Record<string, OutputInfo>, output: SchemaProperty) => {
      return {
        ...result,
        [output.key]: toOutputInfo(output),
      };
    }, {});

    manifestToParse = getUpdatedManifestForSpiltOn(manifestToParse, splitOnValue);
  }

  const operationOutputs = new ManifestParser(manifestToParse).getOutputParameters(
    true /* includeParentObject */,
    Constants.MAX_INTEGER_NUMBER /* expandArrayOutputsDepth */,
    false /* expandOneOf */,
    undefined /* data */,
    true /* selectAllOneOfSchemas */
  );

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
  shouldProcessSettings = false
): Promise<void> => {
  const { type, kind, connectorId } = operationInfo;
  const supportsManifest = OperationManifestService().isSupported(type, kind);
  const splitOnValue = settings.splitOn?.value?.enabled ? settings.splitOn.value.value : undefined;
  let nodeOutputs: NodeOutputs;
  let tokens: OutputToken[];
  if (supportsManifest) {
    const manifest = await getOperationManifest(operationInfo);
    nodeOutputs = getOutputParametersFromManifest(manifest, isTrigger, inputs, splitOnValue).outputs;
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
  if (shouldProcessSettings && isTrigger) {
    const isSplitOnSupported = getSplitOnOptions(nodeOutputs).length > 0;
    if (settings.splitOn?.isSupported !== isSplitOnSupported) {
      dispatch(updateNodeSettings({ id: nodeId, settings: { splitOn: { ...settings.splitOn, isSupported: isSplitOnSupported } } }));
    }
  }
};

export const getInputDependencies = (nodeInputs: NodeInputs, allInputs: InputParameter[]): Record<string, DependencyInfo> => {
  const dependencies: Record<string, DependencyInfo> = {};
  for (const inputParameter of allInputs) {
    const { dynamicValues, dynamicSchema } = inputParameter;
    if (dynamicValues) {
      if (isLegacyDynamicValuesExtension(dynamicValues) || isDynamicListExtension(dynamicValues)) {
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
  if (equals(type, Constants.NODE.TYPE.REQUEST) && equals(kind, Constants.NODE.KIND.HTTP)) {
    try {
      const callbackInfo = await WorkflowService().getCallbackUrl(nodeId);
      const parameter = getParameterFromName(nodeInputs, 'callbackUrl');

      if (parameter && callbackInfo) {
        parameter.label = getIntl().formatMessage(
          { defaultMessage: 'HTTP {method} URL', description: 'Callback url method' },
          { method: callbackInfo.method }
        );
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

export const updateAllUpstreamNodes = (state: RootState, dispatch: Dispatch): void => {
  const allOperations = state.workflow.operations;
  const payload: UpdateUpstreamNodesPayload = {};
  const nodeMap = Object.keys(allOperations).reduce(
    (actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }),
    {}
  );

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
