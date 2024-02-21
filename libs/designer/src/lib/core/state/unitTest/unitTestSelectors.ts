import type { RootState } from '../../store';
import type { UnitTestState } from './unitTestInterfaces';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getUnitTestState = (state: RootState): UnitTestState => state.unitTest;

/**
 * Custom hook that returns an object containing mock results.
 * @returns {Object} An object with key-value pairs representing the mock results.
 */
export const useMockResults = (): { [key: string]: string } => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults;
    })
  );
};

/**
 * Custom hook that returns the mock results for a specific operation.
 * @param {string} operationName - The name of the operation.
 * @returns The mock results for the specified operation, or undefined if not found.
 */
export const useMockResultsByOperation = (operationName: string): string | undefined => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults[operationName] ?? undefined;
    })
  );
};

/**
 * Custom hook that returns the assertions from the unit test state.
 * @returns An object containing the assertions.
 */
export const useAssertions = (): Record<string, AssertionDefintion> => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.assertions;
    })
  );
};

/**
 * Custom hook that returns the validation errors for assertions.
 * @returns An object containing the validation errors for assertions.
 */
export const useAssertionsValidationErrors = (): Record<string, Record<string, string | undefined>> => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.validationErrors;
    })
  );
};
