import { type ConnectionsData, type ConnectionReference } from '@microsoft/logic-apps-shared';
export declare const getUpdatedConnectionForManagedApiReference: (reference: ConnectionReference, isHybridApp?: boolean) => Promise<ConnectionReference>;
export declare const getConnectionsToUpdate: (originalConnectionsJson: ConnectionsData, connectionsJson: ConnectionsData) => ConnectionsData | undefined;
