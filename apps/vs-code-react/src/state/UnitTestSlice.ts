import type { UnitTestResult } from '@microsoft/vscode-extension-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface UnitTestState {
  hostVersion?: string;
  unitTestName?: string;
  testResults?: UnitTestResult;
}

export interface InitializeUnitTestPayload {
  hostVersion: string;
  unitTestName: string;
  unitTestDescription: string;
  project: string;
  testResults: UnitTestResult;
}

const initialState: UnitTestState = {
  hostVersion: '',
  unitTestName: '',
  testResults: undefined,
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState,
  reducers: {
    initializeUnitTest: (state: UnitTestState, action: PayloadAction<InitializeUnitTestPayload>) => {
      state.hostVersion = action.payload.hostVersion;
      state.unitTestName = action.payload.unitTestName;
      state.testResults = action.payload.testResults;
    },
  },
});

export const { initializeUnitTest } = unitTestSlice.actions;

export default unitTestSlice.reducer;
