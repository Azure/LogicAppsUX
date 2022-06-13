import Constants from '../../../common/constants';
import { getConnectionsQuery } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { initializeConnectionsMappings } from '../../state/connectionSlice';
import type { Operations } from '../../state/workflowSlice';
import type { RootState } from '../../store';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { equals, ConnectionReferenceKeyFormat } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export async function getConnectionsMappingForNodes(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(operations)) {
    try {
      if (
        operationManifestService.isSupported(operation.type, operation.kind) || // Danielle can I make this logic more clear? Its a little confusing the "why"; ask Priti
        isApiConnectionType(operation.type) ||
        (equals(operation.type, Constants.NODE.TYPE.MANUAL) && equals(operation.kind, Constants.NODE.KIND.APICONNECTION))
      ) {
        if (operationManifestService.isSupported(operation.type, operation.kind)) {
          tasks.push(getManifestBasedConnectionMapping(getState, nodeId, operation));
        } else {
          const connectionReferenceKey = _getLegacyConnectionReferenceKey(operation);

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

export async function getConnectionsApiAndMapping(operations: Operations, getState: () => RootState, dispatch: Dispatch): Promise<void> {
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

    const connectionReferenceKey = isOpenApiConnectionType(operationDefinition.type) // danielle can we make this more readable
      ? getConnectionReferenceKeyForManifest(connectionReferenceKeyFormat, operationDefinition)
      : isConnectionRequiredForOperation(operationManifest)
      ? _getLegacyConnectionReferenceKey(operationDefinition)
      : undefined;

    return connectionReferenceKey ? { [nodeId]: connectionReferenceKey } : undefined;
  } catch (exception) {
    // log exception
    return Promise.resolve(undefined);
  }
}

function isConnectionRequiredForOperation(manifest: OperationManifest): boolean {
  return manifest.properties.connection?.required ?? false;
}

// tslint:disable-next-line: no-any
function getConnectionReferenceKeyForManifest(
  referenceFormat: string,
  operationDefinition: any /*LogicAppsV2.OperationDefinition */
): string {
  // Danielle there is no typing corresponding to ServiceProviderConfiguration in Operation Definition, ask Priti
  switch (referenceFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return operationDefinition.inputs.function.connectionName;

    case ConnectionReferenceKeyFormat.ServiceProvider:
      return operationDefinition.inputs.serviceProviderConfiguration.connectionName;

    case ConnectionReferenceKeyFormat.OpenApi:
      return getOpenApiConnectionReferenceKey(operationDefinition.inputs as LogicAppsV2.OpenApiOperationInputs);
  }
  return '';
}

function getOpenApiConnectionReferenceKey(operationDefinition: LogicAppsV2.OpenApiOperationInputs): string {
  let connectionName: string;
  if (typeof operationDefinition.host.connection === 'string') {
    connectionName = operationDefinition.host.connection;
  } else {
    connectionName = operationDefinition.host.connection.name;
  }
  return connectionName;
}

// tslint:disable-next-line: no-any
function _getLegacyConnectionReferenceKey(_operationDefinition: any): string | undefined {
  throw new Error('Function not implemented.');
}
