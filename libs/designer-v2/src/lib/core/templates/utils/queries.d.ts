import type { UseQueryResult } from '@tanstack/react-query';
export interface ConnectorInfo {
    id: string;
    displayName: string;
    iconUrl?: string;
}
export declare const useConnectorInfo: (connectorId: string | undefined, operationId: string | undefined, useCachedData?: boolean, enabled?: boolean) => UseQueryResult<ConnectorInfo | undefined, unknown>;
export declare const getCustomTemplates: (resourceDetails: {
    subscriptionId?: string;
    resourceGroup?: string;
    subscriptionIds?: string[];
}) => Promise<import("@microsoft/logic-apps-shared").CustomTemplateResource[]>;
