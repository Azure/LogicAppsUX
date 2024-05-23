import {
  type ConnectionReferenceModel,
  type FunctionConnectionModel,
  type APIManagementConnectionModel,
  type StandardApp,
  ProjectType,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';
import { getFunctionWorkflowTemplate } from '../templates';
import { workflowKind } from '../../../../constants';

const methodName = 'testMethod';

describe('utils/codeless/templates', () => {
  it('Should return a stateful workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, true, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(workflowKind.stateful);
  });

  it('Should return a stateless workflow definition with the custom code template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, false, ProjectType.customCode);
    expect(workflowDefinition.kind).toBe(workflowKind.stateless);
  });

  it('Should return a stateful workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, true, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(workflowKind.stateful);
  });

  it('Should return a stateless workflow definition with the rules template', () => {
    const workflowDefinition: StandardApp = getFunctionWorkflowTemplate(methodName, false, ProjectType.rulesEngine);
    expect(workflowDefinition.kind).toBe(workflowKind.stateless);
  });
});
