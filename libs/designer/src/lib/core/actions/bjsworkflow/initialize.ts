/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { NodeDependencies, NodeInputs, NodeOutputs, OutputInfo } from '../../state/operation/operationMetadataSlice';
import { DynamicLoadStatus, updateOutputs } from '../../state/operation/operationMetadataSlice';
import { updateTokens } from '../../state/tokensSlice';
import { getUpdatedManifestForSchemaDependency, getUpdatedManifestForSpiltOn, toOutputInfo } from '../../utils/outputs';
import { getRecurrenceParameters } from '../../utils/parameters/builtins';
import {
  getAllInputParameters,
  getInputsValueFromDefinitionForManifest,
  getParameterFromName,
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  parameterValidForDynamicCall,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../../utils/parameters/helper';
import { convertOutputsToTokens, getBuiltInTokens } from '../../utils/tokens';
import type { Settings } from './settings';
import type { IConnectionService, IOperationManifestService, ISearchService } from '@microsoft-logic-apps/designer-client-services';
import { InitConnectionService, InitOperationManifestService, InitSearchService } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { DynamicListExtension, DynamicParameters, OutputParameter, SchemaProperty } from '@microsoft-logic-apps/parsers';
import { DynamicSchemaType, DynamicValuesType, ManifestParser, PropertyName, Visibility } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat, equals, unmap } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
}

export const InitializeServices = ({ connectionService, operationManifestService, searchService }: ServiceOptions) => {
  InitConnectionService(connectionService);
  InitOperationManifestService(operationManifestService);
  InitSearchService(searchService);
};

export const getInputParametersFromManifest = (nodeId: string, manifest: OperationManifest, stepDefinition?: any): NodeInputs => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(
    false /* includeParentObject */,
    0 /* expandArrayPropertiesDepth */
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
  const recurrenceParameters = getRecurrenceParameters(manifest.properties.recurrence, stepDefinition);
  const dynamicInput = primaryInputParametersInArray.find((parameter) => parameter.dynamicSchema);

  // TODO(14490585)- Initialize editor view models for array

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = {
    [ParameterGroupKeys.DEFAULT]: defaultParameterGroup,
  };

  if (recurrenceParameters.length) {
    const intl = getIntl();
    if (manifest.properties.recurrence?.useLegacyParameterGroup) {
      defaultParameterGroup.parameters = recurrenceParameters;
    } else {
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

  defaultParameterGroup.parameters = getParametersSortedByVisibility(defaultParameterGroup.parameters);

  return { dynamicLoadStatus: dynamicInput ? DynamicLoadStatus.NOTSTARTED : undefined, parameterGroups };
};

export const getOutputParametersFromManifest = (
  manifest: OperationManifest,
  isTrigger: boolean,
  inputs: NodeInputs,
  splitOnValue?: string
): { nodeOutputs: NodeOutputs; dynamicOutput?: OutputParameter } => {
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

  return {
    nodeOutputs: { dynamicLoadStatus: dynamicOutput ? DynamicLoadStatus.NOTSTARTED : undefined, outputs: nodeOutputs },
    dynamicOutput,
  };
};

export const getParameterDependencies = (
  manifest: OperationManifest,
  inputs: NodeInputs,
  outputs: NodeOutputs,
  dynamicOutput?: OutputParameter
): NodeDependencies => {
  const dependencies = { inputs: {}, outputs: {} } as NodeDependencies;
  const allInputParameters = unmap(
    new ManifestParser(manifest).getInputParameters(
      true /* includeParentObject */,
      Constants.MAX_EXPAND_ARRAY_DEPTH /* expandArrayPropertiesDepth */
    )
  );
  for (const inputParameter of allInputParameters) {
    const { dynamicValues, dynamicSchema } = inputParameter;
    if (dynamicValues) {
      if (dynamicValues.type === DynamicValuesType.DynamicList) {
        dependencies.inputs[inputParameter.key] = {
          definition: dynamicValues,
          dependencyType: 'ListValues',
          dependentParameters: getDependentParameters(inputs, (dynamicValues.extension as DynamicListExtension).parameters),
          parameter: inputParameter,
        };
      }

      // TODO - Add for Swagger case here
    } else if (dynamicSchema) {
      if (dynamicSchema.type === DynamicSchemaType.DynamicProperties) {
        dependencies.inputs[inputParameter.key] = {
          definition: dynamicSchema,
          dependencyType: 'ApiSchema',
          dependentParameters: getDependentParameters(inputs, dynamicSchema.extension.parameters),
          parameter: inputParameter,
        };
      }

      // TODO - Add for Swagger case here
    }
  }

  if (dynamicOutput && dynamicOutput.dynamicSchema) {
    if (dynamicOutput.dynamicSchema.type === DynamicSchemaType.DynamicProperties) {
      dependencies.outputs[dynamicOutput.key] = {
        definition: dynamicOutput.dynamicSchema,
        dependencyType: 'ApiSchema',
        dependentParameters: getDependentParameters(inputs, dynamicOutput.dynamicSchema.extension.parameters),
        parameter: dynamicOutput,
      };
    }

    // TODO - Add for Swagger case here
  }
  const { outputsSchema } = manifest.properties;
  if (outputsSchema) {
    const allOutputs = unmap(outputs.outputs);
    for (const outputPath of outputsSchema.outputPaths) {
      const outputName = outputPath.outputLocation.filter((location) => location !== 'properties').join('.');
      const matchingOutput = allOutputs.find((output) => output.name === outputName);
      const dependentInput = getAllInputParameters(inputs).find((input) => input.parameterName === outputPath.name);

      if (matchingOutput && dependentInput) {
        dependencies.outputs[matchingOutput.key] = {
          definition: outputPath,
          dependencyType: 'StaticSchema',
          dependentParameters: {
            [dependentInput.id]: { isValid: !dependentInput.validationErrors?.length },
          },
        };
      }
    }
  }

  return dependencies;
};

export const updateOutputsAndTokens = (
  nodeId: string,
  operationType: string,
  dispatch: Dispatch,
  manifest: OperationManifest,
  isTrigger: boolean,
  inputs: NodeInputs,
  settings: Settings
): void => {
  const { nodeOutputs } = getOutputParametersFromManifest(manifest, isTrigger, inputs, settings.splitOn?.value?.value);
  dispatch(updateOutputs({ id: nodeId, nodeOutputs }));

  const tokens = [
    ...getBuiltInTokens(manifest),
    ...convertOutputsToTokens(isTrigger ? undefined : nodeId, operationType, nodeOutputs.outputs ?? {}, manifest, settings),
  ];
  dispatch(updateTokens({ id: nodeId, tokens }));
};

const getParametersSortedByVisibility = (parameters: ParameterInfo[]): ParameterInfo[] => {
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
};

const getDependentParameters = (
  inputs: NodeInputs,
  parameters: Record<string, any> | DynamicParameters
): Record<string, { isValid: boolean }> => {
  return Object.keys(parameters).reduce((result: Record<string, { isValid: boolean }>, key: string) => {
    const parameter = parameters[key];
    const operationInput = getParameterFromName(inputs, parameter.parameterReference);
    if (operationInput) {
      return {
        ...result,
        [operationInput.id]: { isValid: parameterValidForDynamicCall(operationInput) },
      };
    }

    return result;
  }, {});
};
