import type { LogicAppsV2, ParameterInfo, Template } from '@microsoft/logic-apps-shared';
import { normalizeConnectorId, OperationManifestService } from '@microsoft/logic-apps-shared';
import { getCustomSwaggerIfNeeded, getInputParametersFromManifest } from '../../actions/bjsworkflow/initialize';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationInfo, getOperationManifest } from '../../queries/operation';
import { isRootNodeInGraph } from '../../utils/graph';
import { getInputParametersFromSwagger, getOperationInfo as getSwaggerOperationInfo } from '../../utils/swagger/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import { convertToValueSegments } from '../../utils/parameters/helper';
import type { Token } from '@microsoft/designer-ui';
import { isParameterToken, isTokenValueSegment } from '../../utils/parameters/segment';

export interface TemplateOperationParametersMetadata {
  parameterDefinitions: Record<string, Template.ParameterDefinition>;
  inputsPayload: NodeOperationInputsData[];
}

export const initializeParametersMetadata = async (
  templateId: string,
  workflows: Record<string, WorkflowTemplateData>,
  parameterDefinitions: Record<string, Template.ParameterDefinition>,
  connections: Record<string, Template.Connection>,
  resourceDetails: { subscriptionId: string; location: string }
): Promise<TemplateOperationParametersMetadata> => {
  const parametersToInitialize = Object.keys(parameterDefinitions).reduce(
    (result: Record<string, TemplateParameter[]>, currentKey: string) => {
      const parameter = parameterDefinitions[currentKey];
      if (parameter.dynamicData) {
        const workflowId = parameter.dynamicData?.workflow as string;
        if (!result[workflowId]) {
          result[workflowId] = [];
        }
        result[workflowId].push({ id: currentKey, ...parameter });
      }
      return result;
    },
    {}
  );
  const inputsPayload: NodeOperationInputsData[] = [];
  const updatedParameterDefinitions: Record<string, Template.ParameterDefinition> = {};
  const promises: Promise<OperationDetails | undefined>[] = [];

  for (const workflowId of Object.keys(parametersToInitialize)) {
    const operationParameters = parametersToInitialize[workflowId];
    const operationsToInitialize = operationParameters.reduce((result: Record<string, TemplateParameter[]>, currentParameter) => {
      if (currentParameter.dynamicData) {
        if (!result[currentParameter.dynamicData?.operation as string]) {
          result[currentParameter.dynamicData.operation] = [];
        }
        result[currentParameter.dynamicData.operation].push(currentParameter);
      }
      return result;
    }, {});
    const deserializedWorkflow = Deserialize(workflows[workflowId].workflowDefinition, /* runInstance */ null);
    const { actionData: operations, nodesMetadata } = deserializedWorkflow;

    for (const operationId of Object.keys(operationsToInitialize)) {
      const parametersToInitialize = operationsToInitialize[operationId];
      const isTrigger = isRootNodeInGraph(operationId, 'root', nodesMetadata);
      const operation = operations[operationId];
      const nodeId = `${templateId}-${workflowId}-${operationId}`;
      const templateConnectionKey = parametersToInitialize[0].dynamicData?.connection as string;
      const connectorId = normalizeConnectorId(
        connections[templateConnectionKey].connectorId,
        resourceDetails.subscriptionId,
        resourceDetails.location
      ).toLowerCase();

      if (connectorId) {
        promises.push(initializeOperationDetails(nodeId, operation, connectorId, isTrigger, parametersToInitialize));
      }
    }
  }

  const allNodeData = (await Promise.all(promises)).filter((data) => !!data) as OperationDetails[];
  for (const nodeData of allNodeData) {
    const { id, nodeInputs, nodeOperationInfo, inputDependencies, templateParameters } = nodeData;

    for (const parameter of templateParameters) {
      const parameterId = parameter.id;
      const operationParameter = getAndUpdateOperationParameterForTemplateParameter(
        nodeInputs,
        parameterId,
        parameter.value ?? parameter.default
      );

      if (operationParameter) {
        delete (parameter as any)['id'];
        updatedParameterDefinitions[parameterId] = {
          ...parameter,
          associatedOperationParameter: {
            operationId: id,
            parameterId: operationParameter.id,
          },
        };
      }
    }

    inputsPayload.push({ id, nodeInputs, nodeDependencies: { inputs: inputDependencies, outputs: {} }, operationInfo: nodeOperationInfo });
  }

  return { parameterDefinitions: updatedParameterDefinitions, inputsPayload };
};

type TemplateParameter = Template.ParameterDefinition & { id: string };
interface OperationDetails {
  id: string;
  nodeInputs: NodeInputs;
  nodeOperationInfo: NodeOperation;
  inputDependencies: Record<string, DependencyInfo>;
  templateParameters: TemplateParameter[];
}

const initializeOperationDetails = async (
  nodeId: string,
  operation: LogicAppsV2.OperationDefinition,
  connectorId: string,
  isTrigger: boolean,
  templateParameters: TemplateParameter[]
): Promise<OperationDetails | undefined> => {
  const operationManifestService = OperationManifestService();
  if (operationManifestService.isSupported(operation.type, operation.kind)) {
    const operationInfo = await getOperationInfo(nodeId, operation, isTrigger);
    const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
    const manifest = await getOperationManifest(operationInfo);
    const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operation);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
      nodeId,
      nodeOperationInfo,
      manifest,
      /* presetParameterValues */ undefined,
      customSwagger,
      operation
    );

    return { id: nodeId, nodeInputs, nodeOperationInfo, inputDependencies, templateParameters };
  }

  const operationInfo = await getSwaggerOperationInfo(nodeId, operation as LogicAppsV2.ApiConnectionAction, {}, connectorId);
  if (operationInfo) {
    const nodeOperationInfo = { ...operationInfo, type: operation.type, kind: operation.kind };
    const { parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);

    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromSwagger(
      nodeId,
      isTrigger,
      parsedSwagger,
      nodeOperationInfo,
      operation
    );
    return { id: nodeId, nodeInputs, nodeOperationInfo, inputDependencies, templateParameters };
  }

  return undefined;
};

const getAndUpdateOperationParameterForTemplateParameter = (
  nodeInputs: NodeInputs,
  parameterName: string,
  parameterValue: any
): ParameterInfo | undefined => {
  let result: ParameterInfo | undefined;

  for (const groupKey of Object.keys(nodeInputs.parameterGroups)) {
    nodeInputs.parameterGroups[groupKey].parameters = nodeInputs.parameterGroups[groupKey].parameters.map((parameter) => {
      const value = parameter.value;
      if (
        value.length === 1 &&
        isTokenValueSegment(value[0]) &&
        isParameterToken(value[0].token as Token) &&
        value[0].token?.name === parameterName
      ) {
        parameter.value = convertToValueSegments(parameterValue, !parameter.suppressCasting /* shouldUncast */, parameter.type);
        result = parameter;
      }

      return parameter;
    });
  }

  return result;
};

export const updateOperationParameterWithTemplateParameterValue = (parameterId: string, value: any, nodeInputs: NodeInputs): void => {
  for (const groupKey of Object.keys(nodeInputs.parameterGroups)) {
    nodeInputs.parameterGroups[groupKey].parameters = nodeInputs.parameterGroups[groupKey].parameters.map((parameter) => {
      if (parameter.id === parameterId) {
        parameter.value = convertToValueSegments(value, !parameter.suppressCasting /* shouldUncast */, parameter.type);
      }
      return parameter;
    });
  }
};
