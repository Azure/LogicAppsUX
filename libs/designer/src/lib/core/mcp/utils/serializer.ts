import {
  type ConnectionsData,
  equals,
  guid,
  isArmResourceId,
  type LogicAppsV2,
  optional,
  type ParameterInfo,
  ExtensionProperties,
  deleteObjectProperties,
  clone,
  ResourceService,
  LoggerService,
  LogEntryLevel,
  getUniqueName,
} from '@microsoft/logic-apps-shared';
import {
  parameterHasValue,
  parameterValueToString,
  shouldEncodeParameterValueForOperationBasedOnMetadata,
} from '../../utils/parameters/helper';
import type { Settings } from '../../actions/bjsworkflow/settings';
import type { NodeOperation, NodeInputs, OperationMetadataState } from '../../state/operation/operationMetadataSlice';
import {
  getRetryPolicy,
  type SerializedParameter,
  serializeParametersFromSwagger,
  serializeSettings,
} from '../../actions/bjsworkflow/serializer';
import { getOperationInputParameters } from '../../state/operation/operationSelector';
import Constants from '../../../common/constants';
import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import { getConnectionsInWorkflowApp } from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { getConnectionsToUpdate, getUpdatedConnectionForManagedApiReference } from '../../utils/createhelper';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import { getStandardLogicAppId } from '../../configuretemplate/utils/helper';

export interface McpServerCreateData extends McpServerWorkflowData {
  serverInfo: {
    name: string;
    description: string;
  };
}

interface McpServerWorkflowData {
  logicAppId: string;
  workflows: Record<
    string,
    {
      definition: LogicAppsV2.WorkflowDefinition;
      kind: string;
    }
  >;
  connectionsData: ConnectionsData | undefined;
}

export const serializeMcpWorkflows = async (
  { subscriptionId, resourceGroup, logicAppName }: { subscriptionId: string; resourceGroup: string; logicAppName: string },
  connectionState: ConnectionsStoreState,
  operationsState: OperationMetadataState
): Promise<McpServerWorkflowData> => {
  const { operationInfo, inputParameters, settings, operationMetadata } = operationsState;
  const logicAppId = getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName);
  const workflows: Record<string, { definition: LogicAppsV2.WorkflowDefinition; kind: string }> = {};
  const promises = Object.keys(operationInfo).map(async (nodeId) => {
    const referenceName = connectionState.connectionsMapping[nodeId] as string;
    return getOperationDefinitionAndTriggerInputs(referenceName, operationInfo[nodeId], inputParameters[nodeId], settings[nodeId]);
  });

  const allOperations = await Promise.all(promises);
  const existingWorkflowNames = await getExistingWorkflowNames(subscriptionId, resourceGroup, logicAppName);

  for (const operationData of allOperations) {
    const { operationId, definition: operationDefinition, triggerInputs } = operationData;
    const definition = JSON.parse(
      JSON.stringify(generateDefinition(operationId, operationDefinition, triggerInputs, operationMetadata[operationId]?.description))
    );
    workflows[getWorkflowNameFromOperation(operationMetadata[operationId]?.summary, operationId, existingWorkflowNames)] = {
      definition,
      kind: 'Stateful',
    };
  }

  const { connectionsData } = await getConnectionsDataToSerialize(connectionState, subscriptionId, resourceGroup, logicAppName);
  return { logicAppId, workflows, connectionsData };
};

const getOperationDefinitionAndTriggerInputs = async (
  referenceName: string,
  operationInfo: NodeOperation,
  nodeInputs: NodeInputs,
  nodeSettings: Settings
): Promise<{ operationId: string; definition: LogicAppsV2.OperationDefinition; triggerInputs: SerializedParameter[] }> => {
  const { operationId, type, kind } = operationInfo;
  const allInputs = getOperationInputParameters(nodeInputs);
  const triggerInputs: SerializedParameter[] = [];
  const inputsToSerialize: SerializedParameter[] = allInputs.map((input) => {
    const updatedInput = { ...input } as SerializedParameter;
    if (isParameterSelected(updatedInput)) {
      if (!parameterHasValue(updatedInput)) {
        const { parameterName, type, required } = input;
        updatedInput.value = [
          {
            id: guid(),
            type: 'token',
            value: `triggerBody()${required ? '' : '?'}['${parameterName}']`,
            token: {
              key: `outputs.$.body.${parameterName}`,
              name: `body.${parameterName}`,
              type,
              required,
              tokenType: 'outputs',
              source: 'outputs',
            },
          },
        ];
        triggerInputs.push(input);
      }
    }

    updatedInput.value = parameterValueToString(
      updatedInput,
      true /* isDefinitionValue */,
      /* idReplacements */ {},
      shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo)
    );
    return updatedInput;
  });

  const inputPathValue = await serializeParametersFromSwagger(inputsToSerialize, operationInfo);

  return {
    operationId,
    definition: {
      type: equals(type, Constants.NODE.TYPE.API_CONNECTION) ? Constants.SERIALIZED_TYPE.API_CONNECTION : type,
      ...optional('kind', kind),
      inputs: { host: { connection: { referenceName } }, ...inputPathValue, retryPolicy: getRetryPolicy(nodeSettings) },
      ...optional('runAfter', {}),
      ...serializeSettings(nodeSettings, {} as NodeStaticResults, /* isTrigger */ false),
    },
    triggerInputs,
  };
};

const isParameterSelected = (parameter: ParameterInfo): boolean => {
  if (parameter.required) {
    return true;
  }

  if (parameter.visibility === 'important') {
    return parameter.conditionalVisibility !== false;
  }

  return !!parameter.conditionalVisibility;
};

const generateDefinition = (
  operationName: string,
  operationDefinition: LogicAppsV2.ActionDefinition,
  triggerInputs: SerializedParameter[],
  operationDescription: string | undefined
): LogicAppsV2.WorkflowDefinition => {
  const inputsSchema = generateInputsSchema(triggerInputs);
  return {
    $schema: 'https://schema.management.azure.com/schemas/2016-06-01/workflowdefinition.json#',
    contentVersion: '1.0.0',
    actions: {
      [operationName]: operationDefinition,
      Response: {
        type: 'Response',
        inputs: {
          statusCode: 200,
          body: `@body('${operationName}')`,
        },
        runAfter: {
          [operationName]: ['Succeeded', 'Failed', 'TimedOut'],
        },
      },
    },
    triggers: {
      Request: {
        type: 'Request',
        kind: 'Http',
        inputs: {
          schema: inputsSchema,
        },
        description: operationDescription,
      },
    },
  };
};

const generateInputsSchema = (inputs: SerializedParameter[]): any => {
  const required: string[] = [];
  const properties = inputs.reduce((result: Record<string, any>, input) => {
    result[input.parameterName] = transformSwaggerSchema(input.schema);

    if (input.required) {
      required.push(input.parameterName);
    }

    return result;
  }, {});

  return {
    type: 'object',
    required,
    properties,
  };
};

const transformSwaggerSchema = (schema: any): any => {
  const updatedSchema = clone(schema ?? {});
  const title = schema[ExtensionProperties.Summary] ?? schema.title;

  const properties = Object.keys(schema).filter((key) => key.startsWith('x-ms-'));
  if (properties.length) {
    deleteObjectProperties(
      updatedSchema,
      properties.map((property) => [property])
    );
  }

  updatedSchema.title = title;
  return updatedSchema;
};

export const getWorkflowNameFromOperation = (
  operationSummary: string | undefined,
  operationId: string,
  existingNames: string[]
): string => {
  const workflowName = (operationSummary ?? operationId)
    .replace(/[^\w-]+/g, '_') // Replace invalid characters with underscores
    .replace(/__+/g, '_') // Replace multiple underscores with a single underscore
    .replace(/^_+|_+$/g, ''); // Trim leading and trailing underscores

  const { name: uniqueWorkflowName } = getUniqueName(existingNames, workflowName, '_');
  return uniqueWorkflowName;
};

const getConnectionsDataToSerialize = async (
  connectionState: ConnectionsStoreState,
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string
): Promise<{ connectionsData: ConnectionsData | undefined; references: string[] }> => {
  const { connectionReferences, connectionsMapping } = connectionState;
  const queryClient = getReactQueryClient();
  const referencesToSerialize = Object.values(connectionsMapping).reduce((result: string[], referenceKey: string | null) => {
    if (referenceKey && !result.includes(referenceKey)) {
      result.push(referenceKey);
    }
    return result;
  }, []);

  const originalConnectionsData = await getConnectionsInWorkflowApp(subscriptionId, resourceGroup, logicAppName as string, queryClient);
  const managedApiConnections = { ...(originalConnectionsData?.managedApiConnections ?? {}) };

  await Promise.all(
    referencesToSerialize.map(async (referenceKey) => {
      const reference = connectionReferences[referenceKey];
      if (isArmResourceId(reference?.connection?.id)) {
        managedApiConnections[referenceKey] = await getUpdatedConnectionForManagedApiReference(reference, /* isHybridApp */ false);
      }
    })
  );

  const updatedConnectionsData = { ...originalConnectionsData, managedApiConnections };

  return {
    connectionsData: getConnectionsToUpdate(originalConnectionsData, updatedConnectionsData),
    references: referencesToSerialize,
  };
};

const getExistingWorkflowNames = async (subscriptionId: string, resourceGroup: string, logicAppName: string): Promise<string[]> => {
  try {
    const workflows = await ResourceService().listWorkflowsInApp(subscriptionId, resourceGroup, logicAppName);
    return workflows?.map((workflow) => workflow.name) ?? [];
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'McpServer.getExistingWorkflowNames',
      error,
      message: `Error while fetching existing workflow names for the logicApp: ${logicAppName}`,
    });
    return [];
  }
};
