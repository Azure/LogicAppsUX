import type { Connection, ConnectionStatus } from '@microsoft-logic-apps/utils';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';

export function getConnectionErrors(connection: Connection): ConnectionStatus[] {
  if (connection && connection.properties && connection.properties.statuses) {
    return connection.properties.statuses.filter((status) => status.status === 'error');
  }
  return [];
}

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  const { connectionsMapping, connectionReferences } = state;
  const reference = connectionReferences[connectionsMapping[nodeId]];
  return reference ? reference.connection.id : 'Not Found';
}
