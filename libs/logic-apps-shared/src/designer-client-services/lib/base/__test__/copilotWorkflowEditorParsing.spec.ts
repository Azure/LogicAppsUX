import { describe, it, expect, vi } from 'vitest';
import { stripJsonComments, repairJson, parseCopilotResponse } from '../copilot/copilotWorkflowEditorParsing';
import type { Workflow } from '../../../../utils/src';
import { WorkflowChangeType, WorkflowChangeTargetType } from '../../copilotWorkflowEditor';

// ---------------------------------------------------------------------------
// Shared test workflow
// ---------------------------------------------------------------------------

const simpleWorkflow: Workflow = {
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    contentVersion: '1.0.0.0',
    triggers: {
      manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } },
    },
    actions: {},
  },
  connectionReferences: {},
  parameters: { myParam: { type: 'String', value: 'hello' } },
  notes: {
    'note-1': { content: 'Existing note', color: '#CCE5FF', metadata: { position: { x: 0, y: 0 }, width: 200, height: 100 } } as any,
  },
  kind: 'Stateful',
};

// ---------------------------------------------------------------------------
// stripJsonComments
// ---------------------------------------------------------------------------

describe('stripJsonComments', () => {
  it('should remove single-line comments', () => {
    const input = `{
      // this is a comment
      "key": "value"
    }`;
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should remove block comments', () => {
    const input = `{
      /* block comment */
      "key": "value"
    }`;
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should preserve // inside JSON string values', () => {
    const input = '{"url": "https://example.com/path"}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ url: 'https://example.com/path' });
  });

  it('should preserve /* inside JSON string values', () => {
    const input = '{"code": "a /* b */ c"}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ code: 'a /* b */ c' });
  });

  it('should handle escaped quotes inside strings', () => {
    const input = '{"text": "He said \\"hello\\""}';
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ text: 'He said "hello"' });
  });

  it('should handle multi-line block comments', () => {
    const input = `{
      /*
       * multi-line
       * block comment
       */
      "key": "value"
    }`;
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should handle input with no comments', () => {
    const input = '{"key": "value"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('should handle empty string', () => {
    expect(stripJsonComments('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// repairJson
// ---------------------------------------------------------------------------

describe('repairJson', () => {
  it('should fix unescaped double quotes inside string values', () => {
    // A quote followed by text (not a structural char) should be escaped
    const broken = '{"text": "He said "hello" to me"}';
    const repaired = repairJson(broken);
    const parsed = JSON.parse(repaired);
    expect(parsed.text).toContain('hello');
  });

  it('should not alter already-valid JSON', () => {
    const valid = '{"key": "value", "num": 42}';
    const repaired = repairJson(valid);
    expect(JSON.parse(repaired)).toEqual({ key: 'value', num: 42 });
  });

  it('should handle escaped characters correctly', () => {
    const input = '{"path": "C:\\\\Users\\\\test"}';
    const repaired = repairJson(input);
    expect(JSON.parse(repaired)).toEqual({ path: 'C:\\Users\\test' });
  });

  it('should handle quotes before structural chars as string closers', () => {
    // Quote followed by } should close the string, not escape
    const input = '{"key": "value"}';
    const repaired = repairJson(input);
    expect(JSON.parse(repaired)).toEqual({ key: 'value' });
  });
});

// ---------------------------------------------------------------------------
// parseCopilotResponse
// ---------------------------------------------------------------------------

describe('parseCopilotResponse', () => {
  // ── Workflow responses ──────────────────────────────────────────────────

  describe('workflow responses', () => {
    it('should parse a valid workflow modification response', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'Added an HTTP action',
        workflow: {
          definition: {
            ...simpleWorkflow.definition,
            actions: {
              HTTP_Action: { type: 'Http', inputs: { method: 'GET', uri: 'https://example.com' }, runAfter: {} },
            },
          },
          connectionReferences: {},
          kind: 'Stateful',
        },
        changes: [{ changeType: 'added', targetType: 'action', nodeIds: ['HTTP_Action'], description: 'Added HTTP action' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.text).toBe('Added an HTTP action');
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.definition?.actions?.['HTTP_Action']).toBeDefined();
      expect(result.changes).toHaveLength(1);
      expect(result.changes?.[0].changeType).toBe(WorkflowChangeType.Added);
      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
    });

    it('should default text to "Workflow updated." when not provided', () => {
      const llmResponse = {
        type: 'workflow',
        workflow: { definition: simpleWorkflow.definition },
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.text).toBe('Workflow updated.');
    });

    it('should preserve current workflow properties when not in response', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'Updated',
        workflow: { definition: simpleWorkflow.definition },
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.workflow?.parameters).toEqual(simpleWorkflow.parameters);
      expect(result.workflow?.notes).toEqual(simpleWorkflow.notes);
      expect(result.workflow?.kind).toBe('Stateful');
    });

    it('should handle a bare definition without type wrapper', () => {
      const bareDefinition = {
        definition: {
          ...simpleWorkflow.definition,
          actions: { NewAction: { type: 'Compose', inputs: 'hello', runAfter: {} } },
        },
      };

      const result = parseCopilotResponse(JSON.stringify(bareDefinition), simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow?.definition?.actions?.['NewAction']).toBeDefined();
      expect(result.text).toBe('Workflow updated.');
    });

    it('should use definition from workflow.definition when workflow has nested definition', () => {
      const response = {
        type: 'workflow',
        text: 'Done',
        workflow: {
          definition: simpleWorkflow.definition,
          connectionReferences: { ref1: { api: { id: 'test' }, connection: { id: 'test' } } },
        },
      };

      const result = parseCopilotResponse(JSON.stringify(response), simpleWorkflow);

      expect(result.workflow?.definition).toEqual(simpleWorkflow.definition);
      expect(result.workflow?.connectionReferences).toEqual({ ref1: { api: { id: 'test' }, connection: { id: 'test' } } });
    });
  });

  // ── Text responses ──────────────────────────────────────────────────────

  describe('text responses', () => {
    it('should parse a text-only response', () => {
      const llmResponse = { type: 'text', text: 'This workflow has 2 actions.' };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('This workflow has 2 actions.');
      expect(result.workflow).toBeUndefined();
      expect(result.changes).toBeUndefined();
    });

    it('should fall back to text when JSON parsing completely fails', () => {
      const plainText = 'This is just a plain text response without JSON.';
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = parseCopilotResponse(plainText, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe(plainText);

      vi.restoreAllMocks();
    });

    it('should use rawContent when text response has no text field', () => {
      const response = { type: 'text' };
      const raw = JSON.stringify(response);

      const result = parseCopilotResponse(raw, simpleWorkflow);

      expect(result.type).toBe('text');
      // Should use rawContent (the sanitized input) since parsed.text is undefined
      expect(result.text).toBe(raw);
    });
  });

  // ── JSON extraction from markdown ───────────────────────────────────────

  describe('JSON extraction', () => {
    it('should extract JSON from a markdown code block with json tag', () => {
      const inner = JSON.stringify({ type: 'text', text: 'Hello from markdown' });
      const wrapped = `Here is the response:\n\n\`\`\`json\n${inner}\n\`\`\``;

      const result = parseCopilotResponse(wrapped, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello from markdown');
    });

    it('should extract JSON from a bare code fence without language tag', () => {
      const inner = JSON.stringify({ type: 'text', text: 'From bare fence' });
      const bareFence = `\`\`\`\n${inner}\n\`\`\``;

      const result = parseCopilotResponse(bareFence, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('From bare fence');
    });

    it('should extract JSON wrapped in prose text', () => {
      const inner = JSON.stringify({ type: 'text', text: 'Extracted from prose' });
      const proseWrapped = `Here is my response:\n\n${inner}\n\nHope that helps!`;

      const result = parseCopilotResponse(proseWrapped, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Extracted from prose');
    });
  });

  // ── Comment handling ────────────────────────────────────────────────────

  describe('comment handling', () => {
    it('should handle JSON with single-line comments', () => {
      const jsonWithComments = `{
        // This is a comment
        "type": "text",
        "text": "Hello"
      }`;

      const result = parseCopilotResponse(jsonWithComments, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello');
    });

    it('should handle JSON with block comments', () => {
      const jsonWithComments = `{
        /* block comment */
        "type": "text",
        "text": "Works with block comments"
      }`;

      const result = parseCopilotResponse(jsonWithComments, simpleWorkflow);

      expect(result.text).toBe('Works with block comments');
    });

    it('should preserve URLs with // inside JSON string values', () => {
      const jsonWithUrl = `{
        "type": "text",
        "text": "Visit https://example.com for more info"
      }`;

      const result = parseCopilotResponse(jsonWithUrl, simpleWorkflow);

      expect(result.text).toBe('Visit https://example.com for more info');
    });
  });

  // ── Unicode sanitization ────────────────────────────────────────────────

  describe('unicode sanitization', () => {
    it('should strip BOM, ZWSP, and other invisible Unicode characters', () => {
      const validJson = JSON.stringify({ type: 'text', text: 'Cleaned up' });
      const withInvisible = '\uFEFF\u200B' + validJson + '\u200D';

      const result = parseCopilotResponse(withInvisible, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Cleaned up');
    });

    it('should strip non-breaking spaces', () => {
      const validJson = JSON.stringify({ type: 'text', text: 'Fixed' });
      const withNbsp = '\u00A0' + validJson;

      const result = parseCopilotResponse(withNbsp, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Fixed');
    });
  });

  // ── JSON repair ─────────────────────────────────────────────────────────

  describe('JSON repair', () => {
    it('should repair unescaped double quotes inside string values', () => {
      const brokenJson =
        '{"type":"workflow","text":"Added note","workflow":{"definition":{"$schema":"test","contentVersion":"1.0","triggers":{},"actions":{}},"notes":{"abc-123":{"content":""The only way out is through." — Robert Frost","color":"#CCE5FF","metadata":{"position":{"x":0,"y":0},"width":200,"height":100}}}},"changes":[{"changeType":"added","targetType":"note","nodeIds":["abc-123"],"description":"Added a note"}]}';

      const result = parseCopilotResponse(brokenJson, simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.notes?.['abc-123']).toBeDefined();
    });
  });

  // ── Change parsing ──────────────────────────────────────────────────────

  describe('change parsing', () => {
    it('should parse valid changes with all fields', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'Changes applied',
        workflow: { definition: simpleWorkflow.definition },
        changes: [
          { changeType: 'added', targetType: 'action', nodeIds: ['Action1'], description: 'Added action' },
          { changeType: 'modified', targetType: 'note', nodeIds: [], description: 'Updated note' },
          { changeType: 'removed', targetType: 'connection', nodeIds: ['conn1'], description: 'Removed connection' },
          { changeType: 'added', targetType: 'parameter', nodeIds: [], description: 'Added parameter' },
        ],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes).toHaveLength(4);
      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
      expect(result.changes?.[1].targetType).toBe(WorkflowChangeTargetType.Note);
      expect(result.changes?.[2].targetType).toBe(WorkflowChangeTargetType.Connection);
      expect(result.changes?.[3].targetType).toBe(WorkflowChangeTargetType.Parameter);
    });

    it('should default invalid changeType to "modified"', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'invalid_type', targetType: 'action', nodeIds: ['A'], description: 'Test' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes?.[0].changeType).toBe(WorkflowChangeType.Modified);
    });

    it('should default invalid targetType to "action"', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'unknown_target', nodeIds: ['A'], description: 'Test' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
    });

    it('should return undefined for empty changes array', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes).toBeUndefined();
    });

    it('should filter out non-string nodeIds', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'action', nodeIds: ['valid', 123, null, 'also_valid'], description: 'Test' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes?.[0].nodeIds).toEqual(['valid', 'also_valid']);
    });

    it('should default missing description to "Change applied"', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'action', nodeIds: ['A'] }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes?.[0].description).toBe('Change applied');
    });

    it('should handle missing nodeIds by defaulting to empty array', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'action', description: 'No nodeIds' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes?.[0].nodeIds).toEqual([]);
    });

    it('should filter out non-object entries from changes array', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [null, undefined, 'not an object', { changeType: 'added', targetType: 'action', nodeIds: ['A'], description: 'Valid' }],
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes).toHaveLength(1);
      expect(result.changes?.[0].description).toBe('Valid');
    });

    it('should return undefined changes when no changes field is present', () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
      };

      const result = parseCopilotResponse(JSON.stringify(llmResponse), simpleWorkflow);

      expect(result.changes).toBeUndefined();
    });
  });

  // ── Unknown parsed object ───────────────────────────────────────────────

  describe('fallback for unrecognized parsed objects', () => {
    it('should return text response for parsed object without recognized type', () => {
      const unknown = { someRandomField: 'value', text: 'fallback text' };

      const result = parseCopilotResponse(JSON.stringify(unknown), simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('fallback text');
    });

    it('should use rawContent when parsed object has no text field', () => {
      const unknown = { someRandomField: 'value' };
      const raw = JSON.stringify(unknown);

      const result = parseCopilotResponse(raw, simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe(raw);
    });
  });
});
