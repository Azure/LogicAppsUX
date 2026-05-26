import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkflowChangeType,
  WorkflowChangeTargetType,
  InitCopilotWorkflowEditorService,
  CopilotWorkflowEditorService,
  isCopilotWorkflowEditorServiceInitialized,
} from '../copilotWorkflowEditor';
import type { ICopilotWorkflowEditorService, WorkflowChange, WorkflowEditResponse } from '../copilotWorkflowEditor';

describe('lib/designer-client-services/copilotWorkflowEditor', () => {
  describe('WorkflowChangeType enum', () => {
    it('should have Added, Modified, and Removed values', () => {
      expect(WorkflowChangeType.Added).toBe('added');
      expect(WorkflowChangeType.Modified).toBe('modified');
      expect(WorkflowChangeType.Removed).toBe('removed');
    });
  });

  describe('WorkflowChangeTargetType enum', () => {
    it('should have Action, Note, Connection, and Parameter values', () => {
      expect(WorkflowChangeTargetType.Action).toBe('action');
      expect(WorkflowChangeTargetType.Note).toBe('note');
      expect(WorkflowChangeTargetType.Connection).toBe('connection');
      expect(WorkflowChangeTargetType.Parameter).toBe('parameter');
    });
  });

  describe('Service registration', () => {
    // The module-level `service` variable persists across tests within the same module instance,
    // so we re-import or re-init as needed.

    it('should throw AssertionException when CopilotWorkflowEditorService is called before initialization', async () => {
      // Use a dynamic import with cache-busting to get fresh module state
      const freshModule = await import(`../copilotWorkflowEditor?t=${Date.now()}`);
      expect(() => freshModule.CopilotWorkflowEditorService()).toThrow(
        'CopilotWorkflowEditor Service needs to be initialized before using'
      );
    });

    it('should report not initialized before InitCopilotWorkflowEditorService is called', async () => {
      const freshModule = await import(`../copilotWorkflowEditor?t=${Date.now() + 1}`);
      expect(freshModule.isCopilotWorkflowEditorServiceInitialized()).toBe(false);
    });

    it('should return true from isCopilotWorkflowEditorServiceInitialized after initialization', () => {
      const mockService: ICopilotWorkflowEditorService = {
        getWorkflowEdit: vi.fn(),
      };

      InitCopilotWorkflowEditorService(mockService);
      expect(isCopilotWorkflowEditorServiceInitialized()).toBe(true);
    });

    it('should return the initialized service from CopilotWorkflowEditorService', () => {
      const mockService: ICopilotWorkflowEditorService = {
        getWorkflowEdit: vi.fn(),
      };

      InitCopilotWorkflowEditorService(mockService);
      const result = CopilotWorkflowEditorService();
      expect(result).toBe(mockService);
    });

    it('should be callable through returned service reference', async () => {
      const mockResponse: WorkflowEditResponse = {
        type: 'text',
        text: 'Hello!',
      };
      const mockService: ICopilotWorkflowEditorService = {
        getWorkflowEdit: vi.fn().mockResolvedValue(mockResponse),
      };

      InitCopilotWorkflowEditorService(mockService);
      const svc = CopilotWorkflowEditorService();
      const workflow = { definition: { $schema: '', contentVersion: '', triggers: {}, actions: {} } };
      const result = await svc.getWorkflowEdit('test prompt', workflow);

      expect(mockService.getWorkflowEdit).toHaveBeenCalledWith('test prompt', workflow);
      expect(result).toEqual(mockResponse);
    });

    it('should allow re-initialization with a different service', () => {
      const firstService: ICopilotWorkflowEditorService = { getWorkflowEdit: vi.fn() };
      const secondService: ICopilotWorkflowEditorService = { getWorkflowEdit: vi.fn() };

      InitCopilotWorkflowEditorService(firstService);
      expect(CopilotWorkflowEditorService()).toBe(firstService);

      InitCopilotWorkflowEditorService(secondService);
      expect(CopilotWorkflowEditorService()).toBe(secondService);
    });
  });

  describe('WorkflowChange interface', () => {
    it('should accept all valid change type and target type combinations', () => {
      const changeTypes = [WorkflowChangeType.Added, WorkflowChangeType.Modified, WorkflowChangeType.Removed];
      const targetTypes = [
        WorkflowChangeTargetType.Action,
        WorkflowChangeTargetType.Note,
        WorkflowChangeTargetType.Connection,
        WorkflowChangeTargetType.Parameter,
      ];

      for (const changeType of changeTypes) {
        for (const targetType of targetTypes) {
          const change: WorkflowChange = {
            changeType,
            targetType,
            nodeIds: ['node1'],
            description: `${changeType} ${targetType}`,
          };
          expect(change.changeType).toBe(changeType);
          expect(change.targetType).toBe(targetType);
        }
      }
    });

    it('should support optional iconUri and brandColor', () => {
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Send_Email'],
        description: 'Added Send Email action',
        iconUri: 'https://example.com/icon.png',
        brandColor: '#0078D4',
      };
      expect(change.iconUri).toBe('https://example.com/icon.png');
      expect(change.brandColor).toBe('#0078D4');
    });
  });

  describe('WorkflowEditResponse interface', () => {
    it('should support text type response', () => {
      const response: WorkflowEditResponse = {
        type: 'text',
        text: 'I cannot modify triggers.',
      };
      expect(response.type).toBe('text');
      expect(response.workflow).toBeUndefined();
      expect(response.changes).toBeUndefined();
    });

    it('should support workflow type response with changes', () => {
      const response: WorkflowEditResponse = {
        type: 'workflow',
        text: 'Added a delay action',
        workflow: { definition: { $schema: '', contentVersion: '', triggers: {}, actions: { Delay: { type: 'Wait' } } } },
        changes: [
          {
            changeType: WorkflowChangeType.Added,
            targetType: WorkflowChangeTargetType.Action,
            nodeIds: ['Delay'],
            description: 'Added Delay action',
          },
        ],
      };
      expect(response.type).toBe('workflow');
      expect(response.workflow).toBeDefined();
      expect(response.changes).toHaveLength(1);
    });
  });
});
