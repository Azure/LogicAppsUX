import type { ConnectionsData } from '../Models/Workflow';
import isEqual from 'lodash.isequal';

export const shouldUseProductionArtifacts = (productionModifiedTime?: string, draftModifiedTime?: string): boolean => {
  const productionTime = Date.parse(productionModifiedTime ?? '');
  const draftTime = Date.parse(draftModifiedTime ?? '');
  if (!Number.isFinite(productionTime) || !Number.isFinite(draftTime)) {
    console.warn('Unable to compare production and draft modification times; preserving the existing draft.');
    return false;
  }
  return productionTime >= draftTime;
};

export const mergeConnectionsData = (
  fromServer: ConnectionsData,
  local: ConnectionsData,
  previousServer: ConnectionsData | undefined
): ConnectionsData => {
  const mergeCategory = <T>(
    server: Record<string, T> | undefined,
    current: Record<string, T> | undefined,
    previous: Record<string, T> | undefined
  ): Record<string, T> => {
    const localChanges: Record<string, T> = {};
    for (const [name, connection] of Object.entries(current ?? {})) {
      if (!isEqual(connection, previous?.[name])) {
        localChanges[name] = connection;
      }
    }
    return { ...server, ...localChanges };
  };

  return {
    managedApiConnections: mergeCategory(
      fromServer.managedApiConnections,
      local.managedApiConnections,
      previousServer?.managedApiConnections
    ),
    serviceProviderConnections: mergeCategory(
      fromServer.serviceProviderConnections,
      local.serviceProviderConnections,
      previousServer?.serviceProviderConnections
    ),
    functionConnections: mergeCategory(fromServer.functionConnections, local.functionConnections, previousServer?.functionConnections),
    apiManagementConnections: mergeCategory(
      fromServer.apiManagementConnections,
      local.apiManagementConnections,
      previousServer?.apiManagementConnections
    ),
    agentConnections: mergeCategory(fromServer.agentConnections, local.agentConnections, previousServer?.agentConnections),
    agentMcpConnections: mergeCategory(fromServer.agentMcpConnections, local.agentMcpConnections, previousServer?.agentMcpConnections),
  };
};
