import { describe, expect, it } from 'vitest';
import { validateFunctionName } from '../validation';

describe('create workspace validation utilities', () => {
  const intlText = {
    EMPTY_FUNCTION_NAME: 'Function name cannot be empty.',
    FUNCTION_NAME_VALIDATION_MESSAGE: 'Function name must start with a letter and can only contain letters, digits, and "_".',
  };

  it('rejects function names that are not valid C# identifiers', () => {
    expect(validateFunctionName('my-function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION_MESSAGE);
    expect(validateFunctionName('1function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION_MESSAGE);
  });

  it('allows function names with letters, digits, and underscores', () => {
    expect(validateFunctionName('MyFunction_1', intlText)).toBeUndefined();
  });
});
