import { recurseSerializeCondition } from '../../utils/parameters/helper';
import type {
  UpdateAssertionsPayload,
  UpdateAssertionPayload,
  AddMockResultPayload,
  InitDefintionPayload,
  UnitTestState,
} from './unitTestInterfaces';
import { type ParameterInfo } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import { type Assertion, type AssertionDefintion, guid, isNullOrUndefined, equals, getRecordEntry } from '@microsoft/utils-logic-apps';
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
  validationErrors: {},
};

const parseAssertions = (assertions: Assertion[]): Record<string, AssertionDefintion> => {
  return assertions.reduce((acc, assertion) => {
    const { name, description, expression } = assertion;
    const id = guid();
    return { ...acc, [id]: { id, name, description, expression, isEditable: false } };
  }, {});
};

export const validateAssertion = (
  id: string,
  data: { name?: string; expression?: Record<string, any> },
  keyToValidate: string,
  allDefinitions: Record<string, AssertionDefintion>
): string | undefined => {
  const intl = getIntl();

  switch (keyToValidate?.toLowerCase()) {
    case 'name': {
      const { name } = data;
      if (!name) {
        return intl.formatMessage({
          defaultMessage: 'Must provide the Assertion name.',
          description: 'Error message when the workflow assertion name is empty.',
        });
      }

      const duplicateParameters = Object.keys(allDefinitions).filter(
        (assertionId) => assertionId !== id && equals(allDefinitions[assertionId].name, name)
      );

      return duplicateParameters.length > 0
        ? intl.formatMessage({
            defaultMessage: 'Assertion name already exists.',
            description: 'Error message when the workflow assertion name already exists.',
          })
        : undefined;
    }
    case 'expression': {
      const { expression } = data;
      const expresisonErrors: string[] = [];
      recurseSerializeCondition(
        {
          suppressCasting: false,
          info: {
            isDynamic: false,
          },
        } as ParameterInfo,
        expression?.items,
        false,
        {},
        expresisonErrors
      );

      return expresisonErrors.length > 0 ? expresisonErrors[0] : undefined;
    }

    default: {
      return undefined;
    }
  }
};

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    initUnitTestDefinition: (state: UnitTestState, action: PayloadAction<InitDefintionPayload | null>) => {
      if (!isNullOrUndefined(action.payload)) {
        const { mockResults, assertions } = action.payload;
        state.assertions = parseAssertions(assertions);
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
      const { name, id, description, expression } = assertionToUpdate;
      const validationErrors = {
        name: validateAssertion(id, { name }, 'name', state.assertions),
        expression: validateAssertion(id, { expression }, 'expression', state.assertions),
      };
      state.assertions[id] = {
        ...state.assertions[id],
        name,
        description,
        expression,
      };
      const newErrorObj = {
        ...(getRecordEntry(state.validationErrors, id) ?? {}),
        ...validationErrors,
      };
      if (!newErrorObj.name) delete newErrorObj.name;
      if (!newErrorObj.expression) delete newErrorObj.expression;
      if (Object.keys(newErrorObj).length === 0) {
        delete state.validationErrors[id];
      } else {
        state.validationErrors[id] = newErrorObj;
      }
    },
  },
});

export const { updateAssertions, addMockResult, updateAssertion, initUnitTestDefinition } = unitTestSlice.actions;

export default unitTestSlice.reducer;
