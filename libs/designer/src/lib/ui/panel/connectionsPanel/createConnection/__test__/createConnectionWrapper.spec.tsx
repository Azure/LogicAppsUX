import { getConnectionParameterSetValues } from '../createConnectionWrapper';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('CreateConnectionWrapper', () => {
  describe('getConnectionParameterSetValues', () => {
    const selectedParameterSetName = 'selectedParameterSetName';
    const outputParameterValues = {
      default: {
        parameter1: 'value1',
        parameter2: null,
      },
      withUndefinedValue: {
        parameter1: 'value1',
        parameter2: undefined,
      },
    };

    const expectedConnectionParameterSetValues = {
      name: selectedParameterSetName,
      values: {
        parameter1: {
          value: 'value1',
        },
        parameter2: {
          value: null,
        },
      },
    };

    const expectedConnectionParameterSetValuesWithUndefined = {
      name: selectedParameterSetName,
      values: {
        parameter1: {
          value: 'value1',
        },
        parameter2: {
          value: undefined,
        },
      },
    };

    it.each([['default case', outputParameterValues.default]])(
      `returns ConnectionParameterSetValue when %s`,
      (_, outputParameterValues) => {
        expect(getConnectionParameterSetValues(selectedParameterSetName, outputParameterValues)).toEqual(
          expectedConnectionParameterSetValues
        );
      }
    );

    it('returns ConnectionParameterSetValue with undefined value when value property is undefined', () => {
      expect(getConnectionParameterSetValues(selectedParameterSetName, outputParameterValues.withUndefinedValue)).toEqual(
        expectedConnectionParameterSetValuesWithUndefined
      );
    });
  });
});
