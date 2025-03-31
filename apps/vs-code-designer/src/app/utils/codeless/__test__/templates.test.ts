import { type StandardApp, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';
import { getCodelessWorkflowTemplate, getWorkflowTemplate } from '../templates';
import { WorkflowKind, WorkflowType } from '../../../../constants';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';

const methodName = 'testMethod';

describe('utils/codeless/templates', () => {
  it('Should return a stateful workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getWorkflowTemplate(methodName, true, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getWorkflowTemplate(methodName, false, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateful workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getWorkflowTemplate(methodName, true, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getWorkflowTemplate(methodName, false, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return an empty stateful workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(WorkflowType.stateful);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateful);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });

  it('Should return an empty stateless workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(WorkflowType.stateless);
    expect(workflowDefinition.kind).toBe(WorkflowKind.stateless);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });

  it('Should return an empty agentic workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(WorkflowType.agentic);
    expect(workflowDefinition.kind).toBe(WorkflowKind.agentic);
    expect(Object.values(workflowDefinition?.definition?.actions ?? {}).some((action) => action.type === 'Agent')).toBe(true);
  });
});
