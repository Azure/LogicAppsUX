import type { AddAssertionPayload, AddMockResultPayload, UnitTestState } from './unitTestInterfaces';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialUnitTestState: UnitTestState = {
  mockResults: new Map(),
  assertions: [],
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    addMockResult: (state: UnitTestState, action: PayloadAction<AddMockResultPayload>) => {
      const { operationName, mockResult } = action.payload;
      state.mockResults.set(operationName, mockResult);
    },
    addAssertion: (state: UnitTestState, action: PayloadAction<AddAssertionPayload>) => {
      const { assertion } = action.payload;
      state.assertions.push(assertion);
    },
  },
});

export const { addAssertion } = unitTestSlice.actions;

export default unitTestSlice.reducer;
