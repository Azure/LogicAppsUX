import type { ConnectionReferences } from '../../../common/models/workflow';
import { equals, getUniqueName } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionsMapping: ConnectionMapping;
  connectionReferences: ConnectionReferences;
}

type NodeId = string;
type ReferenceKey = string;
export type ConnectionMapping = Record<NodeId, ReferenceKey>;

export const initialConnectionsState: ConnectionsStoreState = {
  connectionsMapping: {},
  connectionReferences: {},
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState: initialConnectionsState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferences>) => {
      state.connectionReferences = action.payload;
    },
    initializeConnectionsMappings: (state, action: PayloadAction<ConnectionMapping>) => {
      state.connectionsMapping = action.payload;
    },
    changeConnectionMapping: (state, action: PayloadAction<{ nodeId: NodeId; connectionId: string; connectorId: string }>) => {
      const { nodeId, connectionId, connectorId } = action.payload;
      const existingReferenceKey = Object.keys(state.connectionReferences).find((referenceKey) => {
        const reference = state.connectionReferences[referenceKey];
        return equals(reference.api.id, connectorId) && equals(reference.connection.id, connectionId);
      });

      if (existingReferenceKey) {
        state.connectionsMapping[nodeId] = existingReferenceKey;
      } else {
        const { name: newReferenceKey } = getUniqueName(Object.keys(state.connectionReferences), connectorId.split('/').at(-1) as string);
        state.connectionReferences[newReferenceKey] = {
          api: { id: connectorId },
          connection: { id: connectionId },
          connectionName: connectionId.split('/').at(-1) as string,
        };
        state.connectionsMapping[nodeId] = newReferenceKey;
      }
    },
    removeNodeConnectionData: (state, action: PayloadAction<{ nodeId: NodeId }>) => {
      const { nodeId } = action.payload;
      delete state.connectionsMapping[nodeId];
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences, initializeConnectionsMappings, changeConnectionMapping, removeNodeConnectionData } =
  connectionSlice.actions;

export default connectionSlice.reducer;
