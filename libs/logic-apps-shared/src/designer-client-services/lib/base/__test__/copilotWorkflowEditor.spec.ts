import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseCopilotWorkflowEditorService } from '../copilotWorkflowEditor';
import type { CopilotWorkflowEditorServiceOptions } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../../utils/src';
import { WorkflowChangeType, WorkflowChangeTargetType } from '../../copilotWorkflowEditor';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock copilotWorkflowEditorTools to avoid depending on real services
vi.mock('../copilotWorkflowEditorTools', () => ({
  COPILOT_WORKFLOW_TOOLS: [],
  executeCopilotTool: vi.fn().mockResolvedValue('{}'),
}));

// Mock copilotWorkflowEditorPrompt
vi.mock('../copilotWorkflowEditorPrompt', () => ({
  DEFAULT_SYSTEM_PROMPT: 'Test system prompt',
}));

// Mock SearchService and ConnectionService so _getAvailableTools returns empty
vi.mock('../../search', () => ({
  SearchService: vi.fn(() => {
    throw new Error('not initialized');
  }),
}));
vi.mock('../../connection', () => ({
  ConnectionService: vi.fn(() => {
    throw new Error('not initialized');
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultOptions: CopilotWorkflowEditorServiceOptions = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'test-api-key',
  model: 'gpt-4o',
};

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
  parameters: {},
  kind: 'Stateful',
};

function makeFetchResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BaseCopilotWorkflowEditorService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Constructor ──────────────────────────────────────────────────────────
  describe('constructor', () => {
    it('should throw when endpoint is empty', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ endpoint: '', apiKey: 'key' })).toThrow('endpoint');
    });

    it('should throw when apiKey is empty', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ endpoint: 'https://example.com', apiKey: '' })).toThrow('apiKey');
    });

    it('should construct successfully with valid options', () => {
      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      expect(svc).toBeDefined();
    });
  });

  // ── Response Parsing (via getWorkflowEdit) ───────────────────────────────
  describe('getWorkflowEdit – response parsing', () => {
    it('should parse a workflow modification response', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'Added an HTTP action',
        workflow: {
          definition: {
            ...simpleWorkflow.definition,
            actions: {
              HTTP_Action: {
                type: 'Http',
                inputs: { method: 'GET', uri: 'https://example.com' },
                runAfter: {},
              },
            },
          },
          connectionReferences: {},
          kind: 'Stateful',
        },
        changes: [
          {
            changeType: 'added',
            targetType: 'action',
            nodeIds: ['HTTP_Action'],
            description: 'Added HTTP action',
          },
        ],
      };

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: JSON.stringify(llmResponse) } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('Add an HTTP action', simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.text).toBe('Added an HTTP action');
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.definition?.actions?.['HTTP_Action']).toBeDefined();
      expect(result.changes).toHaveLength(1);
      expect(result.changes?.[0].changeType).toBe(WorkflowChangeType.Added);
      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
      expect(result.changes?.[0].nodeIds).toEqual(['HTTP_Action']);
    });

    it('should parse a text-only response', async () => {
      const llmResponse = {
        type: 'text',
        text: 'This workflow has 2 actions.',
      };

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: JSON.stringify(llmResponse) } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('How many actions does this workflow have?', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('This workflow has 2 actions.');
      expect(result.workflow).toBeUndefined();
      expect(result.changes).toBeUndefined();
    });

    it('should handle JSON wrapped in a markdown code block', async () => {
      const inner = JSON.stringify({
        type: 'text',
        text: 'Hello from markdown',
      });
      const wrappedContent = `Here is the response:\n\n\`\`\`json\n${inner}\n\`\`\``;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: wrappedContent } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello from markdown');
    });

    it('should handle JSON with single-line comments', async () => {
      const jsonWithComments = `{
        // This is a comment
        "type": "text",
        "text": "Hello"
      }`;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: jsonWithComments } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello');
    });

    it('should handle JSON with block comments', async () => {
      const jsonWithComments = `{
        /* block comment */
        "type": "text",
        "text": "Works with block comments"
      }`;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: jsonWithComments } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.text).toBe('Works with block comments');
    });

    it('should preserve URLs with // inside JSON string values', async () => {
      const jsonWithUrl = `{
        "type": "text",
        "text": "Visit https://example.com for more info"
      }`;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: jsonWithUrl } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.text).toBe('Visit https://example.com for more info');
    });

    it('should fall back to text response when JSON parsing fails', async () => {
      const plainText = 'This is just a plain text response without JSON.';

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: plainText } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe(plainText);
    });

    it('should handle a response with a bare definition (no type wrapper)', async () => {
      const bareDefinition = {
        definition: {
          ...simpleWorkflow.definition,
          actions: {
            NewAction: { type: 'Compose', inputs: 'hello', runAfter: {} },
          },
        },
      };

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: JSON.stringify(bareDefinition) } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow?.definition?.actions?.['NewAction']).toBeDefined();
    });

    it('should preserve current workflow properties when not present in response', async () => {
      const workflowWithExtras: Workflow = {
        ...simpleWorkflow,
        parameters: { param1: { type: 'String', value: 'test' } as any },
        notes: { 'note-1': { location: { x: 0, y: 0 }, text: 'My note' } as any },
      };

      const llmResponse = {
        type: 'workflow',
        text: 'Updated',
        workflow: {
          definition: simpleWorkflow.definition,
        },
      };

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: JSON.stringify(llmResponse) } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', workflowWithExtras);

      expect(result.workflow?.parameters).toEqual(workflowWithExtras.parameters);
      expect(result.workflow?.notes).toEqual(workflowWithExtras.notes);
      expect(result.workflow?.kind).toBe('Stateful');
    });
  });

  // ── Change parsing ───────────────────────────────────────────────────────
  describe('getWorkflowEdit – change parsing', () => {
    it('should parse valid changes with all fields', async () => {
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

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes).toHaveLength(4);
      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
      expect(result.changes?.[1].targetType).toBe(WorkflowChangeTargetType.Note);
      expect(result.changes?.[2].targetType).toBe(WorkflowChangeTargetType.Connection);
      expect(result.changes?.[3].targetType).toBe(WorkflowChangeTargetType.Parameter);
    });

    it('should default invalid changeType to "modified"', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'invalid_type', targetType: 'action', nodeIds: ['A'], description: 'Test' }],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes?.[0].changeType).toBe(WorkflowChangeType.Modified);
    });

    it('should default invalid targetType to "action"', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'unknown_target', nodeIds: ['A'], description: 'Test' }],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes?.[0].targetType).toBe(WorkflowChangeTargetType.Action);
    });

    it('should handle empty changes array', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes).toBeUndefined();
    });

    it('should filter out non-string nodeIds', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'action', nodeIds: ['valid', 123, null, 'also_valid'], description: 'Test' }],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes?.[0].nodeIds).toEqual(['valid', 'also_valid']);
    });

    it('should default missing description to "Change applied"', async () => {
      const llmResponse = {
        type: 'workflow',
        text: 'OK',
        workflow: { definition: simpleWorkflow.definition },
        changes: [{ changeType: 'added', targetType: 'action', nodeIds: ['A'] }],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.changes?.[0].description).toBe('Change applied');
    });
  });

  // ── API interaction ──────────────────────────────────────────────────────
  describe('API interaction', () => {
    it('should use Bearer auth for standard OpenAI endpoints', async () => {
      const llmResponse = { type: 'text', text: 'hi' };
      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', simpleWorkflow);

      const [, fetchOptions] = mockFetch.mock.calls[0];
      const headers = fetchOptions.headers;
      expect(headers['Authorization']).toBe('Bearer test-api-key');
      expect(headers['api-key']).toBeUndefined();
    });

    it('should use api-key header for Azure OpenAI endpoints', async () => {
      const llmResponse = { type: 'text', text: 'hi' };
      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService({
        ...defaultOptions,
        deploymentName: 'my-deployment',
      });
      await svc.getWorkflowEdit('test', simpleWorkflow);

      const [, fetchOptions] = mockFetch.mock.calls[0];
      const headers = fetchOptions.headers;
      expect(headers['api-key']).toBe('test-api-key');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should throw on non-OK HTTP response', async () => {
      mockFetch.mockReturnValueOnce(makeFetchResponse('Rate limit exceeded', false, 429));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);

      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('LLM API request failed (429)');
    });

    it('should throw when LLM returns no message', async () => {
      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{}] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);

      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('LLM returned no message');
    });

    it('should include workflow context and user prompt in the request body', async () => {
      const llmResponse = { type: 'text', text: 'ok' };
      mockFetch.mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('Add an HTTP action', simpleWorkflow);

      const [, fetchOptions] = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      const userMsg = body.messages.find((m: any) => m.role === 'user');
      expect(userMsg.content).toContain('[CURRENT WORKFLOW]');
      expect(userMsg.content).toContain('[USER REQUEST]');
      expect(userMsg.content).toContain('Add an HTTP action');
      expect(userMsg.content).toContain('"Stateful"');
    });
  });

  // ── Responses API detection ──────────────────────────────────────────────
  describe('Responses API detection', () => {
    it('should use Responses API path when endpoint contains /responses', async () => {
      const llmResponse = {
        id: 'resp-1',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify({ type: 'text', text: 'hi' }) }],
          },
        ],
      };

      mockFetch.mockReturnValueOnce(makeFetchResponse(llmResponse));

      const svc = new BaseCopilotWorkflowEditorService({
        ...defaultOptions,
        endpoint: 'https://api.openai.com/v1/responses',
      });
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('hi');

      // Verify that the body uses Responses API format (has "input" and "instructions")
      const [, fetchOptions] = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchOptions.body);
      expect(body.input).toBeDefined();
      expect(body.instructions).toBeDefined();
      expect(body.messages).toBeUndefined();
    });
  });

  // ── Conversation history ─────────────────────────────────────────────────
  describe('conversation history', () => {
    it('should accumulate conversation history across calls', async () => {
      const response1 = { type: 'text', text: 'First response' };
      const response2 = { type: 'text', text: 'Second response' };

      mockFetch
        .mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(response1) } }] }))
        .mockReturnValueOnce(makeFetchResponse({ choices: [{ message: { content: JSON.stringify(response2) } }] }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);

      await svc.getWorkflowEdit('first question', simpleWorkflow);
      await svc.getWorkflowEdit('second question', simpleWorkflow);

      // The second request should include the first conversation pair in messages
      const [, secondFetchOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(secondFetchOptions.body);
      const messages = body.messages;

      // system + history(user + assistant from call 1) + user for call 2
      expect(messages.length).toBe(4); // system, user1, assistant1, user2
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
      expect(messages[3].role).toBe('user');
    });
  });
});
