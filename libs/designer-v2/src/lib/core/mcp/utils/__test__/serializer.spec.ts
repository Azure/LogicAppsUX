import { describe, it, expect } from 'vitest';
import { getWorkflowNameFromOperation } from '../serializer';

describe('getWorkflowNameFromOperation', () => {
  describe('when operationSummary is provided', () => {
    it('should use operationSummary when provided', () => {
      const result = getWorkflowNameFromOperation('Send Email', 'send-email-action');
      expect(result).toBe('Send_Email');
    });

    it('should handle operationSummary with parentheses and version numbers', () => {
      const result = getWorkflowNameFromOperation('Send email (V4)', 'send-email-action');
      expect(result).toBe('Send_email_V4');
    });

    it('should handle operationSummary with special characters', () => {
      const result = getWorkflowNameFromOperation('Send Email & Notification!', 'send-email-action');
      expect(result).toBe('Send_Email_Notification');
    });

    it('should handle operationSummary with multiple consecutive underscores', () => {
      const result = getWorkflowNameFromOperation('Send___Email___Action', 'send-email-action');
      expect(result).toBe('Send_Email_Action');
    });

    it('should handle operationSummary with only special characters', () => {
      const result = getWorkflowNameFromOperation('***!!!***', 'send-email-action');
      expect(result).toBe('');
    });
  });

  describe('when operationSummary is undefined', () => {
    it('should use operationId when operationSummary is undefined', () => {
      const result = getWorkflowNameFromOperation(undefined, 'send-email-action');
      expect(result).toBe('send-email-action');
    });

    it('should handle operationId with special characters', () => {
      const result = getWorkflowNameFromOperation(undefined, 'send@email#action!');
      expect(result).toBe('send_email_action');
    });

    it('should handle operationId with leading and trailing underscores', () => {
      const result = getWorkflowNameFromOperation(undefined, '_send_email_action_');
      expect(result).toBe('send_email_action');
    });
  });

  describe('edge cases', () => {
    it('should handle operationId with only special characters', () => {
      const result = getWorkflowNameFromOperation(undefined, '!@#$%^&*()');
      expect(result).toBe('');
    });

    it('should preserve valid characters and hyphens', () => {
      const result = getWorkflowNameFromOperation('Valid-Name_123', 'operation-id');
      expect(result).toBe('Valid-Name_123');
    });

    it('should handle Unicode characters', () => {
      const result = getWorkflowNameFromOperation('Send😀Email', 'operation-id');
      expect(result).toBe('Send_Email');
    });
  });
});
