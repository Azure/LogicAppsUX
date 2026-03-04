import { type Connection, type Connector } from '@microsoft/logic-apps-shared';
import type { ApiHubAuthentication } from '../../../../common/models/workflow';
export declare const CreateConnectionWrapper: () => import("react/jsx-runtime").JSX.Element;
export interface CreatedConnectionPayload {
    connector: Connector;
    connection: Connection;
    connectionProperties?: Record<string, any>;
    authentication?: ApiHubAuthentication;
}
