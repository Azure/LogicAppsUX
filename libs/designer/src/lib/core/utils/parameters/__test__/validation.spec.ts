import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateType } from '../../validation';
import Constants from '../../../../common/constants';
import * as shared from '@microsoft/logic-apps-shared';

// Setup mocks for shared helpers.
describe('validateType', () => {
  // Before each test, set up the intl mock and ensure that isTemplateExpression returns false by default.
  beforeEach(() => {
    vi.spyOn(shared, 'getIntl').mockReturnValue({
      // For these tests, simply return the defaultMessage so that error messages can be directly asserted.
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    } as any);
    // By default, assume that the parameter value is not an expression.
    vi.spyOn(shared, 'isTemplateExpression').mockReturnValue(false);
  });

  // Restore mocks after each test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return undefined when parameterValue is empty', () => {
    expect(validateType('string', '', undefined, {})).toBeUndefined();
  });

  it('should return undefined when the parameterValue is a template expression', () => {
    // Force isTemplateExpression to return true.
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
    // validateIntegerFormat returns an empty string for valid integers.
    expect(result).toBe('');
  });

  it('should return an error for an invalid integer', () => {
    const result = validateType(Constants.SWAGGER.TYPE.INTEGER, 'abc', undefined, {});
    expect(result).toBe('Enter a valid integer.');
  });

  // --- Number type ---
  it('should return an empty string for a valid number', () => {
    const result = validateType(Constants.SWAGGER.TYPE.NUMBER, '123.45', undefined, {});
    // validateNumberFormat returns an empty string for valid numbers.
    expect(result).toBe('');
  });

  it('should return an error for an invalid number', () => {
    const result = validateType(Constants.SWAGGER.TYPE.NUMBER, 'abc', undefined, {});
    expect(result).toBe('Enter a valid number.');
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
  // When collectionFormat is CSV, the regex is used directly.
  it('should return undefined for a valid CSV formatted array string', () => {
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, 'a,b,c', undefined, {
      collectionFormat: Constants.SWAGGER.COLLECTION_FORMAT.CSV,
    });
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid CSV formatted array string', () => {
    // Trailing comma makes it invalid per the regex.
    const result = validateType(Constants.SWAGGER.TYPE.ARRAY, 'a,b,', undefined, {
      collectionFormat: Constants.SWAGGER.COLLECTION_FORMAT.CSV,
    });
    expect(result).toBe('Enter a valid comma-separated string.');
  });

  // When no CSV collection format is provided, a valid JSON array should pass.
  it('should return undefined for a valid JSON array string', () => {
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
    // This value should match the regex defined in validation.ts.
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
