import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionsMapping: Record<string, string>; // Mapping is { nodeId: referenceKey }
}

export interface ConnectionReferencesPayload {
  connectionsMapping: Record<string, string>;
}

export const initialConnectionsState: ConnectionsStoreState = {
  connectionsMapping: {},
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState: initialConnectionsState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferencesPayload>) => {
      return action.payload;
    },
    initializeConnectionsMappings: (state, action: PayloadAction<Record<string, string>>) => {
      state.connectionsMapping = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences, initializeConnectionsMappings } = connectionSlice.actions;

export default connectionSlice.reducer;
