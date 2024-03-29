import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface UnitTestState {
  hostVersion?: string;
  unitTestName?: string;
}

export interface InitializeUnitTestPayload {
  hostVersion: string;
  unitTestName: string;
  unitTestDescription: string;
  project: string;
}

const initialState: UnitTestState = {
  hostVersion: '',
  unitTestName: '',
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState,
  reducers: {
    initializeUnitTest: (state: UnitTestState, action: PayloadAction<InitializeUnitTestPayload>) => {
      state.hostVersion = action.payload.hostVersion;
      state.unitTestName = action.payload.unitTestName;
    },
  },
});

export const { initializeUnitTest } = unitTestSlice.actions;

export default unitTestSlice.reducer;
