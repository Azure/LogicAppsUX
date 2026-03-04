import type { Connector } from '@microsoft/logic-apps-shared';
export interface ConnectorCardProps {
    connector: Connector;
    onClick?: (connectorId: string) => void;
    displayRuntimeInfo?: boolean;
}
export declare const ConnectorCard: ({ connector, onClick, displayRuntimeInfo }: ConnectorCardProps) => import("react/jsx-runtime").JSX.Element;
