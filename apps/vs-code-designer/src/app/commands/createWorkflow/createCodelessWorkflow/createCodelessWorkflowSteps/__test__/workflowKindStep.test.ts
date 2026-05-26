import { nonNullProp } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage, TemplatePromptResult, WorkflowType } from '@microsoft/vscode-extension-logic-apps';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { CodelessWorkflowCreateStep } from '../codelessWorkflowCreateStep';
import { WorkflowKindStep } from '../workflowKindStep';

vi.mock('../../../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../codelessWorkflowCreateStep', () => ({
  CodelessWorkflowCreateStep: {
    createStep: vi.fn(),
  },
}));

describe('WorkflowKindStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (nonNullProp as Mock).mockImplementation((context: any, propertyName: string) => context[propertyName]);
  });

  it('prompts with workflow template picks and stores the selected template', async () => {
    const context: any = {
      isCodeless: true,
      language: ProjectLanguage.CSharp,
      telemetry: { properties: {}, measurements: {} },
      ui: {
        showQuickPick: vi.fn(async (picks: any[]) => ({ data: picks[0].data })),
      },
    };
    const step = await WorkflowKindStep.create(context, { isProjectWizard: false } as any);

    expect(step.shouldPrompt(context)).toBe(true);
    await step.prompt(context);

    const [picks, options] = context.ui.showQuickPick.mock.calls[0];
    expect(options).toEqual({ placeHolder: 'Select a template for your workflow' });
    expect(picks.map((pick: any) => pick.data.id)).toEqual([
      WorkflowType.stateful,
      WorkflowType.stateless,
      WorkflowType.agentic,
      WorkflowType.agent,
    ]);
    expect(context.functionTemplate.id).toBe(WorkflowType.stateful);
  });

  it('supports skip for now when used by the project wizard', async () => {
    const context: any = {
      isCodeless: true,
      language: ProjectLanguage.CSharp,
      telemetry: { properties: {}, measurements: {} },
      ui: {
        showQuickPick: vi.fn(async (picks: any[]) => ({ data: picks[picks.length - 1].data })),
      },
    };
    const step = await WorkflowKindStep.create(context, { isProjectWizard: true } as any);

    await step.prompt(context);

    const [picks, options] = context.ui.showQuickPick.mock.calls[0];
    expect(options).toEqual({ placeHolder: "Select a template for your project's first workflow" });
    expect(picks[picks.length - 1]).toMatchObject({
      label: '$(clock) Skip for now',
      data: TemplatePromptResult.skipForNow,
      suppressPersistence: true,
    });
    expect(context.functionTemplate).toBeUndefined();
    expect(context.telemetry.properties.templateId).toBe(TemplatePromptResult.skipForNow);
  });

  it('returns a codeless subwizard and applies trigger settings', async () => {
    const executeStep = { execute: vi.fn() };
    (CodelessWorkflowCreateStep.createStep as Mock).mockResolvedValue(executeStep);
    const context: any = {
      isCodeless: true,
      functionTemplate: {
        id: WorkflowType.stateful,
        name: 'Stateful workflow',
        defaultFunctionName: 'Stateful',
        language: ProjectLanguage.CSharp,
        isHttpTrigger: true,
        isTimerTrigger: false,
        userPromptedSettings: [],
        categories: [],
      },
    };
    const step = await WorkflowKindStep.create(context, { triggerSettings: { Schedule: 'daily' } } as any);

    const subWizard = await step.getSubWizard(context);

    expect(subWizard?.title).toBe('Create new Stateful workflow');
    expect(subWizard?.promptSteps).toHaveLength(1);
    expect(subWizard?.executeSteps).toEqual([executeStep]);
    expect(context.schedule).toBe('daily');
  });
});
