import type { ConnectionMapping, ConnectionReference, ConnectionReferences, NodeId, ReferenceKey } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
import type { PayloadAction } from '@reduxjs/toolkit';
export interface ConnectionsStoreState {
    connectionsMapping: ConnectionMapping;
    connectionReferences: ConnectionReferences;
    loading: {
        initializeConnectionMappings: boolean;
    };
}
export declare const initialConnectionsState: ConnectionsStoreState;
type ConnectionReferenceMap = Record<string, ReferenceKey>;
export declare const connectionSlice: import("@reduxjs/toolkit").Slice<ConnectionsStoreState, {
    initializeConnectionReferences: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<ConnectionReferences>) => void;
    initializeConnectionsMappings: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<ConnectionMapping>) => void;
    changeConnectionMapping: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<UpdateConnectionPayload>) => void;
    changeConnectionMappingsForNodes: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<Omit<UpdateConnectionPayload, 'nodeId'> & {
        nodeIds: string[];
        reset?: boolean;
    }>) => void;
    initEmptyConnectionMap: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<NodeId[]>) => void;
    initCopiedConnectionMap: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<{
        connectionReferences: ConnectionReferenceMap;
    }>) => void;
    initScopeCopiedConnections: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<Record<string, {
        connectionReference: ConnectionReference;
        referenceKey: string;
    }>>) => void;
    removeNodeConnectionData: (state: import("immer/dist/internal").WritableDraft<ConnectionsStoreState>, action: PayloadAction<{
        nodeId: NodeId;
    }>) => void;
}, "connections">;
export declare const initializeConnectionReferences: import("@reduxjs/toolkit").ActionCreatorWithPayload<ConnectionReferences, "connections/initializeConnectionReferences">, initializeConnectionsMappings: import("@reduxjs/toolkit").ActionCreatorWithPayload<ConnectionMapping, "connections/initializeConnectionsMappings">, changeConnectionMapping: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateConnectionPayload, "connections/changeConnectionMapping">, initEmptyConnectionMap: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "connections/initEmptyConnectionMap">, initCopiedConnectionMap: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    connectionReferences: ConnectionReferenceMap;
}, "connections/initCopiedConnectionMap">, initScopeCopiedConnections: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, {
    connectionReference: ConnectionReference;
    referenceKey: string;
}>, "connections/initScopeCopiedConnections">, removeNodeConnectionData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: NodeId;
}, "connections/removeNodeConnectionData">, changeConnectionMappingsForNodes: import("@reduxjs/toolkit").ActionCreatorWithPayload<Omit<UpdateConnectionPayload, "nodeId"> & {
    nodeIds: string[];
    reset?: boolean | undefined;
}, "connections/changeConnectionMappingsForNodes">;
declare const _default: import("@reduxjs/toolkit").Reducer<ConnectionsStoreState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
