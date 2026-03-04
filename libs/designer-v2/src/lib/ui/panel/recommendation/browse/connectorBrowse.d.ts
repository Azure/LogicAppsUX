import type { ConnectorFilterTypes } from './helper';
export interface ConnectorBrowseProps {
    categoryKey: string;
    onConnectorSelected?: (connectorId: string, origin?: string) => void;
    connectorFilters?: ConnectorFilterTypes;
    filters?: Record<string, string>;
    displayRuntimeInfo?: boolean;
}
export declare const ConnectorBrowse: ({ categoryKey, onConnectorSelected, connectorFilters, filters, displayRuntimeInfo, }: ConnectorBrowseProps) => import("react/jsx-runtime").JSX.Element;
