import type { ConnectionReferences } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionsStoreState {
  connectionReferences: ConnectionReferences; // { {referenceKey}: ConnectionReference } danielle help to explain format of reference key
  connectionsMapping: Record<string, string>; // sample data { nodeId: referenceKey }
}

export interface ConnectionReferencesPayload {
  connectionReferences: ConnectionReferences;
  connectionsMapping: Record<string, string>;
}

const initialState: ConnectionsStoreState = {
  connectionReferences: {},
  connectionsMapping: {},
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferencesPayload>) => {
      state = action.payload;
    },
    initializeConnectionsMappings: (state, action: PayloadAction<Record<string, string>>) => {
      state = { ...state, connectionsMapping: action.payload };
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences } = connectionSlice.actions;

export default connectionSlice.reducer;
