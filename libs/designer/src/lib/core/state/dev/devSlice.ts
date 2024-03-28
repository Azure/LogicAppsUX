import { resetWorkflowState } from '../global';
import type { DevState } from './devInterfaces';
import { createSlice } from '@reduxjs/toolkit';

const initialState: DevState = {
  reduxActionCounts: {},
};

export const devSlice = createSlice({
  name: 'dev',
  initialState,
  reducers: {
    // Nothing for now
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
    builder.addDefaultCase((state, action) => {
      state.reduxActionCounts = {
        ...state.reduxActionCounts,
        [action.type]: (state.reduxActionCounts?.[action.type] ?? 0) + 1,
      };
    });
  },
});

export default devSlice.reducer;
