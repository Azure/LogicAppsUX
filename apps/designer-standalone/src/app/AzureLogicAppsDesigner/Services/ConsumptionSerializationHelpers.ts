/* eslint-disable no-param-reassign */
import { isOpenApiSchemaVersion } from '@microsoft/logic-apps-designer';
import { clone } from '@microsoft/utils-logic-apps';

///////////////////////////////////////////////////////////////////////////////
// This was mostly copied straight from what we have in portal

export const convertDesignerWorkflowToConsumptionWorkflow = async (_workflow: any): Promise<any> => {
  const workflow = clone(_workflow);
  const isOpenApiSchema = isOpenApiSchemaVersion(workflow.definition);

  // Initialize parameters if they don't exist
  if (!workflow?.parameters) workflow['parameters'] = {};
  if (!workflow?.definition?.parameters) workflow.definition['parameters'] = {};

  // Move parameter data around
  const parameterEntries = Object.entries(workflow?.parameters ?? {});
  parameterEntries.forEach(([key, param]: [key: string, param: any]) => {
    const value = param?.value;
    workflow.definition.parameters[key] = clone(param);
    delete workflow.definition.parameters[key]?.value;
    if (value) workflow.parameters[key] = { value };
    else delete workflow.parameters[key];
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
        workflow.parameters.$connections.value[key] = {
          connectionId: connection.connection.id,
          connectionName: connection.connectionName,
          id: connection.api.id,
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
