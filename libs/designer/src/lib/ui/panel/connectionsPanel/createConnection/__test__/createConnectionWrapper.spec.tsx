import { getConnectionParameterSetValues } from '../createConnectionInternal';
import { describe, it, expect } from 'vitest';
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

    it('filters out parameters not in validParameterKeys when provided', () => {
      const outputValues = {
        parameter1: 'value1',
        parameter2: 'value2',
        'token:tenantId': 'tenant-id-value', // This should be filtered out
        extraParam: 'extra-value', // This should be filtered out
      };

      const validKeys = ['parameter1', 'parameter2'];

      const result = getConnectionParameterSetValues(selectedParameterSetName, outputValues, validKeys);

      expect(result).toEqual({
        name: selectedParameterSetName,
        values: {
          parameter1: { value: 'value1' },
          parameter2: { value: 'value2' },
        },
      });
      // Ensure filtered parameters are not included
      expect(result.values).not.toHaveProperty('token:tenantId');
      expect(result.values).not.toHaveProperty('extraParam');
    });

    it('includes all parameters when validParameterKeys is not provided', () => {
      const outputValues = {
        parameter1: 'value1',
        'token:tenantId': 'tenant-id-value',
      };

      const result = getConnectionParameterSetValues(selectedParameterSetName, outputValues);

      expect(result).toEqual({
        name: selectedParameterSetName,
        values: {
          parameter1: { value: 'value1' },
          'token:tenantId': { value: 'tenant-id-value' },
        },
      });
    });
  });
});
