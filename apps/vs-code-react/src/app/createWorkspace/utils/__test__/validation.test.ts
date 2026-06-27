import { describe, expect, it } from 'vitest';
import {
  functionNameValidation,
  nameValidation,
  namespaceValidation,
  validateFunctionName,
  validateFunctionNamespace,
  validateWorkflowName,
} from '../validation';

describe('create workspace validation utilities', () => {
  const intlText = {
    EMPTY_WORKFLOW_NAME: 'Workflow name cannot be empty.',
    WORKFLOW_NAME_VALIDATION_MESSAGE: 'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".',
    FUNCTION_NAMESPACE_EMPTY: 'Function namespace cannot be empty.',
    FUNCTION_NAMESPACE_VALIDATION: 'Function namespace must be a valid C# namespace.',
    FUNCTION_NAME_EMPTY: 'Function name cannot be empty.',
    FUNCTION_NAME_VALIDATION: 'Function name must start with a letter and can only contain letters, digits, and "_".',
  };

  describe('nameValidation', () => {
    it.each(['a', 'myapp', 'MyApp', 'my_app', 'my-app', 'app123', 'my_app-v2', 'la-trigger-github'])('accepts "%s"', (name) => {
      expect(nameValidation.test(name)).toBe(true);
    });

    it.each(['', '123abc', '_abc', '-abc', 'my app', 'my.app', 'my--app', 'my__app', 'my-', 'my_', 'my@app'])('rejects "%s"', (name) => {
      expect(nameValidation.test(name)).toBe(false);
    });
  });

  describe('validateWorkflowName', () => {
    it.each(['workflow', 'my_app', 'la-trigger-github'])('returns undefined for valid workflow name "%s"', (name) => {
      expect(validateWorkflowName(name, intlText)).toBeUndefined();
    });

    it('returns the empty workflow name message', () => {
      expect(validateWorkflowName('', intlText)).toBe(intlText.EMPTY_WORKFLOW_NAME);
    });

    it('returns the workflow validation message for invalid names', () => {
      expect(validateWorkflowName('1workflow', intlText)).toBe(intlText.WORKFLOW_NAME_VALIDATION_MESSAGE);
      expect(validateWorkflowName('workflow.name', intlText)).toBe(intlText.WORKFLOW_NAME_VALIDATION_MESSAGE);
    });

    it('returns collision message when workflow name exists in project (case-insensitive)', () => {
      const existingWorkflows = ['MyWorkflow', 'another-workflow'];
      const collisionMessage = 'A workflow with this name already exists in the selected project.';
      const intlWithCollision = { ...intlText, WORKFLOW_NAME_EXISTS: collisionMessage };

      expect(validateWorkflowName('MyWorkflow', intlWithCollision, existingWorkflows)).toBe(collisionMessage);
      expect(validateWorkflowName('myworkflow', intlWithCollision, existingWorkflows)).toBe(collisionMessage);
      expect(validateWorkflowName('MYWORKFLOW', intlWithCollision, existingWorkflows)).toBe(collisionMessage);
      expect(validateWorkflowName('another-workflow', intlWithCollision, existingWorkflows)).toBe(collisionMessage);
    });

    it('returns undefined when workflow name does not collide', () => {
      const existingWorkflows = ['MyWorkflow', 'another-workflow'];
      expect(validateWorkflowName('new-workflow', intlText, existingWorkflows)).toBeUndefined();
      expect(validateWorkflowName('unique-name', intlText, existingWorkflows)).toBeUndefined();
    });

    it('returns undefined when existingWorkflows is empty or not provided', () => {
      expect(validateWorkflowName('workflow', intlText, [])).toBeUndefined();
      expect(validateWorkflowName('workflow', intlText, undefined)).toBeUndefined();
    });
  });

  describe('functionNameValidation', () => {
    it.each(['MyFunction', 'myFunction', 'MyFunction_1', 'func123', 'a_'])('accepts "%s"', (name) => {
      expect(functionNameValidation.test(name)).toBe(true);
    });

    it.each(['', 'my-function', '1function', '_function', 'function.name', 'function name'])('rejects "%s"', (name) => {
      expect(functionNameValidation.test(name)).toBe(false);
    });
  });

  describe('validateFunctionName', () => {
    it('rejects function names that are not valid C# identifiers', () => {
      expect(validateFunctionName('my-function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
      expect(validateFunctionName('1function', intlText)).toBe(intlText.FUNCTION_NAME_VALIDATION);
    });

    it('allows function names with letters, digits, and underscores', () => {
      expect(validateFunctionName('MyFunction_1', intlText)).toBeUndefined();
    });

    it('returns the empty function name message', () => {
      expect(validateFunctionName('', intlText)).toBe(intlText.FUNCTION_NAME_EMPTY);
    });
  });

  describe('namespaceValidation', () => {
    it.each(['MyNamespace', 'My.Company.Functions', '_Root.Sub', 'A.B.C', 'A1.B2'])('accepts "%s"', (namespace) => {
      expect(namespaceValidation.test(namespace)).toBe(true);
    });

    it.each(['', 'Invalid-Namespace', '123.Root', '.Root', 'Root.', 'Root..Sub', 'Root.123', 'Root.Sub-Name'])(
      'rejects "%s"',
      (namespace) => {
        expect(namespaceValidation.test(namespace)).toBe(false);
      }
    );
  });

  describe('validateFunctionNamespace', () => {
    it('returns function namespace validation messages from workspace message keys', () => {
      expect(validateFunctionNamespace('', intlText)).toBe(intlText.FUNCTION_NAMESPACE_EMPTY);
      expect(validateFunctionNamespace('Invalid-Namespace', intlText)).toBe(intlText.FUNCTION_NAMESPACE_VALIDATION);
    });

    it('allows valid C# namespaces', () => {
      expect(validateFunctionNamespace('MyCompany.Functions', intlText)).toBeUndefined();
    });
  });
});
