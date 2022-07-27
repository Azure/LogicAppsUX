import type { ConnectionReferences } from '../../../common/models/workflow';
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
    changeConnectionMapping: (state, action: PayloadAction<{ nodeId: NodeId; connectionId?: string; referenceKey?: ReferenceKey }>) => {
      const { nodeId, referenceKey } = action.payload;
      state.connectionsMapping[nodeId] = referenceKey;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences, initializeConnectionsMappings, changeConnectionMapping } = connectionSlice.actions;

export default connectionSlice.reducer;
