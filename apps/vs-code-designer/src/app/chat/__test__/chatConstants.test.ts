import { describe, it, expect } from 'vitest';
import {
  CHAT_PARTICIPANT_ID,
  CHAT_PARTICIPANT_NAME,
  CHAT_PARTICIPANT_FULL_NAME,
  ChatCommand,
  ToolName,
  WorkflowTypeOption,
  ProjectTypeOption,
} from '../chatConstants';

describe('Chat Constants', () => {
  describe('Chat Participant Constants', () => {
    it('should have correct participant ID', () => {
      expect(CHAT_PARTICIPANT_ID).toBe('vscode-azurelogicapps.logicapps');
    });

    it('should have correct participant name', () => {
      expect(CHAT_PARTICIPANT_NAME).toBe('logicapps');
    });

    it('should have correct full name', () => {
      expect(CHAT_PARTICIPANT_FULL_NAME).toBe('Azure Logic Apps');
    });
  });

  describe('ChatCommand', () => {
    it('should have all required commands', () => {
      expect(ChatCommand.createWorkflow).toBe('createWorkflow');
      expect(ChatCommand.createProject).toBe('createProject');
      expect(ChatCommand.modifyAction).toBe('modifyAction');
      expect(ChatCommand.help).toBe('help');
    });
  });

  describe('ToolName', () => {
    it('should have all required tool names', () => {
      expect(ToolName.createWorkflow).toBe('logicapps_createWorkflow');
      expect(ToolName.createProject).toBe('logicapps_createProject');
      expect(ToolName.listWorkflows).toBe('logicapps_listWorkflows');
      expect(ToolName.getWorkflowDefinition).toBe('logicapps_getWorkflowDefinition');
      expect(ToolName.addAction).toBe('logicapps_addAction');
      expect(ToolName.modifyAction).toBe('logicapps_modifyAction');
    });
  });

  describe('WorkflowTypeOption', () => {
    it('should have all workflow types', () => {
      expect(WorkflowTypeOption.stateful).toBe('stateful');
      expect(WorkflowTypeOption.stateless).toBe('stateless');
      expect(WorkflowTypeOption.agentic).toBe('agentic');
      expect(WorkflowTypeOption.agent).toBe('agent');
    });
  });

  describe('ProjectTypeOption', () => {
    it('should have all project types', () => {
      expect(ProjectTypeOption.logicApp).toBe('logicApp');
      expect(ProjectTypeOption.logicAppCustomCode).toBe('logicAppCustomCode');
    });
  });
});
