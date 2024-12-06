import { validateParameter } from '../workflowparameters/workflowparametersSlice';
import type {
  AddAssertionPayload,
  UpdateAssertionPayload,
  updateMockPayload,
  InitDefintionPayload,
  UnitTestState,
  updateMockResultPayload,
  DeleteAssertionsPayload,
  UpdateAssertioExpressionPayload,
} from './unitTestInterfaces';
import {
  type Assertion,
  type AssertionDefinition,
  guid,
  isNullOrUndefined,
  equals,
  getRecordEntry,
  isNullOrEmpty,
  getIntl,
} from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialUnitTestState: UnitTestState = {
  mockResults: {},
  assertions: {},
  validationErrors: {
    assertions: {},
    mocks: {},
  },
};

const parseAssertions = (assertions: Assertion[]): Record<string, AssertionDefinition> => {
  return assertions.reduce((acc, assertion) => {
    const { name, description, assertionString } = assertion;
    const id = guid();
    return Object.assign(acc, { [id]: { id, name, description, assertionString, isEditable: false } });
  }, {});
};

/**
 * Validates an assertion based on the provided parameters.
 * @param {string} id - The ID of the assertion.
 * @param  {{ name?: string; expression?: Record<string, any> }} data - The data object containing the assertion name and expression.
 * @param {string} keyToValidate - The key to validate ('name' or 'expression').
 * @param  {Record<string, AssertionDefinition>} allDefinitions - The record of all assertion definitions.
 * @returns A string with an error message if the assertion is invalid, otherwise undefined.
 */
const validateAssertion = (
  id: string,
  data: { name?: string; expression?: string },
  keyToValidate: string,
  allDefinitions: Record<string, AssertionDefinition>
): string | undefined => {
  const intl = getIntl();

  switch (keyToValidate?.toLowerCase()) {
    case 'name': {
      const { name } = data;
      if (!name) {
        return intl.formatMessage({
          defaultMessage: 'Must provide the assertion name.',
          id: 'tHDcfJ',
          description: 'Error message when the assertion name is empty.',
        });
      }

      const duplicateParameters = Object.keys(allDefinitions).filter(
        (assertionId) => assertionId !== id && equals(allDefinitions[assertionId].name, name)
      );

      return duplicateParameters.length > 0
        ? intl.formatMessage({
            defaultMessage: 'Assertion name already exists.',
            id: 'l0hO5f',
            description: 'Error message when the workflow assertion name already exists.',
          })
        : undefined;
    }
    case 'expression': {
      const { expression } = data;
      if (!expression) {
        return intl.formatMessage({
          defaultMessage: 'Must provide a condition expression.',
          id: 'FUvA4o',
          description: 'Error message when the assertion condition expression is empty.',
        });
      }

      return undefined;
    }

    default: {
      return undefined;
    }
  }
};

/**
 * Checks the assertions for errors and updates the validation errors in the state.
 * @param {UnitTestState} state - The current state of the unit test.
 */
const checkAssertionsErrors = (state: UnitTestState) => {
  for (const assertion of Object.values(state.assertions)) {
    const { name, id, assertionString } = assertion;

    const validationErrors = {
      name: validateAssertion(id, { name }, 'name', state.assertions),
      expression: validateAssertion(id, { expression: assertionString }, 'expression', state.assertions),
    };
    const newErrorObj = {
      ...(getRecordEntry(state.validationErrors.assertions, id) ?? {}),
      ...validationErrors,
    };
    if (!newErrorObj.name) {
      delete newErrorObj.name;
    }
    if (!newErrorObj.expression) {
      delete newErrorObj.expression;
    }
    if (Object.keys(newErrorObj).length === 0) {
      delete state.validationErrors.assertions[id];
    } else {
      state.validationErrors.assertions[id] = newErrorObj;
    }
  }
};

const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    initUnitTestDefinition: (state: UnitTestState, action: PayloadAction<InitDefintionPayload | null>) => {
      if (!isNullOrUndefined(action.payload)) {
        const { mockResults, assertions } = action.payload;
        state.assertions = parseAssertions(assertions);
        state.mockResults = mockResults;
        checkAssertionsErrors(state);
      }
    },
    updateMockSuccess: (state: UnitTestState, action: PayloadAction<updateMockPayload>) => {
      const { operationName, outputs, outputId, completed, type } = action.payload;
      const operationOutputs = state.mockResults[operationName]?.output || {};
      const operationOutputId = `${operationName}-${outputId}`;
      const validationResults = {
        value: validateParameter(outputId, { type: type, value: outputs[0]?.value ?? undefined }, 'value', {}, false),
      };

      const newErrorObj = {
        ...(getRecordEntry(state.validationErrors.mocks, operationOutputId) ?? {}),
        ...validationResults,
      };
      if (!newErrorObj.value) {
        delete newErrorObj.value;
      }
      if (Object.keys(newErrorObj).length === 0) {
        delete state.validationErrors.mocks[operationOutputId];
      } else {
        state.validationErrors.mocks[operationOutputId] = newErrorObj;
      }

      if (isNullOrEmpty(operationOutputs)) {
        state.mockResults[operationName] = { ...state.mockResults[operationName], output: { [outputId]: outputs } };
      } else {
        state.mockResults[operationName].output[outputId] = outputs;
      }
      state.mockResults[operationName].isCompleted = completed;
    },
    updateMockFailure: (state: UnitTestState, action: PayloadAction<updateMockPayload>) => {
      const { operationName, outputs, outputId, completed, type, errorMessage, errorCode } = action.payload;
      const operationOutputs = state.mockResults[operationName]?.output || {};
      const operationOutputId = `${operationName}-${outputId}`;
      const validationErrors = {
        value: validateParameter(outputId, { type, value: outputs[0]?.value ?? undefined }, 'value', {}, false),
      };

      const newErrorObj = {
        ...(getRecordEntry(state.validationErrors.mocks, operationOutputId) ?? {}),
        ...validationErrors,
      };
      if (!newErrorObj.value) {
        delete newErrorObj.value;
      }
      if (Object.keys(newErrorObj).length === 0) {
        delete state.validationErrors.mocks[operationOutputId];
      } else {
        state.validationErrors.mocks[operationOutputId] = newErrorObj;
      }

      state.mockResults[operationName] = {
        ...state.mockResults[operationName],
        output: { ...operationOutputs, [outputId]: outputs },
        isCompleted: completed,
        errorMessage,
        errorCode,
      };
    },
    updateActionResultSuccess: (state: UnitTestState, action: PayloadAction<updateMockResultPayload>) => {
      const { operationName, actionResult, completed } = action.payload;
      state.mockResults[operationName] = {
        ...state.mockResults[operationName],
        actionResult,
        isCompleted: completed,
        errorMessage: undefined, // Clear error message
        errorCode: undefined, // Clear error code
      };
    },
    updateActionResultFailure: (state: UnitTestState, action: PayloadAction<updateMockResultPayload>) => {
      const { operationName, actionResult, completed, errorMessage, errorCode } = action.payload;
      state.mockResults[operationName] = {
        ...state.mockResults[operationName],
        actionResult,
        isCompleted: completed,
        errorMessage,
        errorCode,
      };
    },
    addAssertion: (state: UnitTestState, action: PayloadAction<AddAssertionPayload>) => {
      const { assertion } = action.payload;
      const { id } = assertion;
      state.assertions[id] = assertion;
      checkAssertionsErrors(state);
    },
    deleteAssertion: (state: UnitTestState, action: PayloadAction<DeleteAssertionsPayload>) => {
      const { assertionId } = action.payload;
      delete state.assertions[assertionId];
      if (state.validationErrors.assertions[assertionId]) {
        delete state.validationErrors.assertions[assertionId];
      }
      checkAssertionsErrors(state);
    },
    updateAssertionExpression: (state: UnitTestState, action: PayloadAction<UpdateAssertioExpressionPayload>) => {
      const { id, assertionString } = action.payload;
      state.assertions[id] = {
        ...state.assertions[id],
        assertionString,
      };
      checkAssertionsErrors(state);
    },
    updateAssertion: (state: UnitTestState, action: PayloadAction<UpdateAssertionPayload>) => {
      const { assertionToUpdate } = action.payload;
      const { name, id, description, assertionString, isEditable } = assertionToUpdate;
      state.assertions[id] = {
        ...state.assertions[id],
        name,
        description,
        assertionString,
        isEditable,
      };
      checkAssertionsErrors(state);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialUnitTestState);
  },
});

export const {
  addAssertion,
  deleteAssertion,
  updateAssertion,
  updateAssertionExpression,
  initUnitTestDefinition,
  updateMockSuccess,
  updateMockFailure,
  updateActionResultSuccess,
  updateActionResultFailure,
} = unitTestSlice.actions;

export default unitTestSlice.reducer;
