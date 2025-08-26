import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateType } from '../../validation';
import Constants from '../../../../common/constants';
import * as shared from '@microsoft/logic-apps-shared';

describe('validateType', () => {
  beforeEach(() => {
    vi.spyOn(shared, 'getIntl').mockReturnValue({
      // Simply return the defaultMessage so that error messages can be directly asserted.
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    } as any);
    // By default, assume that the parameter value is not an expression.
    vi.spyOn(shared, 'isTemplateExpression').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return undefined when parameterValue is empty', () => {
    expect(validateType('string', '', undefined, {})).toBeUndefined();
  });

  it('should return undefined when the parameterValue is a template expression', () => {
    vi.spyOn(shared, 'isTemplateExpression').mockReturnValue(true);
    const result = validateType(Constants.SWAGGER.TYPE.INTEGER, 'some expression', undefined, {});
    expect(result).toBeUndefined();
  });

  // --- Editor: TABLE branch ---
  it('should return an error for TABLE editor when parameterValue is not valid JSON', () => {
    const invalidJson = 'not json';
    const result = validateType('any', invalidJson, Constants.EDITOR.TABLE, {});
    expect(result).toBe('Enter a valid table.');
  });

  it('should return undefined for TABLE editor when parameterValue is valid JSON', () => {
    const validJson = '{}';
    const result = validateType('any', validJson, Constants.EDITOR.TABLE, {});
    expect(result).toBeUndefined();
  });

  // --- Integer type ---
  it('should return an empty string for a valid integer', () => {
    const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '123', undefined, {});
    expect(result).toBe('');
  });

  it('should return an error for an invalid integer', () => {
    const result = validateType(Constants.SWAGGER.TYPE.INTEGER, 'abc', undefined, {});
    expect(result).toBe('Enter a valid integer.');
  });

  // --- Additional Integer Range Tests ---
  describe('validateType for integer with min and max constraints', () => {
    it('should return an empty string for a valid integer within range (custom min and max)', () => {
      const options = { format: 'int32', minimum: 10, maximum: 100 };
      const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '50', undefined, options);
      expect(result).toBe('');
    });

    it('should return an error for an integer below the minimum', () => {
      const options = { format: 'int32', minimum: 10, maximum: 100 };
      const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '5', undefined, options);
      expect(result).toContain('The integer should be between [{min}, {max}]');
    });

    it('should return an error for an integer below the constant integer minimum', () => {
      const options = { format: 'int32' };
      const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '-2147483699', undefined, options);
      expect(result).toContain('The integer should be between [{min}, {max}]');
    });

    it('should return an error for an integer above the maximum', () => {
      const options = { format: 'int32', minimum: 10, maximum: 100 };
      const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '150', undefined, options);
      expect(result).toContain('The integer should be between [{min}, {max}]');
    });

    it('should return an error for an integer above the constant integer maximum', () => {
      const options = { format: 'int32' };
      const result = validateType(Constants.SWAGGER.TYPE.INTEGER, '2147483699', undefined, options);
      expect(result).toContain('The integer should be between [{min}, {max}]');
    });
  });

  // --- Number type ---
  it('should return an empty string for a valid number', () => {
    const result = validateType(Constants.SWAGGER.TYPE.NUMBER, '123.45', undefined, {});
    expect(result).toBe('');
  });

  it('should return an error for an invalid number', () => {
    const result = validateType(Constants.SWAGGER.TYPE.NUMBER, 'abc', undefined, {});
    expect(result).toBe('Enter a valid number.');
  });

  // --- Additional Number Range Tests (double/float) ---
  describe('validateType for number (double/float) with min and max constraints', () => {
    it('should return an empty string for a valid double within range', () => {
      const options = { format: 'double', minimum: 1.5, maximum: 10.5 };
      const result = validateType(Constants.SWAGGER.TYPE.NUMBER, '5.5', undefined, options);
      expect(result).toBe('');
    });

    it('should return an error for a double below the minimum', () => {
      const options = { format: 'double', minimum: 1.5, maximum: 10.5 };
      const result = validateType(Constants.SWAGGER.TYPE.NUMBER, '1.0', undefined, options);
      expect(result).toContain('The value should be between [{min}, {max}]');
    });

    it('should return an error for a float above the maximum', () => {
      const options = { format: 'float', minimum: 1.5, maximum: 10.5 };
      const result = validateType(Constants.SWAGGER.TYPE.NUMBER, '11.0', undefined, options);
      expect(result).toContain('The value should be between [{min}, {max}]');
    });

    it('should return an error when the number is formatted incorrectly for double', () => {
      const options = { format: 'double' };
      const result = validateType(Constants.SWAGGER.TYPE.NUMBER, 'abc', undefined, options);
      expect(result).toBe('Enter a valid number.');
    });
  });

  // --- Boolean type ---
  it('should return undefined for valid boolean "true"', () => {
    const result = validateType(Constants.SWAGGER.TYPE.BOOLEAN, 'true', undefined, {});
    expect(result).toBeUndefined();
  });

  it('should return undefined for valid boolean "false"', () => {
    const result = validateType(Constants.SWAGGER.TYPE.BOOLEAN, 'false', undefined, {});
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid boolean', () => {
    const result = validateType(Constants.SWAGGER.TYPE.BOOLEAN, 'yes', undefined, {});
    expect(result).toBe('Enter a valid boolean.');
  });

  // --- Object type ---
  it('should return undefined for a valid JSON object', () => {
    const result = validateType(Constants.SWAGGER.TYPE.OBJECT, '{}', undefined, {});
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid JSON object', () => {
    const result = validateType(Constants.SWAGGER.TYPE.OBJECT, 'not json', undefined, {});
    expect(result).toBe('Enter a valid JSON.');
  });

  // --- Array type ---
  it('should return undefined for a valid CSV formatted array string', () => {
    const options = { collectionFormat: Constants.SWAGGER.COLLECTION_FORMAT.CSV };
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, 'a,b,c', undefined, options);
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid CSV formatted array string', () => {
    const options = { collectionFormat: Constants.SWAGGER.COLLECTION_FORMAT.CSV };
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, 'a,b,', undefined, options);
    expect(result).toBe('Enter a valid comma-separated string.');
  });

  it('should return undefined for a valid JSON array string when no CSV format is provided', () => {
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, '[1,2,3]', undefined, {});
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid JSON array string', () => {
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, 'not an array', undefined, {});
    expect(result).toBe('Enter a valid array.');
  });

  // --- String type ---
  it('should return an empty string for a valid string with no format', () => {
    const result = validateType(Constants.SWAGGER.TYPE.STRING, 'any string', undefined, {});
    expect(result).toBe('');
  });

  it('should return an empty string for a valid datetime string when format is datetime', () => {
    const validDatetime = '2021-05-21T13:45:30';
    const result = validateType(Constants.SWAGGER.TYPE.STRING, validDatetime, undefined, { format: 'datetime' });
    expect(result).toBe('');
  });

  it('should return an error for an invalid datetime string when format is datetime', () => {
    const invalidDatetime = 'not a datetime';
    const result = validateType(Constants.SWAGGER.TYPE.STRING, invalidDatetime, undefined, { format: 'datetime' });
    expect(result).toBe('Enter a valid datetime.');
  });

  // --- Unknown type ---
  it('should return undefined when type is unknown', () => {
    const result = validateType('unknown', 'some value', undefined, {});
    expect(result).toBeUndefined();
  });
});
