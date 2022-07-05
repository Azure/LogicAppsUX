import type { ConnectionsJSON } from '@microsoft-logic-apps/utils';
import { emptyConnections } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionsMapping: ConnectionMapping;
  connectionReferences: ConnectionsJSON;
}

type NodeId = string;
type ReferenceKey = string;
type ConnectionMapping = Record<NodeId, ReferenceKey>;

export const initialConnectionsState: ConnectionsStoreState = {
  connectionsMapping: {},
  connectionReferences: emptyConnections, // danielle can we simplify this by only storing certain values here
  // maybe move all similar values to the same keys?
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState: initialConnectionsState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionsJSON>) => {
      state.connectionReferences = action.payload;
    },
    initializeConnectionsMappings: (state, action: PayloadAction<ConnectionMapping>) => {
      state.connectionsMapping = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences, initializeConnectionsMappings } = connectionSlice.actions;

export default connectionSlice.reducer;
