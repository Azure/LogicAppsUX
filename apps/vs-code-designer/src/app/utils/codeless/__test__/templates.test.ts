import { type StandardApp, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';
import { getCodelessWorkflowTemplate } from '../templates';
import { WorkflowKind, WorkflowType } from '../../../../constants';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';

const functionName = 'testFunction';

describe('utils/codeless/templates', () => {
  it('Should return a stateful workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.customCode, WorkflowType.stateful, functionName);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.customCode, WorkflowType.stateless, functionName);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateful workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.rulesEngine, WorkflowType.stateful, functionName);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.rulesEngine, WorkflowType.stateless, functionName);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return an empty stateful workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.stateful);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });

  it('Should return an empty stateless workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.stateless);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });

  it('Should return an agentic workflow definition with Agent action', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.agentic);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(Object.values(workflowDefinition?.definition?.actions ?? {}).some((action) => (action as any).type === 'Agent')).toBe(true);
    expect(workflowDefinition.definition.actions).toHaveProperty('Default_Agent');
    expect(workflowDefinition.definition.actions?.Default_Agent.type).toBe('Agent');
  });

  it('Should return an agent workflow definition with Agent trigger and action', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.agent);
    expect(workflowDefinition.kind).toBe(WorkflowKind.agent);
    expect(Object.values(workflowDefinition?.definition?.actions ?? {}).some((action) => (action as any).type === 'Agent')).toBe(true);
    expect(workflowDefinition.definition.actions).toHaveProperty('Default_Agent');
    expect(workflowDefinition.definition.actions?.Default_Agent.type).toBe('Agent');
    expect(workflowDefinition.definition.triggers).toHaveProperty('When_a_new_chat_session_starts');
    expect(workflowDefinition.definition.triggers?.When_a_new_chat_session_starts.type).toBe('Request');
    expect(workflowDefinition.definition.triggers?.When_a_new_chat_session_starts.kind).toBe('Agent');
    expect(workflowDefinition.definition.actions?.Default_Agent.runAfter).toHaveProperty('When_a_new_chat_session_starts');
  });

  it('Should return agentic workflow with empty triggers', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.agentic);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(workflowDefinition.definition.triggers).toEqual({});
    expect(workflowDefinition.definition.actions?.Default_Agent.runAfter).toEqual({});
  });

  // ...existing code...

  it('Should return an autonomous agent workflow definition with correct metadata for Consumption', () => {
    const workflowDefinition: any = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.agentic, undefined, true); // isConsumption = true
    expect(workflowDefinition.metadata?.AgentType).toBe('Autonomous');
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(
      Object.values(workflowDefinition?.definition?.actions ?? {}).some((action) => (action as { type?: string }).type === 'Agent')
    ).toBe(true);
  });

  it('Should return a conversational agent workflow definition with correct metadata and undeletable trigger for Consumption', () => {
    const workflowDefinition: any = getCodelessWorkflowTemplate(ProjectType.logicApp, WorkflowType.agent, undefined, true); // isConsumption = true
    expect(workflowDefinition.metadata?.AgentType).toBe('Conversational');
    expect(workflowDefinition.kind).toBe(WorkflowKind.agent);
    expect(workflowDefinition.definition.triggers?.When_a_new_chat_session_started).toBeDefined();
    expect(workflowDefinition.definition.triggers?.When_a_new_chat_session_started.metadata?.undeletable).toBe(true);
    expect(
      Object.values(workflowDefinition?.definition?.actions ?? {}).some((action) => (action as { type?: string }).type === 'Agent')
    ).toBe(true);
  });
  // ...existing code...
});
