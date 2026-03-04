import { type Connector } from '@microsoft/logic-apps-shared';
type ConnectorDetailsViewProps = {
    connector?: Connector;
    onOperationClick: (id: string, apiId?: string, forceAsTrigger?: boolean) => void;
};
export declare const ConnectorDetailsView: ({ connector, onOperationClick }: ConnectorDetailsViewProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
