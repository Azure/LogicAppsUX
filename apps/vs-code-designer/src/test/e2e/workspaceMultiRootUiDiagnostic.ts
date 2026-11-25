import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { captureCdpScreenshot } from './screenshot';
import { addWorkspaceMultiRootProjects } from './workspaceMultiRootProjectUi';
import {
  boundedCdp,
  connectToOwnedRegularWorkbench,
  ensureRegularWorkbenchExplorer,
  readRegularWorkbenchOwnership,
  workbenchVisibleScript,
  type RegularWorkbenchOwnershipExpectation,
} from './workbenchCdpActions';
import type { CdpConnection } from './cdpClient';
import { command, debugEvents, poll } from './workspaceMultiRootWorkbench';
import { normalizeFsPath } from './testUtils';

export function matchesUiDiagnosticActivationRoot(recorded: string, expected: string): boolean {
  return normalizeFsPath(fs.realpathSync.native(recorded)) === normalizeFsPath(fs.realpathSync.native(expected));
}

export async function closeOwnedUiDiagnosticWindow(cdp: CdpConnection, ownership: RegularWorkbenchOwnershipExpectation): Promise<void> {
  const state = await readRegularWorkbenchOwnership(boundedCdp(cdp, Date.now() + 5000), ownership);
  assert.ok(state.shellOwned && cdp.targetId, 'Refusing to close an unowned diagnostic window');
  // Same native Close Window key as workspacePromptCancel, but on the retained
  // exact connection; never reconnect to an arbitrary active Code window.
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send(
      'Input.dispatchKeyEvent',
      { type, key: 'W', code: 'KeyW', modifiers: 10, windowsVirtualKeyCode: 87 },
      { timeoutMs: 1500 }
    );
  }
}

export async function runWorkspaceMultiRootUiDiagnostic(
  workspace: { wsFilePath: string; appDir: string },
  artifactRoot: string,
  deadline: number,
  eventsFile: string,
  captureOnly = false
) {
  const ownership = { workspaceFilePath: workspace.wsFilePath, rootPaths: [workspace.appDir] };
  const { cdp } = await connectToOwnedRegularWorkbench({ expectation: ownership, deadline, connectionTimeoutMs: 15000 });
  const inputs: unknown[] = [];
  const workbench = boundedCdp(
    {
      evaluate: cdp.evaluate.bind(cdp),
      send: async (method, params) => {
        if (method.startsWith('Input.')) {
          inputs.push({ at: new Date().toISOString(), method, params });
        }
        return cdp.send(method, params);
      },
    },
    deadline
  );
  const capture = async (label: string) => {
    const snapshot = await cdp.evaluate(
      undefined,
      `(() => { ${workbenchVisibleScript}
      const describe=e=>e ? {tag:e.tagName,role:e.getAttribute('role'),className:typeof e.className==='string'?e.className:''} : null;
      return {title:document.title,timeOrigin:performance.timeOrigin,hasFocus:document.hasFocus(),
        activeElement:describe(document.activeElement),
        tabs:Array.from(document.querySelectorAll('[role="tab"]')).filter(visible).map(text),
        quickInputVisible:Array.from(document.querySelectorAll('.quick-input-widget')).some(visible),
        explorer:Array.from(document.querySelectorAll('.explorer-folders-view .monaco-list-row[aria-level="1"]')).filter(visible)
          .map(e=>({label:text(e.querySelector('.label-name')||e),point:point(e),selected:e.getAttribute('aria-selected')})),
        activities:Array.from(document.querySelectorAll('.activitybar .action-label')).filter(visible)
          .map(e=>({label:text(e),point:point(e),hit:describe(document.elementFromPoint(e.getBoundingClientRect().x+e.getBoundingClientRect().width/2,
            e.getBoundingClientRect().y+e.getBoundingClientRect().height/2))}))};
    })()`,
      { timeoutMs: 5000 }
    );
    fs.writeFileSync(
      `${artifactRoot}/${label}.json`,
      JSON.stringify({ snapshot, inputs, targetId: cdp.targetId, generation: cdp.contextGeneration }, null, 2),
      { flag: 'wx' }
    );
    await captureCdpScreenshot(cdp, label, {
      classification: 'diagnostic',
      expectation: { kind: 'diagnostic', label, reason: 'Local UI-only multi-root probe; not full-suite acceptance' },
      timeoutMs: 5000,
      deadlineMs: Date.now() + 5000,
    });
  };
  let boundary = 'initial-explorer';
  const result = { uiOnly: true, fullSuiteAccepted: false, uiPassed: false, boundary, errors: [] as string[], roots: [] as string[] };
  try {
    await capture('initial-workbench');
    boundary = 'product-activation';
    const activation = await poll(
      async () =>
        fs.existsSync(eventsFile)
          ? debugEvents(eventsFile).find(
              (event) =>
                event.kind === 'activation' &&
                event.roots?.length === 1 &&
                matchesUiDiagnosticActivationRoot(event.roots[0], workspace.appDir)
            )
          : undefined,
      Boolean,
      Math.min(deadline, Date.now() + 30000)
    );
    assert.ok(activation?.boot, 'Original workspace activation is required before Explorer actions');
    // Same recorder as the protected family. It awaits product.activate()
    // before emitting runtimeResolution; no population provider is invoked.
    const ready = await poll(
      async () => debugEvents(eventsFile).find((event) => event.kind === 'runtimeResolution' && event.boot === activation.boot),
      Boolean,
      Math.min(deadline, Date.now() + 30000)
    );
    assert.ok(ready && !ready.error, `Original product activation failed: ${ready?.error}`);
    await capture('product-activation-ready');
    boundary = 'initial-explorer';
    await ensureRegularWorkbenchExplorer(workbench, ownership, Math.min(deadline, Date.now() + 30000));
    await capture('explorer-ready');
    if (captureOnly) {
      boundary = 'activation-followup-explorer-command';
      await command(workbench, 'View: Show Explorer', Math.min(deadline, Date.now() + 30000));
      await capture('activation-followup-explorer-command');
      boundary = 'activation-followup-captured-no-project-adds';
      return result;
    }
    boundary = 'project-add';
    result.roots = await addWorkspaceMultiRootProjects(workbench, workspace, deadline, async (name, stage) => {
      boundary = `${name}-${stage}`;
      await capture(boundary);
    });
    result.uiPassed = true;
    boundary = 'two-sequential-adds-complete';
  } catch (error) {
    result.errors.push(String(error));
    // Preserve the first failure BEFORE cleanup keys. No retry, dismissal,
    // command substitution or fresh window can overwrite this observation.
    try {
      await capture('original-failure');
    } catch (captureError) {
      result.errors.push(`Failure capture: ${String(captureError)}`);
    }
  } finally {
    result.boundary = boundary;
    fs.writeFileSync(`${artifactRoot}/ui-observation.json`, JSON.stringify(result, null, 2), { flag: 'wx' });
    try {
      await closeOwnedUiDiagnosticWindow(cdp, ownership);
    } catch (error) {
      result.errors.push(`Owned Close Window: ${String(error)}`);
    } finally {
      cdp.dispose();
    }
  }
  return result;
}
