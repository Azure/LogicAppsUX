/// <reference types="react" />
import type { Connector } from '@microsoft/logic-apps-shared';
export interface ConnectorConnectionsCardProps {
    connectorId: string;
    connector: Connector | undefined;
    connectionRefs?: Record<string, any>;
    disconnectedNodes?: string[];
    isLoading?: boolean;
}
export declare const ConnectorConnectionsCard: React.FC<ConnectorConnectionsCardProps>;
