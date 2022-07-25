import type { Connection, ConnectionStatus } from '@microsoft-logic-apps/utils';

export function getConnectionErrors(connection: Connection): ConnectionStatus[] {
  if (connection && connection.properties && connection.properties.statuses) {
    return connection.properties.statuses.filter((status) => status.status === 'error');
  }
  return [];
}
