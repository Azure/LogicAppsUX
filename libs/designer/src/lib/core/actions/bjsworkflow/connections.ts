import Constants from '../../../common/constants';
import { getConnectionsQuery } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { initializeConnectionsMappings } from '../../state/connectionSlice';
import type { Operations } from '../../state/workflowSlice';
import type { RootState } from '../../store';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { Connector, OperationManifest } from '@microsoft-logic-apps/utils';
import { equals, ConnectionReferenceKeyFormat } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export async function getConnectionsMappingForNodesRefactor(
  operations: Operations,
  getState: () => RootState
): Promise<Record<string, string>> {
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(operations)) {
    try {
      if (operationManifestService.isSupported(operation.type, operation.kind)) {
        tasks.push(getManifestBasedConnectionMapping(getState, nodeId, operation));
      } else if (
        isApiConnectionType(operation.type) ||
        (equals(operation.type, Constants.NODE.TYPE.MANUAL) && equals(operation.kind, Constants.NODE.KIND.APICONNECTION))
      ) {
        const connectionReferenceKey = getLegacyConnectionReferenceKey(operation);

        if (connectionReferenceKey !== undefined) {
          connectionsMapping[nodeId] = connectionReferenceKey;
        }
      } else {
        // no connection needed
      }
    } catch (exception) {
      // log exception
    }
  }
  const mappings = await Promise.all(tasks);
  for (const mapping of mappings) {
    connectionsMapping = { ...connectionsMapping, ...mapping };
  }

  return connectionsMapping;
}

export async function getConnectionsMappingForNodes(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(operations)) {
    try {
      if (
        operationManifestService.isSupported(operation.type, operation.kind) || // Danielle to refactor this logic to make it more clear no. 14723337
        isApiConnectionType(operation.type) ||
        (equals(operation.type, Constants.NODE.TYPE.MANUAL) && equals(operation.kind, Constants.NODE.KIND.APICONNECTION))
      ) {
        if (operationManifestService.isSupported(operation.type, operation.kind)) {
          tasks.push(getManifestBasedConnectionMapping(getState, nodeId, operation));
        } else {
          const connectionReferenceKey = getLegacyConnectionReferenceKey(operation);

          if (connectionReferenceKey !== undefined) {
            connectionsMapping[nodeId] = connectionReferenceKey;
          }
        }
      }
    } catch (exception) {
      // log exception
    }
  }

  const mappings = await Promise.all(tasks);
  for (const mapping of mappings) {
    connectionsMapping = { ...connectionsMapping, ...mapping };
  }

  return connectionsMapping;
}

const isApiConnectionType = (type: string): boolean => {
  return (
    equals(type, Constants.NODE.TYPE.API_CONNECTION) ||
    equals(type, Constants.NODE.TYPE.API_CONNECTION_WEBHOOK) ||
    equals(type, Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
  );
};

const isOpenApiConnectionType = (type: string): boolean => {
  return (
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
  );
};

export async function getConnectionsApiAndMapping(operations: Operations, getState: () => RootState, dispatch: Dispatch) {
  getConnectionsQuery();
  const connectionsMappings = await getConnectionsMappingForNodes(operations, getState);
  dispatch(initializeConnectionsMappings(connectionsMappings));
  return;
}

export async function getManifestBasedConnectionMapping(
  getState: () => RootState,
  nodeId: string,
  operationDefinition: LogicAppsV2.OperationDefinition
): Promise<Record<string, string> | undefined> {
  try {
    const { operations } = getState();
    const { connectorId, operationId } = operations.operationInfo[nodeId];
    const operationManifest = await getOperationManifest({ connectorId, operationId });
    const connectionReferenceKeyFormat =
      (operationManifest.properties.connectionReference && operationManifest.properties.connectionReference.referenceKeyFormat) ?? '';
    if (connectionReferenceKeyFormat === '') {
      return Promise.resolve(undefined);
    }

    let connectionReferenceKey: string | undefined;
    if (isOpenApiConnectionType(operationDefinition.type) || connectionReferenceKeyFormat !== undefined) {
      connectionReferenceKey = getConnectionReferenceKeyForManifest(connectionReferenceKeyFormat, operationDefinition);
    } else if (isConnectionRequiredForOperation(operationManifest)) {
      connectionReferenceKey = getLegacyConnectionReferenceKey(operationDefinition);
    } else {
      connectionReferenceKey = undefined;
    }

    return connectionReferenceKey ? { [nodeId]: connectionReferenceKey } : undefined;
  } catch (exception) {
    // log exception
    return Promise.resolve(undefined);
  }
}

export function isConnectionRequiredForOperation(manifest: OperationManifest): boolean {
  return manifest.properties.connection ? manifest.properties.connection.required : needsConnection(manifest.properties.connector);
}

export function needsConnection(_connector: Connector | undefined): boolean {
  // needs to be implemented: work item 14936435
  return true;
}

function getConnectionReferenceKeyForManifest(referenceFormat: string, operationDefinition: LogicAppsV2.OperationDefinition): string {
  switch (referenceFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return (operationDefinition as LogicAppsV2.FunctionAction).inputs.function.connectionName;

    case ConnectionReferenceKeyFormat.ServiceProvider:
      return (operationDefinition as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName;

    case ConnectionReferenceKeyFormat.OpenApi:
      return getOpenApiConnectionReferenceKey((operationDefinition as LogicAppsV2.OpenApiOperationAction).inputs);
  }
  return '';
}

function getOpenApiConnectionReferenceKey(operationDefinition: LogicAppsV2.OpenApiOperationInputs): string {
  let connectionName: string;
  if (typeof operationDefinition.host.connection === 'string') {
    connectionName = operationDefinition.host.connection;
  } else {
    connectionName = operationDefinition.host.connection.referenceName;
  }
  return connectionName;
}

export function getLegacyConnectionReferenceKey(operationDefinition: any): string | undefined {
  // danielle how is open api different
  let referenceKey: string;
  if (typeof operationDefinition.inputs.host.connection === 'string') {
    referenceKey = operationDefinition.inputs.host.connection;
  } else {
    referenceKey = operationDefinition.inputs.host.connection.referenceName;
  }
  return referenceKey;
}
