/* eslint-disable no-param-reassign */
import { clone } from '@microsoft/utils-logic-apps';

///////////////////////////////////////////////////////////////////////////////
// This was mostly copied straight from what we have in portal

export const convertDesignerWorkflowToConsumptionWorkflow = async (_workflow: any): Promise<any> => {
  const workflow = clone(_workflow);

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

  // Set default empty connection object in definition
  workflow.definition.parameters['$connections'] = {
    type: 'Object',
    defaultValue: {},
  };

  // Alter connection references in actions
  Object.entries(workflow?.definition?.actions ?? {}).forEach(([key, action]: [key: string, value: any]) => {
    const { referenceName } = action.inputs?.host?.connection ?? {};
    if (referenceName) {
      workflow.definition.actions[key].inputs.host.connection = {
        name: `@parameters('$connections')['${referenceName}']['connectionId']`,
      };
    }
  });

  // Alter connection references in triggers
  Object.entries(workflow?.definition?.triggers ?? {}).forEach(([key, trigger]: [key: string, value: any]) => {
    const { referenceName } = trigger.inputs?.host?.connection ?? {};
    if (referenceName) {
      workflow.definition.triggers[key].inputs.host.connection = {
        name: `@parameters('$connections')['${referenceName}']['connectionId']`,
      };
    }
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

  // Remove connections from workflow root
  delete workflow?.connections;

  return workflow;
};
