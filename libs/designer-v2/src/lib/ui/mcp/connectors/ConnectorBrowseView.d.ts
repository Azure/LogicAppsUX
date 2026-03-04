import type { Connector } from '@microsoft/logic-apps-shared';
interface ConnectorBrowseViewProps {
    connectors: Connector[];
    isLoading: boolean;
    onConnectorSelect: (connectorId: string) => void;
    searchTerm: string;
}
export declare const ConnectorBrowseView: ({ connectors, isLoading, onConnectorSelect, searchTerm }: ConnectorBrowseViewProps) => import("react/jsx-runtime").JSX.Element;
export {};
