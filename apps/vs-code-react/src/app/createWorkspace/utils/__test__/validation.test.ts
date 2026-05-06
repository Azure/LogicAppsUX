import { describe, expect, it } from 'vitest';
import { validateFunctionName, validateFunctionNamespace } from '../validation';

describe('create workspace validation utilities', () => {
  const intlText = {
    FUNCTION_NAMESPACE_EMPTY: 'Function namespace cannot be empty.',
    FUNCTION_NAMESPACE_VALIDATION: 'Function namespace must be a valid C# namespace.',
    FUNCTION_NAME_EMPTY: 'Function name cannot be empty.',
    FUNCTION_NAME_VALIDATION: 'Function name must start with a letter and can only contain letters, digits, and "_".',
  };

  it('rejects function names that are not valid C# identifiers', () => {
    expect(validateFunctionName('my-function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
    expect(validateFunctionName('1function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
  });

  it('allows function names with letters, digits, and underscores', () => {
    expect(validateFunctionName('MyFunction_1', intlText)).toBeUndefined();
  });

  it('returns function namespace validation messages from workspace message keys', () => {
    expect(validateFunctionNamespace('', intlText)).toBe(intlText.FUNCTION_NAMESPACE_EMPTY);
    expect(validateFunctionNamespace('Invalid-Namespace', intlText)).toBe(intlText.FUNCTION_NAMESPACE_VALIDATION);
  });
});
