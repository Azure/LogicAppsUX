import type React from 'react';
import type { ConnectionWithFlattenedProperties } from './selectConnection.helpers';
interface ConnectionTableDetailsButtonProps {
    connection: ConnectionWithFlattenedProperties;
    isXrmConnectionReferenceMode: boolean;
}
export declare const ConnectionTableDetailsButton: (props: ConnectionTableDetailsButtonProps) => React.ReactElement;
export {};
