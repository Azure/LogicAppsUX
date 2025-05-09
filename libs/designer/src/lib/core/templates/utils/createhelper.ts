import { clone, type LogicAppsV2, type Template } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import { parseWorkflowParameterValue } from '../../actions/bjsworkflow/serializer';
import { isOpenApiSchemaVersion } from '../../../common/utilities/Utils';

interface WorkflowPayload {
  definition: LogicAppsV2.WorkflowDefinition;
  parameters: Record<string, WorkflowParameter>;
  connections?: ConnectionReferences;
  metadata?: Record<string, any>;
  connectionReferences?: ConnectionReferences;
}

export const getConsumptionWorkflowPayloadForCreate = (
  definition: LogicAppsV2.WorkflowDefinition,
  parameterDefinitions: Record<string, Template.ParameterDefinition>,
  connections: { references: ConnectionReferences; mapping: Record<string, string> },
  templateName: string,
  replaceIdentifier: string
): WorkflowPayload => {
  let sanitizedWorkflowDefinition = JSON.stringify(definition);
  const parameters: Record<string, WorkflowParameter> = {};
  // Sanitizing parameter name & body
  Object.keys(parameterDefinitions).forEach((key) => {
    const parameter = parameterDefinitions[key];
    const sanitizedParameterName = replaceWorkflowIdentifier(parameter.name, replaceIdentifier);
    parameters[sanitizedParameterName] = {
      type: parameter.type,
      value: parseWorkflowParameterValue(parameter.type, parameter?.value ?? parameter?.default),
    };
    sanitizedWorkflowDefinition = replaceAllStringInWorkflowDefinition(sanitizedWorkflowDefinition, parameter.name, sanitizedParameterName);
  });

  const { references, stringifiedDefinition: updatedStringifiedDefinition } = updateConnectionsDataWithNewConnections(
    connections,
    sanitizedWorkflowDefinition,
    replaceIdentifier
  );
  const workflowDefinition = JSON.parse(updatedStringifiedDefinition);
  return convertDesignerWorkflowToConsumptionWorkflow(
    {
      definition: workflowDefinition,
      parameters,
      connections: references,
      metadata: {
        templates: {
          type: 'Workflow',
          name: templateName,
        },
      },
    },
    { shouldKeepDefinitionParameters: true }
  );
};

const workflowIdentifier = '#workflowname#';
const replaceWorkflowIdentifier = (content: string, replaceWith: string) => content.replaceAll(workflowIdentifier, replaceWith);
const replaceAllStringInWorkflowDefinition = (workflowDefinition: string, oldString: string, newString: string) => {
  return workflowDefinition.replaceAll(oldString, newString);
};

const updateConnectionsDataWithNewConnections = (
  connections: { references: ConnectionReferences; mapping: Record<string, string> },
  stringifiedDefinition: string,
  replaceWith: string
): { references: ConnectionReferences; stringifiedDefinition: string } => {
  const { references, mapping } = connections;
  const referencesToAdd: ConnectionReferences = {};
  let updatedDefinition = stringifiedDefinition;

  for (const connectionKey of Object.keys(mapping)) {
    const referenceKey = mapping[connectionKey];
    referencesToAdd[referenceKey] = references[referenceKey];
    if (connectionKey === referenceKey) {
      updatedDefinition = replaceAllStringInWorkflowDefinition(
        updatedDefinition,
        referenceKey,
        replaceWorkflowIdentifier(referenceKey, replaceWith)
      );
    } else {
      updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, connectionKey, referenceKey);
    }
  }

  const newConnectionsObj: ConnectionReferences = {};
  for (const referenceKey of Object.keys(referencesToAdd)) {
    const reference = referencesToAdd[referenceKey];

    const { api, connection, connectionProperties, connectionRuntimeUrl } = reference;
    newConnectionsObj[replaceWorkflowIdentifier(referenceKey, replaceWith)] = {
      api,
      connection,
      connectionId: isOpenApiSchemaVersion(JSON.parse(stringifiedDefinition)) ? undefined : connection.id,
      connectionProperties,
      connectionRuntimeUrl,
    };
  }

  return {
    references: newConnectionsObj,
    stringifiedDefinition: updatedDefinition,
  };
};

const convertDesignerWorkflowToConsumptionWorkflow = (
  _workflow: WorkflowPayload,
  options?: {
    shouldKeepDefinitionParameters?: boolean;
  }
) => {
  const workflow = clone(_workflow);
  const isOpenApiSchema = isOpenApiSchemaVersion(workflow.definition);

  // Initialize parameters if they don't exist
  if (!workflow?.parameters) {
    workflow.parameters = {};
  }
  if (!workflow?.definition?.parameters) {
    workflow.definition.parameters = {};
  }

  // Move parameter data around
  const parameterEntries = Object.entries(workflow?.parameters ?? {});
  parameterEntries.forEach(([key, param]: [key: string, param: any]) => {
    const value = param?.value;
    (workflow.definition.parameters as any)[key] = options?.shouldKeepDefinitionParameters
      ? {
          ...workflow.definition.parameters?.[key],
          ...clone(param),
        }
      : clone(param);
    delete (workflow.definition.parameters?.[key] as any)?.value;
    const isSecure = param?.type === 'SecureString' || param?.type === 'SecureObject';
    if (isSecure) {
      workflow.parameters[key] = {} as WorkflowParameter;
    }
    // Make sure secure parameters don't send values from designer
    else if (value) {
      workflow.parameters[key] = { value } as WorkflowParameter;
    } else {
      delete workflow.parameters[key];
    }
  });

  if (isOpenApiSchema) {
    if (workflow?.connections) {
      workflow.connectionReferences = workflow.connections;
    }
  } else {
    // Move connection data to parameters
    if (workflow?.connections) {
      workflow.parameters = {
        ...workflow.parameters,
        $connections: {
          value: {
            ...workflow.connections,
          },
        } as WorkflowParameter,
      };
    }

    // Set default empty connection object in definition
    workflow.definition.parameters.$connections = {
      type: 'Object',
      defaultValue: {},
    };

    // Alter connection references in actions
    traverseDefinition(workflow?.definition, alterOperationConnectionReference);

    // Alter connection references in triggers
    Object.values(workflow?.definition?.triggers ?? {}).forEach((trigger: any) => {
      alterOperationConnectionReference(trigger);
    });

    // Move connection references to root parameters
    if (workflow?.connectionReferences) {
      if (!workflow.parameters?.$connections) {
        workflow.parameters.$connections = { type: 'Object', value: {} };
      }
      Object.entries(workflow.connectionReferences ?? {}).forEach(([key, connection]: [key: string, value: any]) => {
        workflow.parameters.$connections.value[key] = {
          id: connection.api.id,
          connectionId: connection.connection.id,
          connectionName: connection.connectionName,
          ...(connection?.connectionProperties ? { connectionProperties: connection.connectionProperties } : {}),
        };
      });
      delete workflow.connectionReferences;
    }
  }

  // Remove connections from workflow root
  delete workflow?.connections;

  return workflow;
};

const traverseDefinition = (operation: any, callback: (operation: any) => void) => {
  // Need to check in `actions`, `else.actions`, `default.actions`, `Object.values(cases).actions`
  const children = {
    ...(operation?.actions ?? {}),
    ...(operation?.else?.actions ?? {}),
    ...(operation?.default?.actions ?? {}),
    ...(Object.values(operation?.cases ?? {}).reduce(
      (acc: any, curr: any) => ({
        // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
        ...acc,
        ...curr.actions,
      }),
      {}
    ) as any),
  };

  Object.values(children).forEach((child: any) => {
    callback(child);
    traverseDefinition(child, callback);
  });
  callback(operation);
};

const alterOperationConnectionReference = (operation: any) => {
  const { referenceName } = operation.inputs?.host?.connection ?? {};
  if (referenceName) {
    operation.inputs.host.connection = {
      name: `@parameters('$connections')['${referenceName}']['connectionId']`,
    };
  }
};
