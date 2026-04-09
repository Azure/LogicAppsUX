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

    it('should repair unescaped double quotes inside JSON string values', async () => {
      // Simulate LLM producing unescaped quotes in a note's content field
      const brokenJson =
        '{"type":"workflow","text":"Added note","workflow":{"definition":{"$schema":"test","contentVersion":"1.0","triggers":{},"actions":{}},"notes":{"abc-123":{"content":""The only way out is through." — Robert Frost","color":"#CCE5FF","metadata":{"position":{"x":0,"y":0},"width":200,"height":100}}}},"changes":[{"changeType":"added","targetType":"note","nodeIds":["abc-123"],"description":"Added a note"}]}';

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: brokenJson } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('add a note', simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.notes?.['abc-123']).toBeDefined();
      expect(result.changes).toHaveLength(1);
    });

    it('should extract JSON wrapped in prose text (no code fence)', async () => {
      const inner = JSON.stringify({ type: 'text', text: 'Extracted from prose' });
      const proseWrapped = `Here is my response:\n\n${inner}\n\nHope that helps!`;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: proseWrapped } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Extracted from prose');
    });

    it('should handle JSON in a bare code fence without language tag', async () => {
      const inner = JSON.stringify({ type: 'text', text: 'From bare fence' });
      const bareFence = `\`\`\`\n${inner}\n\`\`\``;

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: bareFence } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('From bare fence');
    });

    it('should parse a large workflow response with notes and parameters', async () => {
      // Exact response from a real LLM call that was displayed as text instead of being applied
      const realLlmResponse =
        '{"type":"workflow","text":"Added a random sample workflow with 14 actions including variables, data shaping, branching, looping, delay, and response, plus a documentation note.","changes":[{"changeType":"added","targetType":"action","nodeIds":["Initialize_RequestId"],"description":"Added an Initialize Variable action to store a generated request ID"},{"changeType":"added","targetType":"action","nodeIds":["Initialize_Items"],"description":"Added an Initialize Variable action with a sample array of items"},{"changeType":"added","targetType":"action","nodeIds":["Initialize_Total"],"description":"Added an Initialize Variable action to track a running total"},{"changeType":"added","targetType":"action","nodeIds":["Compose_RequestSummary"],"description":"Added a Compose action to summarize incoming request details"},{"changeType":"added","targetType":"action","nodeIds":["Parse_TestParameter"],"description":"Added a Compose action to surface the Test workflow parameter value"},{"changeType":"added","targetType":"action","nodeIds":["Condition_HasBody"],"description":"Added a condition to check whether the HTTP request body contains data"},{"changeType":"added","targetType":"action","nodeIds":["For_each_Item"],"description":"Added a loop to process each sample item"},{"changeType":"added","targetType":"action","nodeIds":["Delay_Before_Response"],"description":"Added a short wait before generating the response"},{"changeType":"added","targetType":"action","nodeIds":["Create_Final_Result"],"description":"Added a Compose action to build the final result payload"},{"changeType":"added","targetType":"action","nodeIds":["Return_Response"],"description":"Added an HTTP response action returning the workflow results"},{"changeType":"added","targetType":"note","nodeIds":["6e8d9b7b-f4c1-4f66-9cb9-2bb3a0b9d1a1"],"description":"Added a note documenting the sample workflow flow"}],"workflow":{"definition":{"$schema":"https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#","contentVersion":"1.0.0.0","parameters":{"Test":{"type":"String"}},"triggers":{"When_an_HTTP_request_is_received":{"type":"Request","kind":"Http"}},"actions":{"Initialize_RequestId":{"type":"InitializeVariable","inputs":{"variables":[{"name":"RequestId","type":"string","value":"@guid()"}]}},"Initialize_Items":{"type":"InitializeVariable","runAfter":{"Initialize_RequestId":["Succeeded"]},"inputs":{"variables":[{"name":"Items","type":"array","value":[1,2,3,4,5]}]}},"Initialize_Total":{"type":"InitializeVariable","runAfter":{"Initialize_Items":["Succeeded"]},"inputs":{"variables":[{"name":"Total","type":"integer","value":0}]}},"Compose_RequestSummary":{"type":"Compose","runAfter":{"Initialize_Total":["Succeeded"]},"inputs":{"requestId":"@variables(\'RequestId\')","triggerName":"When_an_HTTP_request_is_received","receivedAt":"@utcNow()","body":"@triggerBody()"}},"Parse_TestParameter":{"type":"Compose","runAfter":{"Compose_RequestSummary":["Succeeded"]},"inputs":"@parameters(\'TestParam\')"},"Condition_HasBody":{"type":"If","runAfter":{"Parse_TestParameter":["Succeeded"]},"expression":{"and":[{"not":{"equals":["@string(triggerBody())",""]}},{"not":{"equals":["@string(triggerBody())","null"]}}]},"actions":{"Compose_Body_Found":{"type":"Compose","inputs":{"message":"Request body was provided","body":"@triggerBody()"}},"Set_Status_HasBody":{"type":"Compose","runAfter":{"Compose_Body_Found":["Succeeded"]},"inputs":"HasBody"}},"else":{"actions":{"Compose_No_Body":{"type":"Compose","inputs":{"message":"No request body was provided"}},"Set_Status_NoBody":{"type":"Compose","runAfter":{"Compose_No_Body":["Succeeded"]},"inputs":"NoBody"}}}},"For_each_Item":{"type":"Foreach","runAfter":{"Condition_HasBody":["Succeeded"]},"foreach":"@variables(\'Items\')","actions":{"Compose_Current_Item":{"type":"Compose","inputs":"@item()"},"Increment_Total":{"type":"IncrementVariable","runAfter":{"Compose_Current_Item":["Succeeded"]},"inputs":{"name":"Total","value":"@item()"}},"Compose_Item_Details":{"type":"Compose","runAfter":{"Increment_Total":["Succeeded"]},"inputs":{"item":"@item()","doubled":"@mul(item(),2)","runningTotal":"@variables(\'Total\')"}}}},"Compose_Array_Count":{"type":"Compose","runAfter":{"For_each_Item":["Succeeded"]},"inputs":"@length(variables(\'Items\'))"},"Compose_IsLargeTotal":{"type":"Compose","runAfter":{"Compose_Array_Count":["Succeeded"]},"inputs":"@greater(variables(\'Total\'),10)"},"Switch_On_Total":{"type":"Switch","runAfter":{"Compose_IsLargeTotal":["Succeeded"]},"expression":"@variables(\'Total\')","cases":{"Case_15":{"case":"15","actions":{"Compose_Total_Is_15":{"type":"Compose","inputs":"Total equals 15"}}},"DefaultRange":{"case":"0","actions":{"Compose_Total_DefaultRange":{"type":"Compose","inputs":"Total did not match the explicit case"}}}},"default":{"actions":{"Compose_Total_Default":{"type":"Compose","inputs":"Default branch executed"}}}},"Compose_Timestamp":{"type":"Compose","runAfter":{"Switch_On_Total":["Succeeded"]},"inputs":"@utcNow()"},"Delay_Before_Response":{"type":"Wait","runAfter":{"Compose_Timestamp":["Succeeded"]},"inputs":{"interval":{"count":1,"unit":"Second"}}},"Create_Final_Result":{"type":"Compose","runAfter":{"Delay_Before_Response":["Succeeded"]},"inputs":{"requestId":"@variables(\'RequestId\')","parameterValue":"@parameters(\'AAA\')","testParameter":"@parameters(\'TestParam\')","itemCount":"@outputs(\'Compose_Array_Count\')","total":"@variables(\'Total\')","isLarge":"@outputs(\'Compose_IsLargeTotal\')","timestamp":"@outputs(\'Compose_Timestamp\')","requestSummary":"@outputs(\'Compose_RequestSummary\')"}},"Return_Response":{"type":"Response","runAfter":{"Create_Final_Result":["Succeeded"]},"inputs":{"statusCode":200,"body":{"message":"Random sample workflow completed","result":"@outputs(\'Create_Final_Result\')"}}}},"outputs":{}},"kind":"stateful","notes":{"6e8d9b7b-f4c1-4f66-9cb9-2bb3a0b9d1a1":{"content":"## Sample workflow\\nThis example starts from an HTTP request, initializes variables, evaluates the request body, loops through sample items, calculates a total, and returns a response.","color":"#CCE5FF","metadata":{"position":{"x":-400,"y":0},"width":260,"height":140}}},"parameters":{"AAA":{"type":"String","value":"FFF"},"TestParam":{"type":"String","value":"TestA"}}}}';

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: realLlmResponse } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('create a random workflow, add 10-20 actions', simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.definition?.actions?.['Initialize_RequestId']).toBeDefined();
      expect(result.workflow?.definition?.actions?.['Return_Response']).toBeDefined();
      expect(result.workflow?.notes?.['6e8d9b7b-f4c1-4f66-9cb9-2bb3a0b9d1a1']).toBeDefined();
      expect(result.workflow?.parameters?.['AAA']).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(result.changes!.length).toBeGreaterThan(5);
    });

    it('should strip invisible Unicode characters (BOM, ZWSP) before parsing', async () => {
      const validJson = JSON.stringify({ type: 'text', text: 'Cleaned up' });
      // Prepend BOM (U+FEFF) and zero-width space (U+200B)
      const withInvisible = '\uFEFF\u200B' + validJson + '\u200D';

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [{ message: { content: withInvisible } }],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Cleaned up');
    });

    it('should detect finish_reason=length without crashing', async () => {
      // Simulate a truncated response where finish_reason is 'length'
      const truncated = '{"type":"workflow","text":"Added';
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockReturnValueOnce(
        makeFetchResponse({
          choices: [
            {
              message: { content: truncated },
              finish_reason: 'length',
            },
          ],
        })
      );

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('test', simpleWorkflow);

      // Should fall back to text since the JSON is incomplete
      expect(result.type).toBe('text');
      // Should have warned about truncation
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('truncated'), expect.anything(), expect.anything());
      consoleSpy.mockRestore();
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
