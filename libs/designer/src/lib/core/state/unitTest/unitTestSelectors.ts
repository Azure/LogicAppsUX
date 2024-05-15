import type { RootState } from '../../store';
import type { OperationMetadataState } from '../operation/operationMetadataSlice';
import { getOperationsState } from '../selectors/actionMetadataSelector';
import type { OutputMock, UnitTestState } from './unitTestInterfaces';
import { getRecordEntry, type AssertionDefintion, ConnectionType } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getUnitTestState = (state: RootState): UnitTestState => state.unitTest;

/**
 * Custom hook that returns an object containing mock results.
 * @returns {Object} An object with key-value pairs representing the mock results.
 */
export const useMockResults = (): Record<string, OutputMock> => {
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
export const useMocksByOperation = (operationName: string): OutputMock => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults[operationName];
    })
  );
};

/**
 * Custom hook to check if mock is supported for a given node.
 * @param nodeId - The ID of the node.
 * @param isTrigger - Indicates whether the node is a trigger.
 * @returns A boolean indicating whether mock is supported for the node.
 */
export const useIsMockSupported = (nodeId: string, isTrigger: boolean) => {
  return useSelector(
    createSelector(getOperationsState, (state: OperationMetadataState) => {
      const type = (getRecordEntry(state.operationInfo, nodeId)?.type ?? '').toLowerCase();
      return (
        isTrigger ||
        type === 'http' ||
        type === 'invokefunction' ||
        type === ConnectionType.ServiceProvider ||
        type === ConnectionType.Function ||
        type === ConnectionType.ApiManagement ||
        type === ConnectionType.ApiConnection
      );
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
      return state.validationErrors.assertions;
    })
  );
};

/**
 * Custom hook that returns the mocks errors for mocks.
 * @returns An object containing the validation errors for mocks.
 */
export const useMocksValidationErrors = (): Record<string, Record<string, string | undefined>> => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.validationErrors.mocks;
    })
  );
};
