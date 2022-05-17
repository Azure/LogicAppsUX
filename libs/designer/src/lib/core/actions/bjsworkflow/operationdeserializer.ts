import Constants from '../../../common/constants';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type { NodeInputs, NodeOutputs, OutputInfo } from '../../state/operationMetadataSlice';
import { initializeInputParameters, initializeOperationInfo, initializeOutputParameters } from '../../state/operationMetadataSlice';
import type { Operations } from '../../state/workflowSlice';
import {
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
} from '../../utils/parameterhelper';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { ManifestParser, PropertyName, Visibility } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat, equals, getObjectPropertyValue, unmap } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

export const initializeOperationMetadata = async (operations: Operations, dispatch: Dispatch): Promise<void> => {
  const promises: Promise<void>[] = [];
  const operationManifestService = OperationManifestService();

  for (const [operationId, operation] of Object.entries(operations)) {
    if (operationManifestService.isSupported(operation.type)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, dispatch));
    } else {
      // swagger case here
    }
  }

  await Promise.all(promises);
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  dispatch: Dispatch
): Promise<void> => {
  const operationInfo = await getOperationInfo(nodeId, operation);

  if (operationInfo) {
    const manifest = await getOperationManifest(operationInfo);

    dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));

    const nodeParameters = getInputParametersFromManifest(nodeId, manifest, operation);
    dispatch(initializeInputParameters({ id: nodeId, ...nodeParameters }));

    const nodeOutputs = getOutputParametersFromManifest(nodeId, manifest);
    dispatch(initializeOutputParameters({ id: nodeId, ...nodeOutputs }));
  }
};

const getInputParametersFromManifest = (nodeId: string, manifest: OperationManifest, stepDefinition: any): NodeInputs => {
  const primaryInputParameters = new ManifestParser(manifest).getInputParameters(
    /* includeParentObject */ false,
    /* expandArrayPropertiesDepth */ 0
  );
  let nodeType = '';
  let primaryInputParametersInArray = unmap(primaryInputParameters);

  if (stepDefinition) {
    nodeType = stepDefinition.type;
    const { inputsLocation } = manifest.properties;

    // In the case of retry policy, it is treated as an input
    // avoid pushing a parameter for it as it is already being
    // handled in the settings store.
    // TODO: this could be expanded to more settings that are treated as inputs.
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
      inputsLocation ? getObjectPropertyValue(stepDefinition, inputsLocation) : stepDefinition.inputs,
      '',
      primaryInputParametersInArray,
      /* createInvisibleParameter */ true,
      /* useDefault */ false
    );
  } else {
    loadParameterValuesFromDefault(primaryInputParameters);
  }

  const allParametersAsArray = toParameterInfoMap(nodeType, primaryInputParametersInArray, stepDefinition, nodeId);

  // TODO (M2)- Initialize editor view models

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = {
    [ParameterGroupKeys.DEFAULT]: defaultParameterGroup,
  };

  // TODO (M1)- Add enum parameters
  // TODO (M1)- Add recurrence parameters
  // TODO (M3)- Initialize dynamic inputs.

  defaultParameterGroup.parameters = _getParametersSortedByVisibility(defaultParameterGroup.parameters);

  return { parameterGroups };
};

const getOutputParametersFromManifest = (nodeId: string, manifest: OperationManifest): NodeOutputs => {
  // TODO (M1) - Update operation manifest for triggers with split on.

  const operationOutputs = new ManifestParser(manifest).getOutputParameters(
    /* includeParentObject */ true,
    /* expandArrayOutputsDepth */ Constants.MAX_INTEGER_NUMBER,
    /* expandOneOf */ false,
    /* data */ undefined,
    /* selectAllOneOfSchemas */ true
  );

  // TODO (M3) - Get dynamic schema output

  const nodeOutputs: Record<string, OutputInfo> = {};
  for (const [key, output] of Object.entries(operationOutputs)) {
    const {
      format,
      type,
      isDynamic,
      isInsideArray,
      name,
      itemSchema,
      parentArray,
      title,
      summary,
      description,
      source,
      required,
      visibility,
    } = output;

    nodeOutputs[key] = {
      key,
      type,
      format,
      isAdvanced: equals(visibility, Constants.VISIBILITY.ADVANCED),
      name,
      isDynamic,
      isInsideArray,
      itemSchema,
      parentArray,
      title: title ?? summary ?? description ?? name,
      source,
      required,
      description,
    };
  }

  return { outputs: nodeOutputs };
};

const _getParametersSortedByVisibility = (parameters: ParameterInfo[]): ParameterInfo[] => {
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
