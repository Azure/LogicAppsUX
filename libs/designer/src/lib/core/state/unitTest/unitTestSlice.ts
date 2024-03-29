import { recurseSerializeCondition } from '../../utils/parameters/helper';
import { validateParameter } from '../workflowparameters/workflowparametersSlice';
import type {
  UpdateAssertionsPayload,
  UpdateAssertionPayload,
  updateMockPayload,
  InitDefintionPayload,
  UnitTestState,
  updateMockResultPayload,
} from './unitTestInterfaces';
import { ActionResults, type ParameterInfo } from '@microsoft/designer-ui';
import {
  type Assertion,
  type AssertionDefintion,
  guid,
  isNullOrUndefined,
  equals,
  getRecordEntry,
  isNullOrEmpty,
  getIntl,
} from '@microsoft/logic-apps-shared';
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
  validationErrors: {
    assertions: {},
    mocks: {},
  },
};

const parseAssertions = (assertions: Assertion[]): Record<string, AssertionDefintion> => {
  return assertions.reduce((acc, assertion) => {
    const { name, description, expression } = assertion;
    const id = guid();
    return { ...acc, [id]: { id, name, description, expression, isEditable: false } };
  }, {});
};

/**
 * Validates an assertion based on the provided parameters.
 * @param {string} id - The ID of the assertion.
 * @param  {{ name?: string; expression?: Record<string, any> }} data - The data object containing the assertion name and expression.
 * @param {string} keyToValidate - The key to validate ('name' or 'expression').
 * @param  {Record<string, AssertionDefintion>} allDefinitions - The record of all assertion definitions.
 * @returns A string with an error message if the assertion is invalid, otherwise undefined.
 */
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
          id: 'YjSqtf',
          description: 'Error message when the workflow assertion name is empty.',
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
    updateMock: (state: UnitTestState, action: PayloadAction<updateMockPayload>) => {
      const { operationName, outputs, outputId, completed, type } = action.payload;
      const operationOutputs = state.mockResults[operationName].output;
      const operationOutputId = `${operationName}-${outputId}`;
      const validationErrors = {
        value: validateParameter(outputId, { type: type, value: outputs[0]?.value ?? undefined }, 'value', {}, false),
      };

      const newErrorObj = {
        ...(getRecordEntry(state.validationErrors.mocks, operationOutputId) ?? {}),
        ...validationErrors,
      };
      if (!newErrorObj.value) delete newErrorObj.value;
      if (Object.keys(newErrorObj).length === 0) {
        delete state.validationErrors.mocks[operationOutputId];
      } else {
        state.validationErrors.mocks[operationOutputId] = newErrorObj;
      }

      if (isNullOrEmpty(operationOutputs)) {
        state.mockResults[operationName].output = { [outputId]: outputs };
      } else {
        state.mockResults[operationName].output[outputId] = outputs;
      }
      state.mockResults[operationName].isCompleted = completed;
    },
    updateActionResult: (state: UnitTestState, action: PayloadAction<updateMockResultPayload>) => {
      const { operationName, actionResult, completed } = action.payload;
      state.mockResults[operationName].actionResult = actionResult;
      state.mockResults[operationName].isCompleted = completed;
      if (actionResult !== ActionResults.SUCCESS) {
        state.mockResults[operationName].output = {};
      }
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
        ...(getRecordEntry(state.validationErrors.assertions, id) ?? {}),
        ...validationErrors,
      };
      if (!newErrorObj.name) delete newErrorObj.name;
      if (!newErrorObj.expression) delete newErrorObj.expression;
      if (Object.keys(newErrorObj).length === 0) {
        delete state.validationErrors.assertions[id];
      } else {
        state.validationErrors.assertions[id] = newErrorObj;
      }
    },
  },
});

export const { updateAssertions, updateAssertion, initUnitTestDefinition, updateMock, updateActionResult } = unitTestSlice.actions;

export default unitTestSlice.reducer;
