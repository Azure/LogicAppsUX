import * as fs from 'node:fs';
import * as path from 'node:path';
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
      const form = boundedCdp(wizard, phase);
      await selectRadioOption(form, contextId, 'Logic app (Standard)');
      await enterFieldValue(form, contextId, 'Logic app name', name);
      await selectDropdownOption(form, contextId, 'Workflow type', 'Stateful');
      await enterFieldValue(form, contextId, 'Workflow name', 'main');
      await assertNextButtonEnabled(form, contextId, 'multi-root folder Create New Project');
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
