import { describe, it, expect, vi } from 'vitest';
import { WorkflowCodeTypeStep } from '../workflowCodeTypeStep';
import { IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { WorkflowNameStep } from '../workflowNameStep';
import { CodefulWorkflowCreateStep } from '../../createCodefulWorkflow/createCodefulWorkflowSteps/codefulWorkflowCreateStep';
import { workflowCodeType } from '../../../../../constants';

describe('WorkflowCodeTypeStep', () => {
  describe('prompt', () => {
    it('sets context.isCodeless to false for codeful input and sets template', async () => {
      const wizardContext: any = {
        ui: {
          showQuickPick: vi.fn((options: any) => {
            // mocking the function that returns the workflow choice
            return { data: { id: workflowCodeType.codeful } };
          }),
        },
      };
      const step = new WorkflowCodeTypeStep();
      const prompt = await step.prompt(wizardContext as any);
      expect(wizardContext.isCodeless).toBeFalsy();
    });

    it('sets context.isCodeless to true for codeless input', async () => {
      const wizardContext: any = {
        ui: {
          showQuickPick: vi.fn((options: any) => {
            return { data: { id: workflowCodeType.codeless } };
          }),
        },
      };
      const step = new WorkflowCodeTypeStep();
      const prompt = await step.prompt(wizardContext as any);
      expect(wizardContext.isCodeless).toBeTruthy();
    });
  });

  describe('shouldPrompt', () => {
    it('returns true to prompt when context.isCodeless is undefined', async () => {
      const context = { isCodeless: undefined };
      const step = new WorkflowCodeTypeStep();
      expect(step.shouldPrompt(context as any)).toBe(true);
    });
  });

  describe('getSubWizard', () => {
    it('returns undefined to continue to next step when context.isCodeless is true', async () => {
      const context = { isCodeless: true };
      const step = new WorkflowCodeTypeStep();
      expect(await step.getSubWizard(context as any)).toBe(undefined);
    });

    it('returns next steps when context.isCodeless is false', async () => {
      const context = { isCodeless: false };
      const step = new WorkflowCodeTypeStep();
      const subWizard = await step.getSubWizard(context as any);
      expect(subWizard).toBeDefined();
      if (subWizard !== undefined) {
        expect(subWizard.promptSteps).toBeDefined();
        expect(subWizard.executeSteps).toBeDefined();
        subWizard.promptSteps && expect(subWizard.promptSteps[0] instanceof WorkflowNameStep).toBeTruthy();
        subWizard.executeSteps && expect(subWizard.executeSteps[0] instanceof CodefulWorkflowCreateStep).toBeTruthy();
      }
    });
  });
});
