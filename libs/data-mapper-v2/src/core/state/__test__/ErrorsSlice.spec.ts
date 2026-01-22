import { describe, it, expect } from 'vitest';
import errorsReducer, { updateDeserializationMessages, initialFunctionState as initialErrorsState, type ErrorsState } from '../ErrorsSlice';
import type { MapIssue } from '../../../utils/MapChecker.Utils';

describe('ErrorsSlice', () => {
  const mockError: MapIssue = {
    reactFlowKey: 'target-/ns0:Root/Name',
    severity: 'error',
    title: 'Missing required connection',
    description: 'Target node has no input connection',
  };

  const mockWarning: MapIssue = {
    reactFlowKey: 'function-123',
    severity: 'warning',
    title: 'Unused function',
    description: 'Function node has no output connections',
  };

  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = errorsReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialErrorsState);
    });

    it('should have empty deserializationMessages array as default', () => {
      const result = errorsReducer(undefined, { type: 'unknown' });

      expect(result.deserializationMessages).toEqual([]);
    });
  });

  describe('updateDeserializationMessages action', () => {
    it('should update deserialization messages when payload is provided', () => {
      const messages: MapIssue[] = [mockError];

      const result = errorsReducer(initialErrorsState, updateDeserializationMessages(messages));

      expect(result.deserializationMessages).toEqual(messages);
      expect(result.deserializationMessages).toHaveLength(1);
    });

    it('should replace existing messages with new ones', () => {
      const existingState: ErrorsState = {
        deserializationMessages: [mockError],
      };
      const newMessages: MapIssue[] = [mockWarning];

      const result = errorsReducer(existingState, updateDeserializationMessages(newMessages));

      expect(result.deserializationMessages).toEqual(newMessages);
      expect(result.deserializationMessages).toHaveLength(1);
      expect(result.deserializationMessages[0].severity).toBe('warning');
    });

    it('should handle multiple messages', () => {
      const messages: MapIssue[] = [mockError, mockWarning];

      const result = errorsReducer(initialErrorsState, updateDeserializationMessages(messages));

      expect(result.deserializationMessages).toHaveLength(2);
      expect(result.deserializationMessages[0].severity).toBe('error');
      expect(result.deserializationMessages[1].severity).toBe('warning');
    });

    it('should handle empty array to clear messages', () => {
      const existingState: ErrorsState = {
        deserializationMessages: [mockError, mockWarning],
      };

      const result = errorsReducer(existingState, updateDeserializationMessages([]));

      expect(result.deserializationMessages).toEqual([]);
    });

    it('should handle messages with different severity levels', () => {
      const messages: MapIssue[] = [
        { ...mockError, severity: 'error' },
        { ...mockWarning, severity: 'warning' },
      ];

      const result = errorsReducer(initialErrorsState, updateDeserializationMessages(messages));

      const errorCount = result.deserializationMessages.filter((m) => m.severity === 'error').length;
      const warningCount = result.deserializationMessages.filter((m) => m.severity === 'warning').length;

      expect(errorCount).toBe(1);
      expect(warningCount).toBe(1);
    });

    it('should preserve message details', () => {
      const detailedMessage: MapIssue = {
        reactFlowKey: 'target-/ns0:Root/Complex/Path',
        severity: 'error',
        title: 'Complex error title',
        description: 'Detailed description of the error with context',
      };

      const result = errorsReducer(initialErrorsState, updateDeserializationMessages([detailedMessage]));

      expect(result.deserializationMessages[0].reactFlowKey).toBe('target-/ns0:Root/Complex/Path');
      expect(result.deserializationMessages[0].title).toBe('Complex error title');
      expect(result.deserializationMessages[0].description).toBe('Detailed description of the error with context');
    });
  });
});
