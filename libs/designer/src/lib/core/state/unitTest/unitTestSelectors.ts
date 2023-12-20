import type { RootState } from '../../store';
import type { UnitTestState } from './unitTestInterfaces';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getUnitTestState = (state: RootState): UnitTestState => state.unitTest;

export const useMockResults = (): any => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults;
    })
  );
};

export const useMockResultsByOperation = (operationName: string): string | undefined => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults[operationName] ?? undefined;
    })
  );
};

export const useAssertions = (): Record<string, AssertionDefintion> => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.assertions;
    })
  );
};
