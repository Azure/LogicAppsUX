import type { Connection, ConnectionProperties } from '@microsoft/logic-apps-shared';
import { equals, getConnectionErrors } from '@microsoft/logic-apps-shared';
import type { IntlShape } from 'react-intl';

export type ConnectionWithFlattenedProperties = Omit<Connection, 'properties'> & Connection['properties'] & { invalid: boolean };

/**
 * Checks if a connection is a dynamic (OBO) connection.
 */
export const isDynamicConnection = (connection: Connection | ConnectionProperties): boolean => {
  const properties = 'properties' in connection ? connection.properties : connection;
  return equals(properties.features ?? '', 'DynamicUserInvoked', true);
};

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

export const getSubLabelForConnection = (item: ConnectionProperties, intl: IntlShape): string | undefined => {
  const dynamicConnectionLabel = intl.formatMessage({
    defaultMessage: 'Dynamic connection',
    id: 'qOlTwq',
    description: 'Label shown for dynamic (OBO) connections in connection picker sublabel',
  });

  return (
    item.parameterValues?.gateway?.name ??
    item.authenticatedUser?.name ??
    item.accountName ??
    item.connectionParameters?.agentModelType?.type ??
    (isDynamicConnection(item) ? dynamicConnectionLabel : undefined)
  );
};
