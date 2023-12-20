import type {
  UpdateAssertionsPayload,
  UpdateAssertionPayload,
  AddMockResultPayload,
  InitDefintionPayload,
  UnitTestState,
} from './unitTestInterfaces';
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
  assertions: {},
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    initUnitTestDefinition: (state: UnitTestState, action: PayloadAction<InitDefintionPayload | null>) => {
      if (!isNullOrUndefined(action.payload)) {
        const { mockResults } = action.payload;
        // state.assertions = assertions;
        state.mockResults = mockResults;
      }
    },
    addMockResult: (state: UnitTestState, action: PayloadAction<AddMockResultPayload>) => {
      const { operationName, mockResult } = action.payload;
      state.mockResults[operationName] = mockResult;
    },
    updateAssertions: (state: UnitTestState, action: PayloadAction<UpdateAssertionsPayload>) => {
      const { assertions } = action.payload;
      state.assertions = assertions;
    },
    updateAssertion: (state: UnitTestState, action: PayloadAction<UpdateAssertionPayload>) => {
      const { assertionToUpdate } = action.payload;
      const { name, id, description } = assertionToUpdate;
      state.assertions[id] = {
        ...state.assertions[id],
        name,
        description,
      };
    },
  },
});

export const { updateAssertions, addMockResult, updateAssertion, initUnitTestDefinition } = unitTestSlice.actions;

export default unitTestSlice.reducer;
