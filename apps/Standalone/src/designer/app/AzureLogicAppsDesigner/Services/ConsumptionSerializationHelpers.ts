/* eslint-disable no-param-reassign */
import { isOpenApiSchemaVersion } from '@microsoft/logic-apps-designer';
import { clone } from '@microsoft/logic-apps-shared';

///////////////////////////////////////////////////////////////////////////////
// This was mostly copied straight from what we have in portal

export const convertDesignerWorkflowToConsumptionWorkflow = async (_workflow: any): Promise<any> => {
  const workflow = clone(_workflow);
  const isOpenApiSchema = isOpenApiSchemaVersion(workflow.definition);

  // Initialize parameters if they don't exist
  if (!workflow?.parameters) {
    workflow['parameters'] = {};
  }
  if (!workflow?.definition?.parameters) {
    workflow.definition['parameters'] = {};
  }

  // Move parameter data around
  const parameterEntries = Object.entries(workflow?.parameters ?? {});
  parameterEntries.forEach(([key, param]: [key: string, param: any]) => {
    const value = param?.value;
    workflow.definition.parameters[key] = clone(param);
    delete workflow.definition.parameters[key]?.value;
    if (value) {
      workflow.parameters[key] = { value };
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
        },
      };
    }

    // Set default empty connection object in definition for older schemas
    workflow.definition.parameters['$connections'] = {
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
        workflow.parameters.$connections = { value: {} };
      }
      Object.entries(workflow.connectionReferences ?? {}).forEach(([key, connection]: [key: string, value: any]) => {
        // For dynamic connections, pull runtimeSource out to root level
        const runtimeSource = connection?.connectionProperties?.runtimeSource;
        const remainingConnectionProperties = connection?.connectionProperties
          ? Object.fromEntries(Object.entries(connection.connectionProperties).filter(([propKey]) => propKey !== 'runtimeSource'))
          : undefined;
        const hasRemainingProps = remainingConnectionProperties && Object.keys(remainingConnectionProperties).length > 0;

        const connectionValue: any = {
          connectionId: connection.connection.id,
          connectionName: connection.connectionName,
          id: connection.api.id,
          ...(runtimeSource ? { runtimeSource } : {}),
          ...(hasRemainingProps ? { connectionProperties: remainingConnectionProperties } : {}),
        };

        workflow.parameters.$connections.value[key] = connectionValue;
      });
      delete workflow.connectionReferences;
    }
  }

  // Remove connections from workflow root
  delete workflow?.connections;

  return workflow;
};

const traverseDefinition = (operation: any, callback: (operation: any) => void) => {
  const children = {
    ...(operation?.actions ?? {}),
    ...(operation?.else?.actions ?? {}),
    ...(operation?.default?.actions ?? {}),
    ...(Object.values(operation?.cases ?? {}).reduce((acc: any, curr: any) => {
      return {
        // biome-ignore lint/performance/noAccumulatingSpread: There are probably better ways to do this but this is a more complex one to fix
        ...acc,
        ...curr.actions,
      };
    }, {}) as any),
    // Also traverse into agent tools actions
    ...(Object.values(operation?.tools ?? {}).reduce((acc: any, curr: any) => {
      return {
        // biome-ignore lint/performance/noAccumulatingSpread: There are probably better ways to do this but this is a more complex one to fix
        ...acc,
        ...curr.actions,
      };
    }, {}) as any),
  };

  Object.values(children).forEach((child: any) => {
    callback(child);
    traverseDefinition(child, callback);
  });
  callback(operation);
};

const alterOperationConnectionReference = (operation: any) => {
  // Handle OpenApi/ApiConnection format (most common for API connections)
  const hostConnection = operation.inputs?.host?.connection;
  if (hostConnection?.referenceName) {
    operation.inputs.host.connection = {
      name: `@parameters('$connections')['${hostConnection.referenceName}']['connectionId']`,
    };
    return;
  }

  // Handle Service Provider format
  const serviceProviderConfig = operation.inputs?.serviceProviderConfiguration;
  if (serviceProviderConfig?.connectionName) {
    // Service provider connections already use connectionName, no change needed
    return;
  }

  // Handle Function format
  const functionConnection = operation.inputs?.function;
  if (functionConnection?.connectionName) {
    // Function connections already use connectionName, no change needed
    return;
  }

  // Handle API Management format
  const apiManagementConnection = operation.inputs?.apiManagement?.connection;
  if (apiManagementConnection && typeof apiManagementConnection === 'string') {
    // API Management connections use a connection string, no change needed
    return;
  }
};
