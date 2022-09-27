import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
import type { Connection, ConnectionStatus } from '@microsoft-logic-apps/utils';

export function getConnectionErrors(connection: Connection): ConnectionStatus[] {
  return (connection?.properties?.statuses ?? []).filter((status) => status.status === 'error');
}

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  const { connectionsMapping, connectionReferences } = state;
  const reference = connectionReferences[connectionsMapping[nodeId]];
  return reference ? reference.connection.id : '';
}
