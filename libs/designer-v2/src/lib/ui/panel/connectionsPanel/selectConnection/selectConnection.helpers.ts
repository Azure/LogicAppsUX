import type { Connection, ConnectionProperties } from '@microsoft/logic-apps-shared';
import { getConnectionErrors } from '@microsoft/logic-apps-shared';

export type ConnectionWithFlattenedProperties = Omit<Connection, 'properties'> & Connection['properties'] & { invalid: boolean };

export const flattenConnection = (connection: Connection): ConnectionWithFlattenedProperties => {
  const { properties: connectionProperties, ...restConnection } = connection;
  const errors = getConnectionErrors(connection);
  return {
    ...restConnection,
    ...connectionProperties,
    invalid: errors.length > 0,
  };
};

export const compareFlattenedConnections = (a: ConnectionWithFlattenedProperties, b: ConnectionWithFlattenedProperties): number => {
  if (a.invalid && !b.invalid) {
    return 1;
  }
  if (!a.invalid && b.invalid) {
    return -1;
  }
  return a.displayName.localeCompare(b.displayName);
};

export const getLabelForConnection = (item: ConnectionProperties): string => {
  return item.displayName;
};

export const getSubLabelForConnection = (item: ConnectionProperties): string | undefined => {
  return item.parameterValues?.gateway?.name ?? item.authenticatedUser?.name ?? item.accountName;
};
