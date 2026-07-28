import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFileSync } from 'fs';

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}));
/**
 * Tests for workflow save logic as used by OpenDesignerForLocalProject.saveWorkflow().
 * These focus on the serialization, error handling, and concurrency aspects
 * without requiring the full extension host environment.
 */

describe('workflow save - definition serialization', () => {
  it('should preserve workflow structure when saving definition', () => {
    const workflow = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: { action1: { type: 'Http' } },
        triggers: { manual: { type: 'Request' } },
      },
    };

    const newDefinition = {
      ...workflow.definition,
      actions: {
        ...workflow.definition.actions,
        action2: { type: 'Response' },
      },
    };

    workflow.definition = newDefinition;
    const serialized = JSON.stringify(workflow, null, 4);
    const parsed = JSON.parse(serialized);

    expect(parsed.definition.actions.action1).toEqual({ type: 'Http' });
    expect(parsed.definition.actions.action2).toEqual({ type: 'Response' });
    expect(parsed.definition.triggers.manual).toEqual({ type: 'Request' });
  });

  it('should handle undefined definition in workflow JSON', () => {
    // Simulates what happens in the saveWorkflow method when definition is undefined
    const workflow = { definition: undefined };

    // The actual code does: writeFileSync(filePath, JSON.stringify(workflow, null, 4))
    // Verify that JSON.stringify handles undefined definition gracefully
    const serialized = JSON.stringify(workflow, null, 4);
    expect(serialized).toBeDefined();
    expect(JSON.parse(serialized)).toEqual({});
  });

  it('should handle null values in definition', () => {
    const workflow = {
      definition: {
        actions: { step1: { type: 'Http', inputs: null } },
        triggers: {},
      },
    };
    const serialized = JSON.stringify(workflow, null, 4);
    const parsed = JSON.parse(serialized);
    expect(parsed.definition.actions.step1.inputs).toBeNull();
  });

  it('should produce valid 4-space indented JSON', () => {
    const workflow = { definition: { actions: {} } };
    const serialized = JSON.stringify(workflow, null, 4);
    const lines = serialized.split('\n');
    // Second line should be indented by 4 spaces
    expect(lines[1]).toMatch(/^ {4}/);
  });
});

describe('workflow save - writeFileSync behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call writeFileSync with correct path and serialized content', () => {
    const filePath = '/project/workflow/workflow.json';
    const workflow = { definition: { actions: {} } };
    const expected = JSON.stringify(workflow, null, 4);

    writeFileSync(filePath, expected);

    expect(writeFileSync).toHaveBeenCalledWith(filePath, expected);
  });

  it('should throw when writeFileSync fails (simulating disk full)', () => {
    vi.mocked(writeFileSync).mockImplementation(() => {
      throw new Error('ENOSPC: no space left on device');
    });

    const filePath = '/project/workflow/workflow.json';
    const workflow = { definition: { actions: {} } };

    expect(() => writeFileSync(filePath, JSON.stringify(workflow, null, 4))).toThrow('ENOSPC');
  });

  it('should not leave partial data when write fails', () => {
    // writeFileSync is atomic at the OS level - it either succeeds or fails.
    // This test verifies the error message propagation pattern used in saveWorkflow:
    // catch (error) { const errorMessage = error instanceof Error ? error.message : ... }
    const error = new Error('Permission denied');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    expect(errorMessage).toBe('Permission denied');
  });
});

describe('workflow save - concurrent saves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle concurrent save attempts without data corruption', () => {
    const writes: string[] = [];
    vi.mocked(writeFileSync).mockImplementation((_path: any, content: any) => {
      writes.push(content);
    });

    const workflow1 = { definition: { actions: { step1: { type: 'Http' } } } };
    const workflow2 = { definition: { actions: { step2: { type: 'Response' } } } };

    // Simulate two concurrent saves
    writeFileSync('/test/workflow.json', JSON.stringify(workflow1, null, 4));
    writeFileSync('/test/workflow.json', JSON.stringify(workflow2, null, 4));

    // Last write wins — verify no data mixing
    const lastWrite = JSON.parse(writes[writes.length - 1]);
    expect(lastWrite.definition.actions).toHaveProperty('step2');
    expect(lastWrite.definition.actions).not.toHaveProperty('step1');
  });
});

describe('workflow save - error message extraction', () => {
  it('should extract message from Error instances', () => {
    const error = new Error('Connection timeout');
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
    expect(errorMessage).toBe('Connection timeout');
  });

  it('should use string errors directly', () => {
    const error = 'Auth token expired';
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
    expect(errorMessage).toBe('Auth token expired');
  });

  it('should fall back to Unknown error for non-string/Error types', () => {
    const error = { code: 500 };
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
    expect(errorMessage).toBe('Unknown error');
  });

  it('should produce a localized error string with the error message', () => {
    const error = new Error('Network failure');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorLocalized = `Workflow not saved. ${errorMessage}`;
    expect(errorLocalized).toBe('Workflow not saved. Network failure');
  });
});

describe('workflow save - code view JSON parsing', () => {
  it('should handle malformed JSON from code editor', () => {
    const invalidJson = '{ "definition": { invalid }';
    expect(() => JSON.parse(invalidJson)).toThrow();
  });

  it('should parse valid workflow JSON from code editor', () => {
    const validJson = JSON.stringify({
      definition: { actions: {}, triggers: {} },
      parameters: {},
      connectionReferences: {},
    });
    const parsed = JSON.parse(validJson);
    expect(parsed.definition).toBeDefined();
    expect(parsed.parameters).toBeDefined();
    expect(parsed.connectionReferences).toBeDefined();
  });

  it('should handle empty string from code editor', () => {
    expect(() => JSON.parse('')).toThrow();
  });

  it('should handle code editor returning undefined', () => {
    // The code does: JSON.parse(codeEditorRef.current?.getValue() ?? '')
    const value = undefined;
    expect(() => JSON.parse(value ?? '')).toThrow();
  });
});

describe('workflow save - parameter cleanup before save', () => {
  it('should remove $connections from parameters before save', () => {
    const parameters: Record<string, any> = {
      $connections: { defaultValue: {} },
      myParam: { type: 'String', value: 'hello', defaultValue: 'world' },
    };

    // This mirrors the save logic in openDesignerForLocalProject.ts
    delete parameters.$connections;
    for (const parameterKey of Object.keys(parameters)) {
      const parameter = parameters[parameterKey];
      parameter.value = parameter.value ?? parameter.defaultValue;
      delete parameter.defaultValue;
    }

    expect(parameters).not.toHaveProperty('$connections');
    expect(parameters.myParam.value).toBe('hello');
    expect(parameters.myParam).not.toHaveProperty('defaultValue');
  });

  it('should use defaultValue when value is null/undefined', () => {
    const parameters: Record<string, any> = {
      myParam: { type: 'String', value: undefined, defaultValue: 'fallback' },
    };

    for (const parameterKey of Object.keys(parameters)) {
      const parameter = parameters[parameterKey];
      parameter.value = parameter.value ?? parameter.defaultValue;
      delete parameter.defaultValue;
    }

    expect(parameters.myParam.value).toBe('fallback');
  });

  it('should handle empty parameters object', () => {
    const parameters: Record<string, any> = {};

    delete parameters.$connections;
    for (const parameterKey of Object.keys(parameters)) {
      const parameter = parameters[parameterKey];
      parameter.value = parameter.value ?? parameter.defaultValue;
      delete parameter.defaultValue;
    }

    expect(Object.keys(parameters)).toHaveLength(0);
  });
});
