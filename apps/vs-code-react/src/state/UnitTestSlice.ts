import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface UnitTestState {
  hostVersion?: string;
  unitTestName?: string;
  unitTestDescription?: string;
}

const initialState: UnitTestState = {
  hostVersion: '',
  unitTestName: '',
  unitTestDescription: '',
};

export const unitTestSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    initialize: (state: UnitTestState, action: PayloadAction<any>) => {
      state.hostVersion = action.payload.hostVersion;
      state.unitTestName = action.payload.unitTestName;
      state.unitTestDescription = action.payload.unitTestDescription;
    },
  },
});

export const { initialize } = unitTestSlice.actions;

export default unitTestSlice.reducer;
