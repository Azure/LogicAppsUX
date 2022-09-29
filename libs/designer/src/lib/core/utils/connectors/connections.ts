import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';

export function getConnectionId(state: ConnectionsStoreState, nodeId: string): string {
  const { connectionsMapping, connectionReferences } = state;
  const reference = connectionReferences[connectionsMapping[nodeId]];
  return reference ? reference.connection.id : '';
}
