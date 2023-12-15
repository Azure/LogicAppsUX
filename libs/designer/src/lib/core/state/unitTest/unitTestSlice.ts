import type { AddAssertionPayload, AddMockResultPayload, InitDefintionPayload, UnitTestState } from './unitTestInterfaces';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialUnitTestState: UnitTestState = {
  mockResults: {},
  assertions: [],
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    initUnitTestDefinition: (state: UnitTestState, action: PayloadAction<InitDefintionPayload | null>) => {
      if (!isNullOrUndefined(action.payload)) {
        const { assertions, mockResults } = action.payload;
        state.assertions = assertions;
        state.mockResults = mockResults;
      }
    },
    addMockResult: (state: UnitTestState, action: PayloadAction<AddMockResultPayload>) => {
      const { operationName, mockResult } = action.payload;
      state.mockResults[operationName] = mockResult;
    },
    addAssertion: (state: UnitTestState, action: PayloadAction<AddAssertionPayload>) => {
      const { assertion } = action.payload;
      state.assertions.push(assertion);
    },
  },
});

export const { addAssertion, addMockResult, initUnitTestDefinition } = unitTestSlice.actions;

export default unitTestSlice.reducer;
