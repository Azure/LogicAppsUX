import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { BaseCopilotWorkflowEditorService } from '../copilotWorkflowEditor';
import type { BaseCopilotWorkflowEditorServiceOptions } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../../utils/src';

// ---------------------------------------------------------------------------
// Mock axios
// ---------------------------------------------------------------------------
const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetAccessToken = vi.fn();

const defaultOptions: BaseCopilotWorkflowEditorServiceOptions = {
  baseUrl: 'https://management.azure.com',
  subscriptionId: 'sub-123',
  location: 'westus2',
  apiVersion: '2024-02-01',
  getAccessToken: mockGetAccessToken,
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

function mockPostResponse(responsePayload: string) {
  mockAxiosPost.mockResolvedValueOnce({
    data: { properties: { response: responsePayload } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BaseCopilotWorkflowEditorService', () => {
  beforeEach(() => {
    mockGetAccessToken.mockResolvedValue('Bearer test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Constructor validation ──────────────────────────────────────────────

  describe('constructor', () => {
    it('should throw when baseUrl is empty', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ ...defaultOptions, baseUrl: '' })).toThrow('baseUrl');
    });

    it('should throw when subscriptionId is empty', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ ...defaultOptions, subscriptionId: '' })).toThrow('subscriptionId');
    });

    it('should throw when apiVersion is empty', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ ...defaultOptions, apiVersion: '' })).toThrow('apiVersion');
    });

    it('should throw when getAccessToken is not provided', () => {
      expect(() => new BaseCopilotWorkflowEditorService({ ...defaultOptions, getAccessToken: undefined as any })).toThrow('getAccessToken');
    });

    it('should construct successfully with valid options', () => {
      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      expect(svc).toBeDefined();
    });

    it('should construct successfully when location is empty', () => {
      const svc = new BaseCopilotWorkflowEditorService({ ...defaultOptions, location: '' });
      expect(svc).toBeDefined();
    });
  });

  // ── getWorkflowEdit ─────────────────────────────────────────────────────

  describe('getWorkflowEdit', () => {
    it('should throw when location is empty', async () => {
      const svc = new BaseCopilotWorkflowEditorService({ ...defaultOptions, location: '' });
      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('location');
    });

    it('should throw when getAccessToken returns an empty string', async () => {
      mockGetAccessToken.mockResolvedValueOnce('');
      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('empty or undefined');
    });

    it('should throw when getAccessToken returns a non-Bearer token', async () => {
      mockGetAccessToken.mockResolvedValueOnce('token-without-prefix');
      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('Bearer-prefixed');
    });

    it('should call the correct ARM endpoint', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'Hello' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test prompt', simpleWorkflow);

      expect(mockAxiosPost).toHaveBeenCalledOnce();
      const [uri] = mockAxiosPost.mock.calls[0];
      expect(uri).toBe(
        'https://management.azure.com/subscriptions/sub-123/providers/Microsoft.Logic/locations/westus2/generateCopilotResponse'
      );
    });

    it('should pass api-version as query parameter', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'Hello' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test prompt', simpleWorkflow);

      const [, , config] = mockAxiosPost.mock.calls[0];
      expect(config.params).toEqual({ 'api-version': '2024-02-01' });
    });

    it('should include Authorization header from getAccessToken', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'Hello' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test prompt', simpleWorkflow);

      const [, , config] = mockAxiosPost.mock.calls[0];
      expect(config.headers.Authorization).toBe('Bearer test-token');
    });

    it('should send prompt in request body as query', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'Hello' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('Add an HTTP action', simpleWorkflow);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.query).toBe('Add an HTTP action');
    });

    it('should send workflow definition and kind in request body', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'Hello' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', simpleWorkflow);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.workflow.definition).toEqual(simpleWorkflow.definition);
      expect(body.properties.workflow.kind).toBe('Stateful');
    });

    it('should include parameters in request body when present', async () => {
      const workflowWithParams: Workflow = {
        ...simpleWorkflow,
        parameters: { param1: { type: 'String', value: 'test' } },
      };
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', workflowWithParams);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.workflow.parameters).toEqual(workflowWithParams.parameters);
    });

    it('should exclude parameters from request body when empty', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', simpleWorkflow);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.workflow.parameters).toBeUndefined();
    });

    it('should include notes in request body when present', async () => {
      const workflowWithNotes: Workflow = {
        ...simpleWorkflow,
        notes: { n1: { content: 'A note', color: '#CCE5FF', metadata: { position: { x: 0, y: 0 }, width: 200, height: 100 } } as any },
      };
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', workflowWithNotes);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.workflow.notes).toEqual(workflowWithNotes.notes);
    });

    it('should exclude notes from request body when empty', async () => {
      const workflowNoNotes: Workflow = { ...simpleWorkflow, notes: {} };
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', workflowNoNotes);

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.workflow.notes).toBeUndefined();
    });

    it('should parse a workflow response from the API', async () => {
      const workflowResponse = {
        type: 'workflow',
        text: 'Added an action',
        workflow: {
          definition: {
            ...simpleWorkflow.definition,
            actions: { NewAction: { type: 'Compose', inputs: 'test', runAfter: {} } },
          },
        },
      };
      mockPostResponse(JSON.stringify(workflowResponse));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('add an action', simpleWorkflow);

      expect(result.type).toBe('workflow');
      expect(result.workflow?.definition?.actions?.['NewAction']).toBeDefined();
    });

    it('should parse a text response from the API', async () => {
      const textResponse = { type: 'text', text: 'This workflow has no actions.' };
      mockPostResponse(JSON.stringify(textResponse));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      const result = await svc.getWorkflowEdit('describe this workflow', simpleWorkflow);

      expect(result.type).toBe('text');
      expect(result.text).toBe('This workflow has no actions.');
    });

    it('should throw when API returns no response text', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { properties: {} } });

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);

      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('No response received from copilot API');
    });

    it('should throw when response data is null', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: null });

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);

      await expect(svc.getWorkflowEdit('test', simpleWorkflow)).rejects.toThrow('No response received from copilot API');
    });

    it('should pass abort signal to axios', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const controller = new AbortController();
      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', simpleWorkflow, controller.signal);

      const [, , config] = mockAxiosPost.mock.calls[0];
      expect(config.signal).toBe(controller.signal);
    });
  });

  // ── SKU resolution ──────────────────────────────────────────────────────

  describe('SKU resolution', () => {
    it('should resolve "Stateful" kind to "standard" SKU', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', { ...simpleWorkflow, kind: 'Stateful' });

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.sku).toBe('standard');
    });

    it('should resolve "Stateless" kind to "standard" SKU', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', { ...simpleWorkflow, kind: 'Stateless' });

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.sku).toBe('standard');
    });

    it('should resolve "stateful" (lowercase) kind to "standard" SKU', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', { ...simpleWorkflow, kind: 'stateful' });

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.sku).toBe('standard');
    });

    it('should resolve undefined kind to "consumption" SKU', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', { ...simpleWorkflow, kind: undefined });

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.sku).toBe('consumption');
    });

    it('should resolve unknown kind to "consumption" SKU', async () => {
      mockPostResponse(JSON.stringify({ type: 'text', text: 'ok' }));

      const svc = new BaseCopilotWorkflowEditorService(defaultOptions);
      await svc.getWorkflowEdit('test', { ...simpleWorkflow, kind: 'SomeOtherKind' });

      const [, body] = mockAxiosPost.mock.calls[0];
      expect(body.properties.sku).toBe('consumption');
    });
  });
});
