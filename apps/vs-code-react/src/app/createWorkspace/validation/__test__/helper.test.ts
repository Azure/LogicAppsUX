import { describe, it, expect } from 'vitest';
import { nameValidation, namespaceValidation, functionNameValidation, validateFunctionName, validateWorkflowName } from '../helper';

describe('Validation helpers', () => {
  const intlText = {
    EMPTY_WORKFLOW_NAME: 'Workflow name cannot be empty.',
    WORKFLOW_NAME_VALIDATION_MESSAGE: 'Workflow name is invalid.',
    FUNCTION_NAME_EMPTY: 'Function name cannot be empty.',
    FUNCTION_NAME_VALIDATION: 'Function name must start with a letter and can only contain letters, digits, and underscores ("_").',
  };

  describe('nameValidation regex', () => {
    it.each([
      ['myapp', true],
      ['MyApp', true],
      ['my_app', true],
      ['my-app', true],
      ['app123', true],
      ['my_app-v2', true],
      ['a', true],
    ])('"%s" should be %s', (name, expected) => {
      expect(nameValidation.test(name)).toBe(expected);
    });

    it.each([
      ['', false],
      ['123abc', false],
      ['_abc', false],
      ['-abc', false],
      ['my app', false],
      ['my--app', false],
      ['my__app', false],
      ['my-', false],
      ['my_', false],
    ])('"%s" should be %s', (name, expected) => {
      expect(nameValidation.test(name)).toBe(expected);
    });
  });

  describe('functionNameValidation regex', () => {
    it.each([
      ['MyFunc', true],
      ['myFunc', true],
      ['my_func', true],
      ['A', true],
      ['func123', true],
      ['My_Func_123', true],
      ['a_', true],
    ])('"%s" should be valid (%s)', (name, expected) => {
      expect(functionNameValidation.test(name)).toBe(expected);
    });

    it.each([
      ['my-func', false, 'hyphens are not valid C# identifiers'],
      ['my-func-v2', false, 'multiple hyphens'],
      ['123func', false, 'starts with digit'],
      ['_func', false, 'starts with underscore'],
      ['-func', false, 'starts with hyphen'],
      ['', false, 'empty string'],
      ['my func', false, 'contains space'],
      ['my.func', false, 'contains dot'],
    ])('"%s" should be invalid (%s) — %s', (name, expected) => {
      expect(functionNameValidation.test(name)).toBe(expected);
    });
  });

  describe('nameValidation allows hyphens but functionNameValidation does not', () => {
    it('nameValidation accepts "my-func"', () => {
      expect(nameValidation.test('my-func')).toBe(true);
    });

    it('functionNameValidation rejects "my-func"', () => {
      expect(functionNameValidation.test('my-func')).toBe(false);
    });
  });

  describe('namespaceValidation regex', () => {
    it.each([
      ['MyNamespace', true],
      ['My.Namespace', true],
      ['_Root.Sub', true],
      ['A.B.C', true],
    ])('"%s" should be valid', (ns, expected) => {
      expect(namespaceValidation.test(ns)).toBe(expected);
    });

    it.each([
      ['my-namespace', false],
      ['123.Abc', false],
      ['.Abc', false],
    ])('"%s" should be invalid', (ns, expected) => {
      expect(namespaceValidation.test(ns)).toBe(expected);
    });
  });

  describe('validateFunctionName', () => {
    it('returns error for empty name', () => {
      expect(validateFunctionName('', intlText)).toBe(intlText.FUNCTION_NAME_EMPTY);
    });

    it('returns error for name with hyphens', () => {
      expect(validateFunctionName('my-func', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
    });

    it('returns error for name starting with digit', () => {
      expect(validateFunctionName('1func', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
    });

    it('returns undefined for valid name', () => {
      expect(validateFunctionName('MyFunc', intlText)).toBeUndefined();
    });

    it('returns undefined for name with underscores', () => {
      expect(validateFunctionName('my_func_v2', intlText)).toBeUndefined();
    });
  });

  describe('validateWorkflowName', () => {
    it('still allows hyphens (hyphens are valid for workflow names)', () => {
      expect(validateWorkflowName('my-workflow', intlText)).toBeUndefined();
    });

    it('returns error for empty name', () => {
      expect(validateWorkflowName('', intlText)).toBe(intlText.EMPTY_WORKFLOW_NAME);
    });
  });
});
