/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import type { NodeData, NodeInputs, NodeOutputs, OutputInfo } from '../../state/operationMetadataSlice';
import { initializeOperationInfo, initializeNodes } from '../../state/operationMetadataSlice';
import { clearPanel } from '../../state/panel/panelSlice';
import type { Operations } from '../../state/workflowSlice';
import { isRootNode } from '../../utils/graph';
import {
  loadParameterValuesFromDefault,
  ParameterGroupKeys,
  toParameterInfoMap,
  updateParameterWithValues,
  updateTokenMetadata,
} from '../../utils/parameters/helper';
import { isTokenValueSegment } from '../../utils/parameters/segment';
import { getOperationSettings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { ManifestParser, PropertyName, Visibility } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import {
  getPropertyValue,
  map,
  aggregate,
  ConnectionReferenceKeyFormat,
  equals,
  getObjectPropertyValue,
  unmap,
} from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';

export interface NodeDataWithManifest extends NodeData {
  manifest: OperationManifest;
}

export const initializeOperationMetadata = async (deserializedWorkflow: DeserializedWorkflow, dispatch: Dispatch): Promise<void> => {
  const promises: Promise<NodeDataWithManifest[] | undefined>[] = [];
  const { actionData: operations, graph, nodesMetadata } = deserializedWorkflow;
  const operationManifestService = OperationManifestService();
  let triggerNodeId = '';

  for (const [operationId, operation] of Object.entries(operations)) {
    const isTrigger = isRootNode(graph, operationId, nodesMetadata);

    if (isTrigger) {
      triggerNodeId = operationId;
    }
    if (operationManifestService.isSupported(operation.type)) {
      promises.push(initializeOperationDetailsForManifest(operationId, operation, isTrigger, dispatch));
    } else {
      // swagger case here
    }
  }

  const allNodeData = aggregate((await Promise.all(promises)).filter((data) => !!data) as NodeDataWithManifest[][]);

  updateTokenMetadataInParameters(allNodeData, operations, triggerNodeId);
  dispatch(clearPanel());
  dispatch(
    initializeNodes(
      allNodeData.map((data) => {
        const { id, nodeInputs, nodeOutputs, settings } = data;
        return { id, nodeInputs, nodeOutputs, settings };
      })
    )
  );
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isTrigger: boolean,
  dispatch: Dispatch
): Promise<NodeDataWithManifest[] | undefined> => {
  try {
    const operationInfo = await getOperationInfo(nodeId, operation);

    if (operationInfo) {
      const manifest = await getOperationManifest(operationInfo);

      dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));

      const nodeInputs = getInputParametersFromManifest(nodeId, manifest, operation);
      const nodeOutputs = getOutputParametersFromManifest(nodeId, manifest);
      const settings = getOperationSettings(operation, isTrigger, operation.type, manifest);

      const childGraphInputs = processChildGraphAndItsInputs(manifest, operation);
      return [{ id: nodeId, nodeInputs, nodeOutputs, settings, manifest }, ...childGraphInputs];
    }

    return;
  } catch (error) {
    const errorMessage = `Unable to initialize operation details for operation - ${nodeId}. Error details - ${error}`;
    console.log(errorMessage);

    return;
  }
};

const processChildGraphAndItsInputs = (
  manifest: OperationManifest,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition
): NodeDataWithManifest[] => {
  const { subGraphDetails } = manifest.properties;
  const nodesData: NodeDataWithManifest[] = [];

  if (subGraphDetails) {
    for (const subGraphKey of Object.keys(subGraphDetails)) {
      const { inputs, inputsLocation, isAdditive } = subGraphDetails[subGraphKey];
      const subOperation = getPropertyValue(operation, subGraphKey);
      if (inputs) {
        const subManifest = { properties: { inputs, inputsLocation } } as any;
        if (isAdditive) {
          for (const subNodeKey of Object.keys(subOperation)) {
            nodesData.push({
              id: subNodeKey,
              nodeInputs: getInputParametersFromManifest(subNodeKey, subManifest, subOperation[subNodeKey]),
              nodeOutputs: { outputs: {} },
              manifest: subManifest,
            });
          }
        }

        nodesData.push({
          id: subGraphKey,
          nodeInputs: getInputParametersFromManifest(subGraphKey, subManifest, subOperation),
          nodeOutputs: { outputs: {} },
          manifest: subManifest,
        });
      }
    }
  }

  return nodesData;
};

const getInputParametersFromManifest = (nodeId: string, manifest: OperationManifest, stepDefinition: any): NodeInputs => {
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
      inputsLocation ? getObjectPropertyValue(stepDefinition, inputsLocation) : stepDefinition.inputs,
      '',
      primaryInputParametersInArray,
      true /* createInvisibleParameter */,
      false /* useDefault */
    );
  } else {
    loadParameterValuesFromDefault(primaryInputParameters);
  }

  const allParametersAsArray = toParameterInfoMap(primaryInputParametersInArray, stepDefinition, nodeId);

  // TODO(14490585)- Initialize editor view models

  const defaultParameterGroup = {
    id: ParameterGroupKeys.DEFAULT,
    description: '',
    parameters: allParametersAsArray,
  };
  const parameterGroups = {
    [ParameterGroupKeys.DEFAULT]: defaultParameterGroup,
  };

  // TODO(14490585)- Add enum parameters
  // TODO(14490747)- Add recurrence parameters
  // TODO(14490691)- Initialize dynamic inputs.

  defaultParameterGroup.parameters = _getParametersSortedByVisibility(defaultParameterGroup.parameters);

  return { parameterGroups };
};

const getOutputParametersFromManifest = (nodeId: string, manifest: OperationManifest): NodeOutputs => {
  // TODO(14490747) - Update operation manifest for triggers with split on.

  const operationOutputs = new ManifestParser(manifest).getOutputParameters(
    true /* includeParentObject */,
    Constants.MAX_INTEGER_NUMBER /* expandArrayOutputsDepth */,
    false /* expandOneOf */,
    undefined /* data */,
    true /* selectAllOneOfSchemas */
  );

  // TODO(14490691) - Get dynamic schema output

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

const updateTokenMetadataInParameters = (nodes: NodeDataWithManifest[], operations: Operations, triggerNodeId: string) => {
  const nodesData = map(nodes, 'id');
  const actionNodes = nodes
    .map((node) => node.id)
    .filter((nodeId) => nodeId !== triggerNodeId)
    .reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});

  for (const nodeData of nodes) {
    const {
      nodeInputs: { parameterGroups },
    } = nodeData;
    const allParameters = aggregate(Object.keys(parameterGroups).map((groupKey) => parameterGroups[groupKey].parameters));
    for (const parameter of allParameters) {
      const segments = parameter.value;

      if (segments && segments.length) {
        parameter.value = segments.map((segment) => {
          if (isTokenValueSegment(segment)) {
            segment = updateTokenMetadata(segment, actionNodes, triggerNodeId, nodesData, operations, parameter.type);
          }

          return segment;
        });
      }
    }
  }
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
