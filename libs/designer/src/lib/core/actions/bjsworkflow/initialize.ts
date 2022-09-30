/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOutputs, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { DynamicLoadStatus, updateOutputs } from '../../state/operation/operationMetadataSlice';
import { updateTokens } from '../../state/tokensSlice';
import { getBrandColorFromConnector, getIconUriFromConnector } from '../../utils/card';
import { getUpdatedManifestForSchemaDependency, getUpdatedManifestForSpiltOn, toOutputInfo } from '../../utils/outputs';
import {
  addRecurrenceParametersInGroup,
  getAllInputParameters,
  getDependentParameters,
  getInputsValueFromDefinitionForManifest,
  getParametersSortedByVisibility,
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../../utils/parameters/helper';
import { getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { convertOutputsToTokens, getBuiltInTokens } from '../../utils/tokens';
import type { NodeInputsWithDependencies, NodeOutputsWithDependencies } from './operationdeserializer';
import type { Settings } from './settings';
import type {
  IConnectionService,
  IOperationManifestService,
  ISearchService,
  IOAuthService,
} from '@microsoft-logic-apps/designer-client-services';
import {
  InitConnectionService,
  InitOperationManifestService,
  InitSearchService,
  InitOAuthService,
  OperationManifestService,
} from '@microsoft-logic-apps/designer-client-services';
import type { SchemaProperty, InputParameter } from '@microsoft-logic-apps/parsers';
import {
  isDynamicListExtension,
  isDynamicPropertiesExtension,
  isDynamicSchemaExtension,
  isLegacyDynamicValuesExtension,
  DynamicSchemaType,
  ManifestParser,
  PropertyName,
} from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat, unmap } from '@microsoft-logic-apps/utils';
import type { OutputToken } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  oAuthService: IOAuthService;
}

export const InitializeServices = ({ connectionService, operationManifestService, searchService, oAuthService }: ServiceOptions) => {
  InitConnectionService(connectionService);
  InitOperationManifestService(operationManifestService);
  InitSearchService(searchService);
  InitOAuthService(oAuthService);
};

export const getInputParametersFromManifest = (
  nodeId: string,
  manifest: OperationManifest,
  stepDefinition?: any
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

  if (stepDefinition) {
    const { inputsLocation } = manifest.properties;

    // In the case of retry policy, it is treated as an input
    // avoid pushing a parameter for it as it is already being
    // handled in the settings store.
    // NOTE: this could be expanded to more settings that are treated as inputs.
    if (
      manifest.properties.settings &&
      manifest.properties.settings.retryPolicy &&
      stepDefinition.inputs &&
      stepDefinition.inputs[PropertyName.RETRYPOLICY]
    ) {
      delete stepDefinition.inputs.retryPolicy;
    }

    if (
      manifest.properties.connectionReference &&
      manifest.properties.connectionReference.referenceKeyFormat === ConnectionReferenceKeyFormat.Function
    ) {
      delete stepDefinition.inputs.function;
    }

    primaryInputParametersInArray = updateParameterWithValues(
      'inputs.$',
      getInputsValueFromDefinitionForManifest(inputsLocation ?? ['inputs'], stepDefinition),
      '',
      primaryInputParametersInArray,
      true /* createInvisibleParameter */,
      false /* useDefault */
    );
  } else {
    loadParameterValuesFromDefault(primaryInputParameters);
  }

  const allParametersAsArray = toParameterInfoMap(primaryInputParametersInArray, stepDefinition, nodeId);
  const dynamicInput = primaryInputParametersInArray.find((parameter) => parameter.dynamicSchema);

  // TODO- Initialize editor view models for array

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

  if (manifest.properties.outputsSchema) {
    manifestToParse = getUpdatedManifestForSchemaDependency(manifest, inputs);
  }

  if (isTrigger) {
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

  return { outputs: { dynamicLoadStatus: dynamicOutput ? DynamicLoadStatus.NOTSTARTED : undefined, outputs: nodeOutputs }, dependencies };
};

export const updateOutputsAndTokens = async (
  nodeId: string,
  operationInfo: NodeOperation,
  dispatch: Dispatch,
  isTrigger: boolean,
  inputs: NodeInputs,
  settings: Settings
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
    nodeOutputs = getOutputParametersFromSwagger(parsedSwagger, operationInfo, inputs, splitOnValue).outputs;
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
