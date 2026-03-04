import { type CreateButtonTexts } from './createConnection';
import type { ConnectionParameterSetValues, ConnectionMetadata, Connection, OperationManifest } from '@microsoft/logic-apps-shared';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import type { CreatedConnectionPayload } from './createConnectionWrapper';
export declare const CreateConnectionInternal: (props: {
    classes?: Record<string, string> | undefined;
    connectionName?: string | undefined;
    connectorId: string;
    operationType: string;
    existingReferences: string[];
    hideCancelButton: boolean;
    showActionBar: boolean;
    updateConnectionInState: (payload: CreatedConnectionPayload) => void;
    onConnectionCreated: (connection: Connection) => void;
    onConnectionCancelled?: (() => void) | undefined;
    createButtonTexts?: CreateButtonTexts | undefined;
    description?: string | undefined;
    nodeIds?: string[] | undefined;
    isAgentSubgraph?: boolean | undefined;
    assistedConnectionProps?: AssistedConnectionProps | undefined;
    connectionMetadata?: ConnectionMetadata | undefined;
    updateOperationParameterValues?: ((values?: Record<string, any>) => void) | undefined;
    operationManifest?: OperationManifest | undefined;
    workflowKind?: string | undefined;
    workflowMetadata?: {
        agentType?: string | undefined;
    } | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare function getConnectionParameterSetValues(selectedParameterSetName: string, outputParameterValues: Record<string, any>, validParameterKeys?: string[]): ConnectionParameterSetValues;
