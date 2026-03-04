import type { OperationActionData } from '@microsoft/designer-ui';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import type { Connector, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import type { WorkflowKind } from '../../state/workflow/workflowInterfaces';
type AddConnectorAsOpreationPayload = {
    connector?: Connector;
    actionData?: OperationActionData[];
    relationshipIds: RelationshipIds;
};
export declare const ConnectorManifest: OperationManifest;
export declare const addConnectorAsOperation: import("@reduxjs/toolkit").AsyncThunk<void, AddConnectorAsOpreationPayload, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const initializeConnectorOperationDetails: (nodeId: string, _operation: LogicAppsV2.ConnectorAction, workflowKind: WorkflowKind, dispatch: Dispatch) => Promise<NodeDataWithOperationMetadata[] | undefined>;
export {};
