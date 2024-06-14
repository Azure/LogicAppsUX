import { type StandardApp, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';
import { getCodelessWorkflowTemplate, getFunctionWorkflowTemplate } from '../templates';
import { workflowKind } from '../../../../constants';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';

const methodName = 'testMethod';

describe('utils/codeless/templates', () => {
  it('Should return a stateful workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, true, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(workflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, false, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(workflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_function_in_this_logic_app');
  });

  it('Should return a stateful workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, true, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(workflowKind.stateful);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return a stateless workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, false, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(workflowKind.stateless);
    expect(workflowDefinition.definition.actions).toHaveProperty('Call_a_local_rules_function_in_this_logic_app');
  });

  it('Should return an empty stateful workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(true);
    expect(workflowDefinition.kind).toBe(workflowKind.stateful);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });

  it('Should return an empty stateless workflow definition', () => {
    const workflowDefinition: StandardApp = getCodelessWorkflowTemplate(false);
    expect(workflowDefinition.kind).toBe(workflowKind.stateless);
    expect(isNullOrEmpty(workflowDefinition.definition.actions)).toBe(true);
  });
});
