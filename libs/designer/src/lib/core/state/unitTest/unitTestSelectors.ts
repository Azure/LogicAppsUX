import type { RootState } from '../../store';
import type { UnitTestState } from './unitTestInterfaces';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getUnitTestState = (state: RootState): UnitTestState => state.unitTest;

export const useMockResults = (): Map<string, string> => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.mockResults;
    })
  );
};

export const useAssertions = (): string[] => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      return state.assertions;
    })
  );
};
