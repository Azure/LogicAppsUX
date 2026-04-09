import { describe, expect, it } from 'vitest';
import { getChildRunNameFromOutputs, getChildWorkflowIdFromInputs } from '../childWorkflowHelpers';

describe('childWorkflowHelpers', () => {
  describe('getChildRunNameFromOutputs', () => {
    it('returns undefined for null/empty outputs', () => {
      expect(getChildRunNameFromOutputs(null)).toBeUndefined();
      expect(getChildRunNameFromOutputs(undefined)).toBeUndefined();
      expect(getChildRunNameFromOutputs('')).toBeUndefined();
    });

    it('extracts run ID from raw API format (Standard/direct API)', () => {
      const outputs = {
        statusCode: 200,
        headers: {
          'x-ms-workflow-run-id': '08585108-child-run-id',
          'Content-Type': 'application/json',
        },
        body: { result: 'success' },
      };
      expect(getChildRunNameFromOutputs(outputs)).toBe('08585108-child-run-id');
    });

    it('extracts run ID from BoundParameters format (Consumption)', () => {
      const outputs = {
        headers: {
          displayName: 'Headers',
          value: {
            'x-ms-workflow-run-id': '08585108-child-run-id',
            'Content-Type': 'application/json',
          },
        },
      };
      expect(getChildRunNameFromOutputs(outputs)).toBe('08585108-child-run-id');
    });

    it('returns undefined when headers exist but no run ID', () => {
      const outputs = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      expect(getChildRunNameFromOutputs(outputs)).toBeUndefined();
    });

    it('returns undefined when no headers property exists', () => {
      const outputs = {
        statusCode: 200,
        body: { result: 'success' },
      };
      expect(getChildRunNameFromOutputs(outputs)).toBeUndefined();
    });

    it('prefers raw API format over BoundParameters format', () => {
      const outputs = {
        headers: {
          'x-ms-workflow-run-id': 'raw-run-id',
          value: {
            'x-ms-workflow-run-id': 'bound-run-id',
          },
        },
      };
      expect(getChildRunNameFromOutputs(outputs)).toBe('raw-run-id');
    });
  });

  describe('getChildWorkflowIdFromInputs', () => {
    it('returns undefined for null/empty inputs', () => {
      expect(getChildWorkflowIdFromInputs(null)).toBeUndefined();
      expect(getChildWorkflowIdFromInputs(undefined)).toBeUndefined();
      expect(getChildWorkflowIdFromInputs('')).toBeUndefined();
    });

    it('extracts workflow ID from raw API format (Standard)', () => {
      const inputs = {
        host: {
          workflow: {
            id: 'child-workflow-name',
          },
          triggerName: 'manual',
        },
        body: { data: 'test' },
      };
      expect(getChildWorkflowIdFromInputs(inputs)).toBe('child-workflow-name');
    });

    it('extracts workflow ID from BoundParameters format (Consumption)', () => {
      const inputs = {
        'host.workflow.id': {
          displayName: 'Workflow ID',
          value: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Logic/workflows/child-workflow',
        },
      };
      expect(getChildWorkflowIdFromInputs(inputs)).toBe(
        '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Logic/workflows/child-workflow'
      );
    });

    it('returns undefined when host property exists but no workflow.id', () => {
      const inputs = {
        host: {
          triggerName: 'manual',
        },
      };
      expect(getChildWorkflowIdFromInputs(inputs)).toBeUndefined();
    });

    it('returns undefined when no host property exists', () => {
      const inputs = {
        body: { data: 'test' },
        headers: {},
      };
      expect(getChildWorkflowIdFromInputs(inputs)).toBeUndefined();
    });

    it('prefers raw API format over BoundParameters format', () => {
      const inputs = {
        host: {
          workflow: {
            id: 'raw-workflow-id',
          },
        },
        'host.workflow.id': {
          value: 'bound-workflow-id',
        },
      };
      expect(getChildWorkflowIdFromInputs(inputs)).toBe('raw-workflow-id');
    });
  });
});
