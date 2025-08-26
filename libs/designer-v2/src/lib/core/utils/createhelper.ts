import { clone, type ConnectionsData, optional, type ConnectionReference } from '@microsoft/logic-apps-shared';
import { getConnection } from '../queries/connections';

export const getUpdatedConnectionForManagedApiReference = async (
  reference: ConnectionReference,
  isHybridApp = false
): Promise<ConnectionReference> => {
  const {
    api: { id: apiId },
    connection: { id: connectionId },
    connectionProperties,
  } = reference;
  const connection = await getConnection(connectionId, apiId, /* fetchResourceIfNeeded */ true);
  return {
    api: { id: apiId },
    connection: { id: connectionId },
    authentication: getAuthenticationDetails(connectionProperties, isHybridApp),
    connectionRuntimeUrl: connection?.properties?.connectionRuntimeUrl ?? '',
    connectionProperties,
  };
};

const getAuthenticationDetails = (connectionProperties: any, isHybridApp = false) => {
  if (isHybridApp) {
    return {
      audience: 'https://management.core.windows.net/',
      clientId: "@appsetting('WORKFLOWAPP_AAD_CLIENTID')",
      credentialType: 'Secret',
      secret: "@appsetting('WORKFLOWAPP_AAD_CLIENTSECRET')",
      tenant: "@appsetting('WORKFLOWAPP_AAD_TENANTID')",
      type: 'ActiveDirectoryOAuth',
    };
  }

  const userIdentity = connectionProperties?.authentication?.identity;
  return {
    type: 'ManagedServiceIdentity',
    ...optional('identity', userIdentity),
  };
};

export const getConnectionsToUpdate = (
  originalConnectionsJson: ConnectionsData,
  connectionsJson: ConnectionsData
): ConnectionsData | undefined => {
  const hasNewFunctionKeys = hasNewKeys(originalConnectionsJson.functionConnections ?? {}, connectionsJson.functionConnections ?? {});
  const hasNewApimKeys = hasNewKeys(originalConnectionsJson.apiManagementConnections ?? {}, connectionsJson.apiManagementConnections ?? {});
  const hasNewManagedApiKeys = hasNewKeys(originalConnectionsJson.managedApiConnections ?? {}, connectionsJson.managedApiConnections ?? {});
  const hasNewServiceProviderKeys = hasNewKeys(
    originalConnectionsJson.serviceProviderConnections ?? {},
    connectionsJson.serviceProviderConnections ?? {}
  );

  const hasNewManagedApiConnectionRuntimeUrl = hasNewConnectionRuntimeUrl(
    originalConnectionsJson.managedApiConnections ?? {},
    connectionsJson.managedApiConnections ?? {}
  );

  const hasNewAgentKeys = hasNewKeys(originalConnectionsJson.agentConnections ?? {}, connectionsJson.agentConnections ?? {});

  // NOTE: We don't edit connections from the workflow, so existing connections should not be changed. If no new connections are added, there was no change.
  if (
    !hasNewFunctionKeys &&
    !hasNewApimKeys &&
    !hasNewManagedApiKeys &&
    !hasNewServiceProviderKeys &&
    !hasNewAgentKeys &&
    !hasNewManagedApiConnectionRuntimeUrl
  ) {
    return undefined;
  }

  const connectionsToUpdate = clone(connectionsJson);
  for (const functionConnectionName of Object.keys(connectionsJson.functionConnections ?? {})) {
    if (originalConnectionsJson.functionConnections?.[functionConnectionName]) {
      (connectionsToUpdate.functionConnections as any)[functionConnectionName] =
        originalConnectionsJson.functionConnections[functionConnectionName];
    }
  }

  for (const apimConnectionName of Object.keys(connectionsJson.apiManagementConnections ?? {})) {
    if (originalConnectionsJson.apiManagementConnections?.[apimConnectionName]) {
      (connectionsToUpdate.apiManagementConnections as any)[apimConnectionName] =
        originalConnectionsJson.apiManagementConnections[apimConnectionName];
    }
  }

  for (const managedApiConnectionName of Object.keys(connectionsJson.managedApiConnections ?? {})) {
    if (originalConnectionsJson.managedApiConnections?.[managedApiConnectionName]) {
      (connectionsToUpdate.managedApiConnections as any)[managedApiConnectionName] =
        originalConnectionsJson.managedApiConnections[managedApiConnectionName];

      if (hasNewManagedApiConnectionRuntimeUrl) {
        const newRuntimeUrl = connectionsJson?.managedApiConnections?.[managedApiConnectionName]?.connectionRuntimeUrl;
        if (newRuntimeUrl !== undefined) {
          (connectionsToUpdate.managedApiConnections as any)[managedApiConnectionName].connectionRuntimeUrl = newRuntimeUrl;
        }
      }
    }
  }

  for (const serviceProviderConnectionName of Object.keys(connectionsJson.serviceProviderConnections ?? {})) {
    if (originalConnectionsJson.serviceProviderConnections?.[serviceProviderConnectionName]) {
      (connectionsToUpdate.serviceProviderConnections as any)[serviceProviderConnectionName] =
        originalConnectionsJson.serviceProviderConnections[serviceProviderConnectionName];
    }
  }

  for (const agentConnectionName of Object.keys(connectionsJson.agentConnections ?? {})) {
    if (originalConnectionsJson.agentConnections?.[agentConnectionName]) {
      (connectionsToUpdate.agentConnections as any)[agentConnectionName] = originalConnectionsJson.agentConnections[agentConnectionName];
    }
  }

  return connectionsToUpdate;
};

const hasNewKeys = (original: Record<string, any>, updated: Record<string, any>) => {
  return Object.keys(updated).some((key) => !Object.keys(original).includes(key));
};

const hasNewConnectionRuntimeUrl = (original: Record<string, ConnectionReference>, updated: Record<string, ConnectionReference>) => {
  return Object.keys(updated).some((key) => {
    const originalConnection = original[key];
    const updatedConnection = updated[key];
    const haveDifferentRuntimeUrl = originalConnection?.connectionRuntimeUrl !== updatedConnection?.connectionRuntimeUrl;
    const haveSameConnectionId = originalConnection?.connection.id === updatedConnection?.connection.id;
    return haveDifferentRuntimeUrl && haveSameConnectionId;
  });
};
