/* eslint-disable no-param-reassign */
import type { ApiManagementInstanceService } from '@microsoft/designer-client-services-logic-apps';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { equals, clone, unmap } from '@microsoft/utils-logic-apps';

///////////////////////////////////////////////////////////////////////////////
// Designer workflow to consumption workflow

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

///////////////////////////////////////////////////////////////////////////////
// APIM

// Walk through each apim action, if it does not have an explicit operation id, get it from the path and method values
export const parseApimOperationIds = async (workflow: any, apiManagementService: ApiManagementInstanceService): Promise<void> => {
  if (workflow?.triggers) {
    await parseApimActionOperationIds(workflow.triggers, apiManagementService);
    deserializeApimPathValues(workflow.triggers);
  }
  if (workflow?.actions) {
    await parseApimActionOperationIds(workflow.actions, apiManagementService);
    deserializeApimPathValues(workflow.actions);
  }
};

export const parseApimActionOperationIds = async (_actions: any, apiManagementService: ApiManagementInstanceService): Promise<void> => {
  const actions = Object.entries(_actions)?.filter(([_, action]: [string, any]) => equals(action?.type, 'ApiManagement')) ?? [];
  await Promise.all(
    actions.map(async ([actionId, action]: [string, any]) => {
      if (action.inputs?.apiManagement?.operationId) return;
      const { api, pathTemplate, method } = action?.inputs ?? {};
      const apiId = api?.id;
      const path = pathTemplate?.template;
      if (!apiId || !path || !method) return;
      const swagger = new SwaggerParser(await SwaggerParser.parse(await apiManagementService.fetchApiMSwagger(apiId)));
      if (!swagger) return;
      const apimOperation = getOperationFromSwagger(swagger, path, method);
      if (!apimOperation) return;
      const { operationId } = apimOperation;
      _actions[actionId].inputs = { ..._actions[actionId].inputs, apiManagement: { operationId } };
    })
  );
};

export const serializeApimOperations = async (workflow: any, apiManagementService: ApiManagementInstanceService): Promise<void> => {
  if (workflow?.triggers) {
    await serializeApimActionOperations(workflow.triggers, apiManagementService);
    serializeApimPathValues(workflow.triggers);
  }
  if (workflow?.actions) {
    await serializeApimActionOperations(workflow.actions, apiManagementService);
    serializeApimPathValues(workflow.actions);
  }
};

export const serializeApimActionOperations = async (_actions: any, apiManagementService: ApiManagementInstanceService): Promise<void> => {
  const actions = Object.entries(_actions)?.filter(([_, action]: [string, any]) => equals(action?.type, 'ApiManagement')) ?? [];
  await Promise.all(
    actions.map(async ([actionId, action]: [string, any]) => {
      const opId = action.inputs?.apiManagement?.operationId;
      if (!opId) return;
      const apiId = action?.inputs?.api?.id;
      const swagger = new SwaggerParser(await SwaggerParser.parse(await apiManagementService.fetchApiMSwagger(apiId)));
      if (!swagger) return;
      const apimOperation = getOperationFromSwaggerById(swagger, opId);
      if (!apimOperation) return;
      const { method, path } = apimOperation;
      const template = `${swagger.api?.basePath}${path}`;
      _actions[actionId].inputs = {
        ..._actions[actionId].inputs,
        method,
        pathTemplate: {
          ..._actions[actionId].inputs.pathTemplate,
          template,
        },
      };
      if (_actions[actionId]?.inputs?.apiManagement) delete _actions[actionId].inputs.apiManagement;
    })
  );
};

export const deserializeApimPathValues = (_actions: any): void => {
  const actions = Object.entries(_actions)?.filter(([_, action]: [string, any]) => equals(action?.type, 'ApiManagement')) ?? [];
  actions.forEach(([actionId, action]: [string, any]) => {
    const pathParams = clone(action.inputs?.pathTemplate?.parameters ?? {});
    // for each value in pathParams, remove 'encodeURIComponent' string
    Object.keys(pathParams).forEach((key) => {
      pathParams[key] = pathParams[key].replace(`@{encodeURIComponent('`, '').replace(`')}`, '');
    });
    _actions[actionId].inputs = {
      ..._actions[actionId].inputs,
      pathTemplate: {
        ..._actions[actionId].inputs.pathTemplate,
        parameters: pathParams,
      },
    };
  });
};

export const serializeApimPathValues = (_actions: any): void => {
  const actions = Object.entries(_actions)?.filter(([_, action]: [string, any]) => equals(action?.type, 'ApiManagement')) ?? [];
  actions.forEach(async ([actionId, action]: [string, any]) => {
    const pathParams = clone(action.inputs?.pathTemplate?.parameters ?? {});
    // for each value in pathParams, add 'encodeURIComponent' string
    Object.keys(pathParams).forEach((key) => {
      if (pathParams[key].startsWith(`@{encodeURIComponent('`)) return;
      pathParams[key] = `@{encodeURIComponent('${pathParams[key]}')}`;
    });
    _actions[actionId].inputs = {
      ..._actions[actionId].inputs,
      pathTemplate: {
        ..._actions[actionId].inputs.pathTemplate,
        parameters: pathParams,
      },
    };
  });
};

export const getOperationFromSwaggerById = (swagger: any, operationId: string): any => {
  const operations = swagger.getOperations();
  return unmap(operations).find((operation: any) => operation.operationId === operationId);
};

export const getOperationFromSwagger = (swagger: any, path: string, method: string): any => {
  const operations = swagger.getOperations();
  const opPath = path.replace(swagger.api?.basePath, '');
  return unmap(operations).find((operation: any) => operation.path === opPath && operation.method === method);
};
