import type { Connection, ConnectionProperties } from '@microsoft/logic-apps-shared';
export type ConnectionWithFlattenedProperties = Omit<Connection, 'properties'> & Connection['properties'] & {
    invalid: boolean;
};
export declare const flattenConnection: (connection: Connection) => ConnectionWithFlattenedProperties;
export declare const compareFlattenedConnections: (a: ConnectionWithFlattenedProperties, b: ConnectionWithFlattenedProperties) => number;
export declare const getLabelForConnection: (item: ConnectionProperties) => string;
export declare const getSubLabelForConnection: (item: ConnectionProperties) => string | undefined;
