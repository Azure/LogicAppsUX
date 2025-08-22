import { createSlice } from '@reduxjs/toolkit';
import { initializeCloneServices } from '../../../core/actions/bjsworkflow/clone';
import { resetCloneState } from '../global';

export interface McpOptionsState {
  servicesInitialized: boolean;
  disableConfiguration: boolean;
  reInitializeServices?: boolean;
}

const initialState: McpOptionsState = {
  servicesInitialized: false,
  disableConfiguration: true,
};

export const cloneOptionsSlice = createSlice({
  name: 'cloneOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(resetCloneState, () => initialState);
    builder.addCase(initializeCloneServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export default cloneOptionsSlice.reducer;
