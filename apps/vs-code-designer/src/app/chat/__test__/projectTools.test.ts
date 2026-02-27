import { describe, it, expect } from 'vitest';
import { isValidProjectName, isValidWorkflowName } from '../tools/projectTools';

describe('isValidProjectName', () => {
  describe('valid names', () => {
    it('should accept simple alphabetic name', () => {
      expect(isValidProjectName('MyLogicApp')).toBe(true);
    });

    it('should accept name starting with lowercase letter', () => {
      expect(isValidProjectName('myLogicApp')).toBe(true);
    });

    it('should accept name with digits', () => {
      expect(isValidProjectName('LogicApp123')).toBe(true);
    });

    it('should accept name with underscores', () => {
      expect(isValidProjectName('Logic_App')).toBe(true);
    });

    it('should accept name with hyphens', () => {
      expect(isValidProjectName('Logic-App')).toBe(true);
    });

    it('should accept single letter name', () => {
      expect(isValidProjectName('A')).toBe(true);
    });

    it('should accept mixed valid characters', () => {
      expect(isValidProjectName('My_Logic-App123')).toBe(true);
    });

    it('should accept typical project names', () => {
      expect(isValidProjectName('OrderManagement')).toBe(true);
      expect(isValidProjectName('Invoice-Processing')).toBe(true);
      expect(isValidProjectName('API_Gateway_v2')).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject name starting with digit', () => {
      expect(isValidProjectName('123App')).toBe(false);
    });

    it('should reject name starting with underscore', () => {
      expect(isValidProjectName('_App')).toBe(false);
    });

    it('should reject name starting with hyphen', () => {
      expect(isValidProjectName('-App')).toBe(false);
    });

    it('should reject name with spaces', () => {
      expect(isValidProjectName('My Logic App')).toBe(false);
    });

    it('should reject name with special characters', () => {
      expect(isValidProjectName('My@App')).toBe(false);
      expect(isValidProjectName('My#App')).toBe(false);
      expect(isValidProjectName('My$App')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidProjectName('')).toBe(false);
    });

    it('should reject name with dots', () => {
      expect(isValidProjectName('My.App')).toBe(false);
    });

    it('should reject name with slashes', () => {
      expect(isValidProjectName('My/App')).toBe(false);
      expect(isValidProjectName('My\\App')).toBe(false);
    });
  });
});

describe('isValidWorkflowName', () => {
  it('accepts workflow names with letters, digits, underscores and hyphens', () => {
    expect(isValidWorkflowName('OrderProcessing')).toBe(true);
    expect(isValidWorkflowName('Order_Processing_2')).toBe(true);
    expect(isValidWorkflowName('Order-Processing-2')).toBe(true);
  });

  it('rejects invalid workflow names', () => {
    expect(isValidWorkflowName('')).toBe(false);
    expect(isValidWorkflowName('123Workflow')).toBe(false);
    expect(isValidWorkflowName('_Workflow')).toBe(false);
    expect(isValidWorkflowName('Workflow Name')).toBe(false);
    expect(isValidWorkflowName('Workflow.Name')).toBe(false);
  });
});
