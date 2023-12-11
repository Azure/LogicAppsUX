import type { RootState } from '../../store';
import type { UnitTestState } from './unitTestInterfaces';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

// Will move interfaces to another file
export interface OperationMock {
  outputs?: string;
  properties?: Record<string, string>;
}

export interface Assertion {
  assertionString: string;
  description: string;
}

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

export const useUnitTestDefinition = (): any => {
  return useSelector(
    createSelector(getUnitTestState, (state: UnitTestState) => {
      const { mockResults, assertions } = state;
      return {
        triggerMocks: getTriggerMocks(mockResults),
        actionMocks: getActionMocks(mockResults),
        assertions: getAssertions(assertions),
      };
    })
  );
};

const getAssertions = (assertions: string[]): Assertion[] => {
  const result: Assertion[] = [];
  assertions.forEach((assert) => {
    // if it's an empty assertion, don't add it to the def file
    if (assert.length > 0) {
      result.push({ assertionString: assert, description: '' });
    }
  });
  return result;
};

const getTriggerMocks = (mockResults: Map<string, string>): Record<string, OperationMock> => {
  const result: Record<string, OperationMock> = {};
  mockResults.forEach((value, key) => {
    if (key.charAt(0) == '&') {
      if (value) {
        // return trigger
        const mockTriggerJson = JSON.parse(value);
        const triggerName = key.substring(1); // take off meta data
        result[triggerName] = mockTriggerJson;
      }
    }
  });
  // only reach here if there is not trigger mock
  return result;
};

const getActionMocks = (mockResults: Map<string, string>): Record<string, OperationMock> => {
  const result: Record<string, OperationMock> = {};
  mockResults.forEach((value, key) => {
    if (key.charAt(0) != '&') {
      if (value) {
        const mockResultJson = JSON.parse(value);
        result[key] = mockResultJson;
      }
    }
  });
  return result;
};
