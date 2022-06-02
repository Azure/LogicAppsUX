import type { Settings } from '../actions/bjsworkflow/settings';
import type { ConnectionReferences, OperationInfo } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
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

export interface ParameterGroup {
  id: string;
  description?: string;
  parameters: ParameterInfo[];
  showAdvancedParameters?: boolean;
  hasAdvancedParameters?: boolean;
}


const initialState: ConnectionsStoreState = {
    connectionReferences: {},
    connectionsMapping: {}
};

export const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    initializeConnectionReferences: (state, action: PayloadAction<ConnectionReferencesPayload>) => {
      state = action.payload;
    },
    // initializeInputParameters: (state, action: PayloadAction<AddInputsPayload>) => {
    //   const { id, isLoading, parameterGroups } = action.payload;
    //   state.inputParameters[id] = { isLoading, parameterGroups };
    // },
    // initializeOutputParameters: (state, action: PayloadAction<AddOutputsPayload>) => {
    //   const { id, isLoading, outputs } = action.payload;
    //   state.outputParameters[id] = { isLoading, outputs };
    // },
    // updateNodeSettings: (state, action: PayloadAction<AddSettingsPayload>) => {
    //   const { id, settings } = action.payload;
    //   if (!state.settings[id]) {
    //     state.settings[id] = {};
    //   }

    //   state.settings[id] = { ...state.settings[id], ...settings };
    // },
  },
});

// Action creators are generated for each case reducer function
export const { initializeConnectionReferences } =
  connectionSlice.actions;

export default connectionSlice.reducer;
