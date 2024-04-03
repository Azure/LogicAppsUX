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

    it.each([
      ['default case', outputParameterValues.default],
      ['value property is undefined', outputParameterValues.withUndefinedValue],
    ])(`returns ConnectionParameterSetValue when %s`, (_, outputParameterValues) => {
      expect(getConnectionParameterSetValues(selectedParameterSetName, outputParameterValues)).toEqual(
        expectedConnectionParameterSetValues
      );
    });
  });
});
