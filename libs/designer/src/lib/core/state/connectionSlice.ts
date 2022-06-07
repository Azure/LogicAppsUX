import Constants from '../../common/constants';
import { getOperationManifest } from '../queries/operation';
import type { RootState } from '../store';
import type { OperationMetadataState } from './operationMetadataSlice';
import type { Operations } from './workflowSlice';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { ConnectionReferences } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat, equals } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionReferences: ConnectionReferences; // { {referenceKey}: ConnectionReference } danielle help to explain format of reference key
  connectionsMapping: Record<string, string>; // sample data { nodeId: referenceKey }
}

export interface ConnectionReferencesPayload {
  connectionReferences: ConnectionReferences;
  connectionsMapping: Record<string, string>;
}

export interface ParameterGroup {
  id: string;
  description?: string;
  parameters: ParameterInfo[];
  showAdvancedParameters?: boolean;
  hasAdvancedParameters?: boolean;
}

const initialState: ConnectionsStoreState = {
  connectionReferences: {},
  connectionsMapping: {},
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferencesPayload>) => {
      state = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences } = connectionSlice.actions;

export default connectionSlice.reducer;

/**
 * Map nodes to associated connections
 * @arg {Operations} operations - Actions and triggers from the workflow definition
 * @return {Promise<Record<string, string>>} - A map from nodeId to a key in connectionReferences
 */
export async function getConnectionsMappingForNodes(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(operations)) {
    try {
      if (
        operationManifestService.isSupported(operation.type, operation.kind) ||
        isApiConnectionType(operation.type) ||
        (equals(operation.type, Constants.NODE.TYPE.MANUAL) && equals(operation.kind, Constants.NODE.KIND.APICONNECTION))
      ) {
        if (operationManifestService.isSupported(operation.type, operation.kind)) {
          tasks.push(_getManifestBasedConnectionMapping(getState, nodeId, operation));
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

export async function getConnectionsApiAndMapping(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
  const connectionService = ConnectionService();
  await connectionService.getConnections();
  await getConnectionsMappingForNodes(operations, getState);
  return Promise.resolve({});
}

export async function _getManifestBasedConnectionMapping(
  getState: () => RootState,
  nodeId: string,
  operationDefinition: LogicAppsV2.OperationDefinition
): Promise<Record<string, string> | undefined> {
  try {
    const { operations } = getState();
    const { connectorId, operationId } = operations.operationInfo[nodeId];
    const operationManifest = await getOperationManifest({ connectorId, operationId });
    const connectionReferenceKeyFormat =
      (operationManifest.properties.connectionReference && operationManifest.properties.connectionReference.referenceKeyFormat) ?? ''; // danielle why do we even allow empty here? Ans: some operations don't require a connection
    if (connectionReferenceKeyFormat === '') {
      return Promise.resolve(undefined);
    }
    // get connectorId and operationId from nodeId Danielle how do we get state operationMEtadataSlice
    // call getOperationManifest using connectorId and operationId
    // get from operation manifest manifest.properties.connectionReference && manifest.properties.connectionReference.referenceKeyFormat;
    // reference key format tells us which type of connection to check the name for in the Operation

    const connectionReferenceKey = isOpenApiConnectionType(operationDefinition.type)
      ? _getConnectionReferenceKeyForManifest(connectionReferenceKeyFormat, operationDefinition)
      : // eslint-disable-next-line no-constant-condition
      true // context.CardStoreUtility.isConnectionRequired(nodeId), where is this now?
      ? _getLegacyConnectionReferenceKey(operationDefinition)
      : undefined;

    return connectionReferenceKey ? { [nodeId]: connectionReferenceKey } : undefined;
  } catch (exception) {
    // log exception
    return Promise.resolve(undefined);
  }
}

// tslint:disable-next-line: no-any
function _getConnectionReferenceKeyForManifest(
  referenceFormat: string,
  operationDefinition: any /*LogicAppsV2.OperationDefinition */
): string {
  switch (referenceFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return operationDefinition.inputs.function.connectionName;
    // return getObjectPropertyValueTyped<any>(definition, ['inputs', 'function', 'connectionName']);

    case ConnectionReferenceKeyFormat.ServiceProvider:
      return operationDefinition.inputs.serviceProviderConfiguration.connectionName;
    // return getObjectPropertyValueTyped(definition, ['inputs', 'serviceProviderConfiguration', 'connectionName']);

    default: // ConnectionReferenceKeyFormat.OpenApi
      return _getOpenApiConnectionReferenceKey(operationDefinition.inputs as LogicAppsV2.OpenApiOperationInputs); // what format if refernece key format
  }
  return getConnectionKeyFromName(operationDefinition);
}

function _getOpenApiConnectionReferenceKey(operationDefinition: LogicAppsV2.OpenApiOperationInputs): string {
  let connectionName: string;
  if (typeof operationDefinition.host.connection === 'string') {
    connectionName = operationDefinition.host.connection;
  } else {
    connectionName = operationDefinition.host.connection.name;
  }
  return connectionName;
}

function getConnectionKeyFromName(definition: any): string {
  if (definition.inputs.function) {
    return definition.inputs.function.connectionName;
  } else if (definition.inputs.serviceProviderConfiguration) {
    return definition.inputs.serviceProviderConfiguration.connectionName;
  } else if (definition.inputs.host) {
    return definition.host.connectionName;
  } else return '';
}

// tslint:disable-next-line: no-any
function _getLegacyConnectionReferenceKey(operationDefinition: any): string | undefined {
  throw new Error('Function not implemented.');
}
