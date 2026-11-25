import * as fs from 'node:fs';
import * as path from 'node:path';
import { operationDiagnostics as trace } from './operationDiagnostics';
import {
  assertNextButtonEnabled,
  enterFieldValue,
  getPageText,
  selectDropdownOption,
  selectRadioOption,
  type CdpEvaluator,
} from './cdpFormHelpers';
import {
  activeWebview,
  assertProjectSetupForm,
  boundedCdp,
  clickText,
  folderCreateNewProject,
  poll,
  waitForProjectWizardClosed,
  type FolderMenuCheckpoint,
} from './workspaceMultiRootWorkbench';

// UI stage only. Both the protected full family and the local diagnostic use
// this exact native context-menu/form/disposal path. No runtime collection,
// reload, debugger, evidence admission or process observation belongs here.
export async function addWorkspaceMultiRootProjects(
  workbench: CdpEvaluator,
  workspace: { wsFilePath: string; appDir: string },
  deadline: number,
  checkpoint: (name: string, stage: FolderMenuCheckpoint | 'wizard-closed') => Promise<void>
): Promise<string[]> {
  const createdRoots = [fs.realpathSync(workspace.appDir)];
  for (const name of ['multiroot-second', 'multiroot-third']) {
    const phase = Math.min(deadline, Date.now() + 120000);
    await folderCreateNewProject(workbench, createdRoots[0], phase, {
      workspaceFilePath: workspace.wsFilePath,
      checkpoint: (stage) => checkpoint(name, stage),
    });
    const { cdp: wizard, contextId } = await activeWebview(
      workbench,
      'Create project',
      ['Logic app name', 'Workflow name'],
      phase,
      undefined,
      assertProjectSetupForm
    );
    try {
      const bounded = boundedCdp(wizard, phase);
      let lastFormState: unknown;
      const form: CdpEvaluator = {
        async evaluate<T>(context: number | undefined, expression: string, options?: Parameters<CdpEvaluator['evaluate']>[2]) {
          const result = await bounded.evaluate<T>(context, expression, options);
          lastFormState = result;
          trace.emit('multi-root-form-state', 'end', { state: result });
          return result; // No new DOM read, retry or expression mutation.
        },
        send(method, params, options) {
          const operation =
            method === 'Input.dispatchKeyEvent'
              ? 'multi-root-key-input'
              : method === 'Input.dispatchMouseEvent'
                ? 'multi-root-pointer-input'
                : method === 'Input.insertText'
                  ? 'multi-root-text-input'
                  : 'multi-root-cdp-send';
          return trace.run(operation, () => bounded.send(method, params, options));
        },
      };
      const observeFormOperation = async (operation: string, body: () => Promise<void>) => {
        const span = trace.start(operation);
        try {
          await body();
          span.end({ lastState: lastFormState });
        } catch (error) {
          span.fail(error, { lastState: lastFormState });
          throw error;
        }
      };
      await selectRadioOption(form, contextId, 'Logic app (Standard)');
      await enterFieldValue(form, contextId, 'Logic app name', name);
      await observeFormOperation('multi-root-workflow-type-select', () =>
        selectDropdownOption(form, contextId, 'Workflow type', 'Stateful')
      );
      await enterFieldValue(form, contextId, 'Workflow name', 'main');
      await observeFormOperation('multi-root-next-enabled', () =>
        assertNextButtonEnabled(form, contextId, 'multi-root folder Create New Project')
      );
      await clickText(form, 'button', 'Next', phase, contextId);
      await poll(
        () => getPageText(form, contextId),
        (text) => /Review your configuration/i.test(text) && text.includes(name) && text.includes('main') && text.includes('Stateful'),
        phase
      );
      await clickText(form, 'button', 'Create project', phase, contextId);
      await waitForProjectWizardClosed(workbench, wizard.targetUrl, phase);
    } finally {
      wizard.dispose();
    }
    const folder = path.join(path.dirname(workspace.wsFilePath), name);
    await poll(
      async () =>
        ['host.json', 'local.settings.json', '.vscode/launch.json', 'main/workflow.json'].every((file) =>
          fs.existsSync(path.join(folder, file))
        ),
      Boolean,
      phase
    );
    createdRoots.push(fs.realpathSync(folder));
    await checkpoint(name, 'wizard-closed');
  }
  return createdRoots;
}
