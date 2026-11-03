import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';
import { test, mock } from 'node:test';
import nativeFs from 'node:fs';
import {
  bootstrapRequest,
  parseBootstrapContext,
  readBootstrapAttestation,
  snapshotBootstrapBinary,
  writeBootstrapAttestation,
  type MultiRootBootstrapContext,
} from './workspaceMultiRootBootstrap';
import {
  controlledFuncEnvironment,
  multiRootRegularLaunch,
  observeFuncRuntime,
  assertFuncRuntimeResolution,
} from './workspaceMultiRootLaunch';
import {
  createLinuxPopulationProvider,
  createWindowsPopulationProvider,
  executeWindowsPopulation,
  windowsPopulationScript,
  type WindowsPopulationProbe,
  type WindowsPopulationExecute,
  fingerprint,
  type FuncIdentity,
  isFunc,
  type Population,
  PopulationRace,
  parseWindowsPopulation,
  type ProcFiles,
  remainingBudget,
  waitForFuncPopulation,
} from './workspaceMultiRootCollector';
import {
  activeWebview,
  assertActiveWebview,
  assertProjectSetupForm,
  assertMapper,
  assertSequentialDebug,
  folderCreateNewProject,
  readQuickInputState,
  selectFolderDebugConfiguration,
  command as multiRootCommand,
  type FolderMenuCheckpoint,
  type DebugEvent,
  readLogicAppRoots,
  waitForActivatedMultiRootRuntime,
  waitForProjectWizardClosed,
  type WorkbenchState,
} from './workspaceMultiRootWorkbench';
import { contextMenuDom, workbenchDomFixture } from './workbenchDomFixture';
import { getFieldState, selectRadioOption } from './cdpFormHelpers';
import { closeOwnedUiDiagnosticWindow, matchesUiDiagnosticActivationRoot } from './workspaceMultiRootUiDiagnostic';
import type { CdpConnection } from './cdpClient';
import { createDiagnosticProducer } from '../../../scripts/e2e-cli-diagnostics';
import { createPopulationDiagnostics } from './workspaceMultiRootPopulationDiagnostics';
import { createMultiRootAzureSetup } from './workspaceMultiRootAzure';
import { workbenchPromptDomScript } from './workbenchPrompts';
import { setScreenshotFileSystemForTests } from './screenshot';
import { boundedCdp } from './workbenchCdpActions';

test('multi-root debug setup reuses the approved existing group and exact per-root affirmative UI policy', async () => {
  const fixture = folderMenuFixture();
  const azure = require('./azureConnectorFixture');
  const prompts = require('./workbenchPrompts');
  const approved = { resourceGroupName: 'unit-existing-group', resourceGroupLocationVerified: true };
  const calls: string[] = [];
  const deadline = Date.now() + 2000;
  const phaseDeadline = deadline - 100;
  const mocks = [
    mock.method(azure, 'readApprovedAzureConnectorFixture', () => approved),
    mock.method(azure, 'readApprovedExistingResourceGroup', async (value: unknown, budget: number) => {
      assert.equal(value, approved);
      assert.equal(budget, deadline);
      calls.push('read-existing-group');
      return approved;
    }),
    mock.method(
      prompts,
      'handleAffirmativeConnectorWorkbenchPrompt',
      async (cdp: unknown, appName: string, budget: number, selectExisting: (prompt: unknown) => Promise<boolean>) => {
        assert.equal(cdp, fixture.cdp);
        assert.equal(appName, path.basename(fixture.folder));
        assert.equal(budget, phaseDeadline);
        calls.push('shared-affirmative-ui');
        return selectExisting({ kind: 'quickInput', title: 'Select a subscription' });
      }
    ),
    mock.method(
      azure,
      'selectApprovedAzureConnectorFixturePrompt',
      async (cdp: unknown, prompt: { title: string }, value: unknown, budget: number, subscriptionName: () => Promise<string>) => {
        assert.equal(cdp, fixture.cdp);
        assert.equal(prompt.title, 'Select a subscription');
        assert.equal(value, approved);
        assert.equal(budget, phaseDeadline);
        assert.equal(await subscriptionName(), 'unit-approved-subscription');
        calls.push('shared-existing-target');
        return true;
      }
    ),
    mock.method(azure, 'readApprovedAzureSubscriptionName', async (value: unknown, budget: number) => {
      assert.equal(value, approved);
      assert.equal(budget, phaseDeadline);
      return 'unit-approved-subscription';
    }),
    mock.method(azure, 'assertApprovedAzureConnectorFixtureSaved', (folder: string, value: unknown) => {
      assert.equal(folder, fixture.folder);
      assert.equal(value, approved);
      calls.push('verify-product-saved-context');
    }),
  ];
  try {
    const setup = await createMultiRootAzureSetup(deadline);
    assert.equal(await setup.handle(fixture.cdp, fixture.folder, phaseDeadline), true);
    setup.assertSaved(fixture.folder);
    assert.deepEqual(calls, ['read-existing-group', 'shared-affirmative-ui', 'shared-existing-target', 'verify-product-saved-context']);
    assert.deepEqual(fixture.sent, [], 'Wiring must not synthesize UI input or settings instead of the shared owners');
  } finally {
    mocks.forEach((entry) => entry.mock.restore());
    fixture.dispose();
  }
});

test('multi-root debug setup preserves approved fixture admission failure without starting UI or substituting a fixture', async () => {
  const azure = require('./azureConnectorFixture');
  const primary = new Error('unit approved WIF context unavailable');
  const read = mock.method(azure, 'readApprovedAzureConnectorFixture', () => {
    throw primary;
  });
  try {
    await assert.rejects(createMultiRootAzureSetup(Date.now() + 1000), (error) => error === primary);
  } finally {
    read.mock.restore();
  }
});

test('multi-root unknown Azure picker captures on the same current CDP exactly once before its original rejection', async () => {
  const azure = require('./azureConnectorFixture');
  const approved = { resourceGroupName: 'unit-existing-group', resourceGroupLocationVerified: true };
  const read = mock.method(azure, 'readApprovedAzureConnectorFixture', () => approved);
  const verify = mock.method(azure, 'readApprovedExistingResourceGroup', async () => approved);
  const events: string[] = [];
  const writes: string[] = [];
  const restore = setScreenshotFileSystemForTests({
    mkdirSync: () => undefined,
    rmSync: () => {},
    writeFileSync(file) {
      writes.push(file);
    },
  });
  const cdp = {
    targetId: 'unit-current-multi-root-workbench',
    contextGeneration: 3,
    async evaluate(_context: unknown, expression: string) {
      if (expression !== workbenchPromptDomScript) {
        throw new Error('Unit diagnostic readiness unavailable');
      }
      return [
        {
          kind: 'quickInput',
          title: 'private unknown picker',
          text: 'private unknown picker',
          interactive: true,
          rows: Array.from({ length: 9 }, () => ({ text: 'private row' })),
          buttons: [],
        },
      ];
    },
    async send(method: string, _params: unknown, options?: { timeoutMs?: number }) {
      assert.ok(!method.startsWith('Input.') && !method.startsWith('Target.'), 'Unknown UI must receive no input or owner substitution');
      if (method === 'Page.captureScreenshot') {
        assert.ok(options?.timeoutMs && options.timeoutMs <= 5000);
        assert.equal(this, cdp);
        events.push('capture');
        return { result: { data: Buffer.from('unit-png').toString('base64') } };
      }
      return {};
    },
  };
  try {
    const deadline = Date.now() + 2000;
    const setup = await createMultiRootAzureSetup(deadline);
    await assert.rejects(
      setup.handle(boundedCdp(cdp as unknown as CdpConnection, deadline), path.resolve('unit-app'), deadline),
      /unsupported prompt/
    );
    events.push('rejected');
    assert.deepEqual(events, ['capture', 'rejected']);
    assert.equal(writes.filter((file) => file.endsWith('.png')).length, 1);
    assert.equal(writes.filter((file) => file.endsWith('.json')).length, 1);
  } finally {
    read.mock.restore();
    verify.mock.restore();
    restore();
  }
});

test('UI-only Close Window refuses wrong ownership before sending a keyboard event', async () => {
  let sends = 0;
  const cdp = {
    targetId: 'unit-owned-target',
    evaluate: async () => ({ title: 'unrelated - Visual Studio Code', ready: true, roots: [] }),
    send: async () => {
      sends++;
    },
  } as unknown as CdpConnection;
  await assert.rejects(
    closeOwnedUiDiagnosticWindow(cdp, { workspaceFilePath: path.resolve('owned.code-workspace'), rootPaths: [] }),
    /unowned diagnostic/
  );
  assert.equal(sends, 0);
});

test('UI-only activation root uses the full route physical Windows path normalization', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-activation-unit-'));
  try {
    const other = path.join(root, 'other');
    fs.mkdirSync(other);
    assert.equal(matchesUiDiagnosticActivationRoot(root, other), false);
    assert.equal(matchesUiDiagnosticActivationRoot(root, root), true);
    if (process.platform === 'win32') {
      const driveCase = root.replace(/^([a-z]):/i, (_, drive: string) => `${drive.toLowerCase()}:`);
      assert.equal(matchesUiDiagnosticActivationRoot(driveCase, root), true, 'd: and D: are the same owned native root');
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const executable = path.resolve('func.exe');

const webviewRequire = createRequire(path.resolve(__dirname, '../../../../vs-code-react/package.json'));
let setupRender = 0;
function projectSetupDom(): string {
  // Resolve React, its server renderer and Fluent from the webview's own
  // package, as the repository's real-component DOM controls do. Never invent
  // a for/id relationship that the installed Field/Input cohort did not render.
  const { createElement: h } = webviewRequire('react');
  const { renderToStaticMarkup } = webviewRequire('react-dom/server');
  const { Button, Field, Input, Radio, RadioGroup } = webviewRequire('@fluentui/react-components');
  return renderToStaticMarkup(
    h(
      'div',
      null,
      h(Field, { label: 'Logic app name', required: true }, h(Input, { placeholder: 'Enter logic app name' })),
      h(RadioGroup, null, h(Radio, { value: 'logicApp', label: 'Logic app (Standard)' })),
      h(Field, { label: 'Workflow name', required: true }, h(Input, { placeholder: 'Enter workflow name' })),
      h(Button, { disabled: true }, 'Next')
    ),
    { identifierPrefix: `multi-root-setup-${++setupRender}-` }
  );
}
const projectReviewDom = `
  <h2>Review + create</h2><p>Review your configuration and create your Logic App workspace.</p>
  <div>Logic app name: <span>multiroot-second</span></div>
  <div>Logic app type: <span>Logic app (Standard)</span></div>
  <div>Workflow name: <span>main</span></div><button>Create project</button>`;

test('Create project readiness accepts real Fluent setup controls without inventing native input-label associations', async () => {
  const setup = workbenchDomFixture(projectSetupDom());
  try {
    const inputs = [...setup.document.querySelectorAll('input[type="text"]')];
    assert.equal(inputs.length, 2);
    // Both the local rendered cohort and the source lockfile use split Field
    // contexts. This reproduces the rejected DOM contract, not the uncaptured
    // per-control ADO DOM. Local and locked transitive cohorts can differ.
    assert.deepEqual(
      inputs.map((input: any) => input.labels.length),
      [0, 0],
      'Real Fluent rendering must exercise the no-native-label regression'
    );
    for (const label of ['Logic app name', 'Workflow name']) {
      assert.equal((await getFieldState(setup.cdp, 1, label)).ok, true, 'Keep the established real field discovery semantics');
    }
    await assertProjectSetupForm(setup.cdp, 1);
    assert.deepEqual(setup.sent, []);
  } finally {
    setup.dispose();
  }
});

test('Create project readiness requires its own live setup controls, not the previous review page strings', async () => {
  const review = workbenchDomFixture(projectReviewDom);
  try {
    await assert.rejects(assertProjectSetupForm(review.cdp, 1), /own enabled setup controls/);
    // Reproduce the reached error with the real shared helper, without changing
    // its selector or replaying radio clicks against a summary document.
    await assert.rejects(selectRadioOption(review.cdp, 1, 'Logic app (Standard)'), /Radio input not found/);
    assert.deepEqual(review.sent, []);
  } finally {
    review.dispose();
  }
});

test('Create project readiness rejects hidden, disabled, ambiguous or incomplete setup controls', async () => {
  for (const kind of [
    'hidden-radio',
    'hidden-field',
    'aria-hidden-form',
    'disabled-field',
    'disabled-radio',
    'disabled-fieldset',
    'readonly-field',
    'duplicate-fields',
    'duplicate-controls',
    'disabled-duplicate-control',
    'duplicate-label',
    'duplicate-radio',
    'missing-label',
    'missing-input',
    'foreign-input',
    'fake-input',
    'no-next',
  ] as const) {
    const fixture = workbenchDomFixture(projectSetupDom());
    try {
      const appField = fixture.document.querySelector('.fui-Field');
      const appInput = appField.querySelector('input');
      const radio = fixture.document.querySelector('input[type="radio"]');
      if (kind === 'hidden-radio') {
        fixture.document.querySelector('.fui-Radio').style.display = 'none';
      } else if (kind === 'hidden-field') {
        appField.style.display = 'none';
      } else if (kind === 'aria-hidden-form') {
        fixture.document.body.setAttribute('aria-hidden', 'true');
      } else if (kind === 'disabled-field') {
        appInput.disabled = true;
      } else if (kind === 'disabled-radio') {
        radio.disabled = true;
      } else if (kind === 'disabled-fieldset') {
        const fieldset = fixture.document.createElement('fieldset');
        fieldset.disabled = true;
        appField.replaceWith(fieldset);
        fieldset.appendChild(appField);
      } else if (kind === 'readonly-field') {
        appInput.readOnly = true;
      } else if (kind === 'duplicate-fields') {
        fixture.document.body.insertAdjacentHTML('beforeend', projectSetupDom());
      } else if (kind === 'duplicate-controls' || kind === 'disabled-duplicate-control') {
        const duplicate = appInput.cloneNode(true);
        duplicate.disabled = kind === 'disabled-duplicate-control';
        appField.appendChild(duplicate);
      } else if (kind === 'duplicate-label') {
        appField.appendChild(appField.querySelector('label').cloneNode(true));
      } else if (kind === 'duplicate-radio') {
        const duplicate = fixture.document.createElement('div');
        duplicate.innerHTML = projectSetupDom();
        fixture.document.body.appendChild(duplicate.querySelector('.fui-Radio'));
      } else if (kind === 'missing-label') {
        appField.querySelector('label').remove();
      } else if (kind === 'missing-input') {
        appInput.remove();
      } else if (kind === 'foreign-input') {
        // A stale Field label must not borrow a real input outside its Field,
        // even if native association points to that input.
        appInput.id = 'foreign-input';
        appField.querySelector('label').htmlFor = appInput.id;
        fixture.document.body.appendChild(appInput);
      } else if (kind === 'fake-input') {
        appInput.replaceWith(fixture.document.createElement('span'));
      } else {
        fixture.document.querySelector('button').remove();
      }
      await assert.rejects(assertProjectSetupForm(fixture.cdp, 1), /own enabled setup controls/, kind);
      assert.deepEqual(fixture.sent, []);
    } finally {
      fixture.dispose();
    }
  }
});

test('Create project readiness ignores hidden stale setup controls but never borrows their inputs for a visible summary', async () => {
  for (const current of ['setup', 'summary'] as const) {
    const fixture = workbenchDomFixture(
      `<div style="display:none">${projectSetupDom()}</div>${current === 'setup' ? projectSetupDom() : projectReviewDom}`
    );
    try {
      if (current === 'setup') {
        await assertProjectSetupForm(fixture.cdp, 1);
      } else {
        await assert.rejects(assertProjectSetupForm(fixture.cdp, 1), /own enabled setup controls/);
      }
      assert.deepEqual(fixture.sent, []);
    } finally {
      fixture.dispose();
    }
  }
});

test('Create project rejection reports only safe per-control counts, not field values, markup or paths', async () => {
  const fixture = workbenchDomFixture(projectSetupDom());
  const secret = 'private-field-value-and-path';
  try {
    const field = fixture.document.querySelector('.fui-Field');
    const input = field.querySelector('input');
    input.value = secret;
    field.setAttribute('data-private', secret);
    const duplicate = input.cloneNode(true);
    duplicate.disabled = true;
    field.appendChild(duplicate);
    await assert.rejects(assertProjectSetupForm(fixture.cdp, 1), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(secret), false);
      assert.equal(error.message.includes('<input'), false);
      const counts = JSON.parse(error.message.split('Counts: ')[1].split('\n')[0]);
      assert.deepEqual(counts, {
        standardRadio: { labels: 1, controls: 1, enabled: 1 },
        logicAppName: { fields: 1, labels: 1, controls: 2, enabled: 1 },
        workflowName: { fields: 1, labels: 1, controls: 1, enabled: 1 },
        nextButtons: 1,
      });
      return true;
    });
    assert.deepEqual(fixture.sent, []);
  } finally {
    fixture.dispose();
  }
});

test('Create project discovery admits only the active owner and a live setup document before any input', async () => {
  for (const kind of ['setup', 'review', 'wrong-owner', 'inactive-tab'] as const) {
    const form = workbenchDomFixture(kind === 'review' ? projectReviewDom : projectSetupDom());
    const shell = workbenchDomFixture(`
      <div role="tab" aria-selected="true">${kind === 'inactive-tab' ? 'Other editor' : 'Create project'}</div>
      <iframe src="vscode-webview://${kind === 'wrong-owner' ? 'other' : 'project'}/index.html"></iframe>`);
    const candidate = { ...form.cdp, targetUrl: 'vscode-webview://project/index.html' };
    const connection = mock.method(require('./cdpClient'), 'connectToVsCodeCdpByText', async (options: any) => {
      await options.acceptCandidate(candidate, 7);
      return { cdp: candidate, contextId: 7 };
    });
    try {
      const discover = () =>
        activeWebview(
          shell.cdp,
          'Create project',
          ['Logic app name', 'Workflow name'],
          Date.now() + 2000,
          undefined,
          assertProjectSetupForm
        );
      if (kind === 'setup') {
        assert.equal((await discover()).contextId, 7);
      } else {
        await assert.rejects(discover(), /own enabled setup controls|visible active iframe|Expected active editor/);
      }
      assert.deepEqual([...form.sent, ...shell.sent], []);
    } finally {
      connection.mock.restore();
      form.dispose();
      shell.dispose();
    }
  }
});

test('Create project completion waits for both the old iframe and editor tab to be removed before the next menu', async () => {
  const fixture = workbenchDomFixture(`
    <iframe src="vscode-webview://previous-project/index.html"></iframe>
    <div role="tab" aria-selected="true">Create project</div>${projectReviewDom}`);
  const evaluate = fixture.cdp.evaluate.bind(fixture.cdp);
  let observations = 0;
  fixture.cdp.evaluate = async <T>(context: number | undefined, expression: string): Promise<T> => {
    observations++;
    // Files may already exist throughout this interval. Merely switching away
    // or removing one UI surface must not admit another cached-panel invocation.
    if (observations === 2) {
      fixture.document.querySelector('iframe').remove();
      fixture.document.querySelector('[role="tab"]').setAttribute('aria-selected', 'false');
    }
    if (observations === 3) {
      fixture.document.querySelector('[role="tab"]').remove();
    }
    return evaluate<T>(context, expression);
  };
  try {
    await waitForProjectWizardClosed(fixture.cdp, 'vscode-webview://previous-project/index.html', Date.now() + 2000);
    assert.equal(observations, 3);
    assert.deepEqual(fixture.sent, [], 'Wait for product disposal; never close/cancel the wizard in the harness');
  } finally {
    fixture.dispose();
  }
});

test('Create project completion fails closed for a retained hidden owner or retained inactive tab', async () => {
  for (const html of [
    '<iframe style="display:none" src="vscode-webview://previous-project/index.html"></iframe>',
    '<div role="tab" aria-selected="false">Create project</div>',
  ]) {
    const fixture = workbenchDomFixture(html);
    try {
      await assert.rejects(
        waitForProjectWizardClosed(fixture.cdp, 'vscode-webview://previous-project/index.html', Date.now() + 250),
        /Workbench action deadline exhausted/
      );
      assert.deepEqual(fixture.sent, []);
    } finally {
      fixture.dispose();
    }
  }
});

function folderMenuFixture(options: { loseFocus?: boolean; noMenu?: boolean } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-menu-unit-'));
  const folder = path.join(root, 'physical-first');
  fs.mkdirSync(folder);
  const workspaceFilePath = path.join(root, 'fixture.code-workspace');
  const writeWorkspace = (folders = [{ path: './physical-first', name: 'Root alias' }]) =>
    fs.writeFileSync(workspaceFilePath, JSON.stringify({ folders }));
  writeWorkspace();
  const fixture = workbenchDomFixture(`
    <div class="quick-input-widget" style="display:none"><input>
      <div class="quick-input-list"><div class="monaco-list-row">
        <span class="label-name" data-box="10,10,200,20">View: Show Explorer</span>
      </div></div>
    </div>
    <div class="explorer-folders-view"><div class="monaco-list" role="tree" tabindex="0">
      <div class="monaco-list-row" id="root-first" role="treeitem" aria-level="1" aria-selected="false">
        <div class="monaco-icon-label"><span class="label-name" data-box="20,100,180,20">Root alias</span></div>
      </div>
    </div></div>`);
  const { document, window } = fixture;
  const widget = document.querySelector('.quick-input-widget');
  document.addEventListener('keydown', (event: any) => {
    if (event.code === 'KeyP') {
      widget.style.display = 'block';
      widget.querySelector('input').focus();
    }
  });
  widget.querySelector('.label-name').addEventListener('click', () => {
    widget.style.display = 'none';
  });
  const list = document.querySelector('.monaco-list');
  const row = list.querySelector('.monaco-list-row');
  row.addEventListener('mousedown', () => {
    row.setAttribute('aria-selected', 'true');
    list.setAttribute('aria-activedescendant', row.id);
    if (!options.loseFocus) {
      list.focus();
    }
  });
  // Monaco List's production keyboard context-menu route uses keyup and the
  // focused element as its anchor (not the last pointer position).
  list.addEventListener('keyup', (event: any) => {
    if (event.key !== 'ContextMenu' || list.getAttribute('aria-activedescendant') !== row.id || options.noMenu) {
      return;
    }
    document.body.insertAdjacentHTML('beforeend', contextMenuDom([{ label: 'Create new project…' }]));
    const item = document.querySelector('.action-menu-item');
    item.focus();
    item.addEventListener('click', () => document.querySelector('.context-view').remove());
  });
  return {
    ...fixture,
    root,
    folder,
    workspaceFilePath,
    writeWorkspace,
    dispose: () => {
      window.close();
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function debugPickerFixture() {
  const fixture = folderMenuFixture();
  const widget = fixture.document.querySelector('.quick-input-widget');
  widget.style.display = 'block';
  widget.innerHTML = `<input value="debug ">
    <div class="quick-input-list">
      <div class="monaco-list-row" data-box="10,30,300,25">
        <span class="label-name">Attach to Logic App</span><span class="label-description">Other root</span>
      </div>
      <div id="target-debug-config" class="monaco-list-row" data-box="10,60,300,25">
        <span class="label-name">Attach to Logic App</span><span class="label-description">Root alias</span>
      </div>
    </div>`;
  widget.querySelector('input').focus();
  return fixture;
}

test('real debug quick-access DOM binds separate exact configuration label and persisted physical-root description', async () => {
  const f = debugPickerFixture();
  let clicked = false;
  f.document.querySelector('#target-debug-config').addEventListener('click', () => {
    clicked = true;
  });
  try {
    const state = await readQuickInputState(f.cdp, { name: 'Attach to Logic App', workspace: 'Root alias' });
    assert.equal(state.matches, 1);
    assert.equal(state.active, true);
    assert.notEqual(f.document.querySelector('#target-debug-config').textContent.trim(), 'Attach to Logic App (Root alias)');
    await selectFolderDebugConfiguration(
      f.cdp,
      { workspaceFilePath: f.workspaceFilePath, folder: f.folder, name: 'Attach to Logic App' },
      Date.now() + 2000
    );
    assert.equal(clicked, true);
    assert.deepEqual(
      f.sent.map((s) => s.method),
      ['Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent']
    );
  } finally {
    f.dispose();
  }
});

for (const kind of ['wrong-name', 'wrong-root', 'duplicate', 'hidden', 'disabled', 'occluded']) {
  test(`debug quick-access refuses ${kind} configuration instead of selecting by name alone`, async () => {
    const f = debugPickerFixture();
    const row = f.document.querySelector('#target-debug-config');
    if (kind === 'wrong-name') {
      row.querySelector('.label-name').textContent = 'Other configuration';
    } else if (kind === 'wrong-root') {
      row.querySelector('.label-description').textContent = 'Wrong root';
    } else if (kind === 'duplicate') {
      const duplicate = row.cloneNode(true);
      duplicate.setAttribute('data-box', '10,90,300,25');
      row.parentElement.append(duplicate);
    } else if (kind === 'hidden') {
      row.style.display = 'none';
    } else if (kind === 'disabled') {
      row.setAttribute('aria-disabled', 'true');
    } else {
      f.document.body.insertAdjacentHTML('beforeend', '<div data-box="10,60,300,25">Overlay</div>');
    }
    try {
      await assert.rejects(
        selectFolderDebugConfiguration(
          f.cdp,
          { workspaceFilePath: f.workspaceFilePath, folder: f.folder, name: 'Attach to Logic App' },
          Date.now() + 80
        ),
        /Workbench action deadline exhausted/
      );
      assert.deepEqual(f.sent, [], 'No UI input may target an unowned/ambiguous row');
    } finally {
      f.dispose();
    }
  });
}

test('debug picker rejects absent physical roots and duplicate persisted aliases before UI input', async () => {
  const f = debugPickerFixture();
  try {
    fs.mkdirSync(path.join(f.root, 'foreign-root'));
    fs.mkdirSync(path.join(f.root, 'other'));
    await assert.rejects(
      selectFolderDebugConfiguration(
        f.cdp,
        { workspaceFilePath: f.workspaceFilePath, folder: path.join(f.root, 'foreign-root'), name: 'Attach to Logic App' },
        Date.now() + 1000
      ),
      /exact persisted physical root/
    );
    f.writeWorkspace([
      { path: './physical-first', name: 'Root alias' },
      { path: './other', name: 'Root alias' },
    ]);
    await assert.rejects(
      selectFolderDebugConfiguration(
        f.cdp,
        { workspaceFilePath: f.workspaceFilePath, folder: f.folder, name: 'Attach to Logic App' },
        Date.now() + 1000
      ),
      /Ambiguous debug workspace/
    );
    assert.deepEqual(f.sent, []);
  } finally {
    f.dispose();
  }
});

test('real picker state preserves hashed label/description/input/focus through the bounded diagnostic serializer', async () => {
  const f = debugPickerFixture();
  try {
    const state = await readQuickInputState(f.cdp);
    const records: string[] = [];
    createDiagnosticProducer({ sink: (line) => records.push(line) }).emit('multi-root-debug-pick', 'failure', {
      state: { lastState: state },
    });
    const actual = JSON.parse(records[0]);
    assert.equal(actual.operation, 'multi-root-debug-pick');
    assert.equal(actual.state.lastState.count, 2);
    assert.equal(actual.state.lastState.active, true);
    assert.equal(actual.state.lastState.text.sha256, createHash('sha256').update('debug ').digest('hex'));
    assert.equal(actual.state.lastState.candidates.items[1].workspace.sha256, createHash('sha256').update('Root alias').digest('hex'));
    assert.ok(!records[0].includes('Root alias') && !records[0].includes('Attach to Logic App') && !records[0].includes('debug '));
  } finally {
    f.dispose();
  }
});

test('family command keeps its exact original input error when supplemental picker capture fails', async () => {
  const f = folderMenuFixture();
  const originalEvaluate = f.cdp.evaluate.bind(f.cdp);
  const originalSend = f.cdp.send.bind(f.cdp);
  const primary = new Error('original owning command input failure');
  f.cdp.evaluate = <T>(context: number | undefined, expression: string) => {
    if (expression.includes('const widgets=')) {
      throw new Error('secondary diagnostic unavailable');
    }
    return originalEvaluate<T>(context, expression);
  };
  f.cdp.send = (method, params, options) => {
    if (method === 'Input.insertText') {
      throw primary;
    }
    return originalSend(method, params, options);
  };
  try {
    await assert.rejects(multiRootCommand(f.cdp, 'View: Show Explorer', Date.now() + 2000), (error) => error === primary);
  } finally {
    f.dispose();
  }
});

test('root menu uses exact persisted root alias, focused-tree context gesture, observed menu and a real item click', async () => {
  const fixture = folderMenuFixture();
  const checkpoints: FolderMenuCheckpoint[] = [];
  try {
    await folderCreateNewProject(fixture.cdp, fixture.folder, Date.now() + 2000, {
      workspaceFilePath: fixture.workspaceFilePath,
      checkpoint: async (stage) => {
        checkpoints.push(stage);
        if (stage === 'root-selected') {
          assert.equal(fixture.document.activeElement, fixture.document.querySelector('.monaco-list'));
        }
        if (stage === 'menu-open') {
          assert.ok(fixture.document.querySelector('[role="menuitem"]'));
        }
        if (stage === 'menu-invoked') {
          assert.equal(fixture.document.querySelector('[role="menuitem"]'), null);
        }
      },
    });
    assert.deepEqual(checkpoints, ['root-selected', 'menu-open', 'menu-invoked']);
    const keys = fixture.sent.filter((entry) => entry.method === 'Input.dispatchKeyEvent').map((entry) => entry.params);
    assert.deepEqual(
      keys.filter((entry) => entry.code === 'ContextMenu').map((entry) => entry.type),
      ['keyDown', 'keyUp']
    );
    assert.equal(
      fixture.sent.some((entry) => entry.params.button === 'right'),
      false,
      'No unverified row-centre pointer context trigger'
    );
    assert.equal(
      fixture.sent
        .filter((entry) => entry.method === 'Input.insertText')
        .map((entry) => entry.params.text)
        .join(),
      '',
      'An already exact Explorer needs no palette input; Create Project still uses its real context menu'
    );
    assert.equal(fixture.sent.filter((entry) => entry.params.type === 'mousePressed').length, 2, 'Exact root and actual menu item clicks');
  } finally {
    fixture.dispose();
  }
});

test('root menu does not send palette text into a focused announcement webview when exact Explorer roots are already visible', async () => {
  const fixture = folderMenuFixture();
  try {
    fixture.document.body.insertAdjacentHTML('beforeend', '<iframe class="webview ready" tabindex="0"></iframe>');
    fixture.document.querySelector('iframe').focus();
    assert.equal(fixture.document.activeElement.tagName, 'IFRAME');
    await folderCreateNewProject(fixture.cdp, fixture.folder, Date.now() + 2000, {
      workspaceFilePath: fixture.workspaceFilePath,
      checkpoint: async () => undefined,
    });
    assert.equal(
      fixture.sent.some((entry) => entry.method === 'Input.insertText' || entry.params.code === 'KeyP'),
      false
    );
    assert.equal(fixture.sent.filter((entry) => entry.params.code === 'ContextMenu').length, 2);
    assert.equal(fixture.document.querySelector('.context-view'), null, 'Real menu item was clicked');
  } finally {
    fixture.dispose();
  }
});

test('root menu still opens Explorer through real palette input when its roots are not projected', async () => {
  const fixture = folderMenuFixture();
  try {
    const explorer = fixture.document.querySelector('.explorer-folders-view');
    explorer.style.display = 'none';
    fixture.document.querySelector('.quick-input-widget .label-name').addEventListener('click', () => {
      explorer.style.display = 'block';
    });
    await folderCreateNewProject(fixture.cdp, fixture.folder, Date.now() + 2000, {
      workspaceFilePath: fixture.workspaceFilePath,
      checkpoint: async () => undefined,
    });
    assert.deepEqual(
      fixture.sent.filter((entry) => entry.method === 'Input.insertText').map((entry) => entry.params.text),
      ['View: Show Explorer']
    );
    assert.equal(fixture.sent.filter((entry) => entry.params.type === 'mousePressed').length, 3);
  } finally {
    fixture.dispose();
  }
});

test('root menu rejects duplicate presentation or wrong physical root before any UI input', async () => {
  for (const kind of ['duplicate-label', 'wrong-root'] as const) {
    const fixture = folderMenuFixture();
    try {
      const other = path.join(fixture.root, 'physical-second');
      fs.mkdirSync(other);
      if (kind === 'duplicate-label') {
        fixture.writeWorkspace([
          { path: fixture.folder, name: 'Root alias' },
          { path: other, name: 'Root alias' },
        ]);
      }
      await assert.rejects(
        folderCreateNewProject(fixture.cdp, kind === 'wrong-root' ? other : fixture.folder, Date.now() + 1000, {
          workspaceFilePath: fixture.workspaceFilePath,
          checkpoint: async () => undefined,
        }),
        kind === 'wrong-root' ? /exact persisted physical workspace root/ : /Ambiguous Explorer root labels/
      );
      assert.deepEqual(fixture.sent, []);
    } finally {
      fixture.dispose();
    }
  }
});

test('root menu fails closed on lost tree focus, missing menu or stale roots and retains the original error if diagnostics fail', async () => {
  for (const kind of ['lost-focus', 'no-menu', 'stale-roots'] as const) {
    const fixture = folderMenuFixture({ loseFocus: kind === 'lost-focus', noMenu: kind === 'no-menu' });
    const checkpoints: FolderMenuCheckpoint[] = [];
    try {
      if (kind === 'stale-roots') {
        fixture.document.querySelector('.explorer-folders-view .label-name').textContent = 'Old workspace';
      }
      await assert.rejects(
        folderCreateNewProject(fixture.cdp, fixture.folder, Date.now() + 300, {
          workspaceFilePath: fixture.workspaceFilePath,
          checkpoint: async (stage) => {
            checkpoints.push(stage);
            if (stage === 'menu-failure') {
              throw new Error('unit screenshot unavailable');
            }
          },
        }),
        /Workbench action deadline exhausted/
      );
      assert.equal(checkpoints.at(-1), 'menu-failure');
      assert.equal(checkpoints.includes('menu-invoked'), false);
      const contextKey = fixture.sent.some((entry) => entry.params.code === 'ContextMenu');
      assert.equal(contextKey, kind === 'no-menu', 'Menu input requires exact selected/focused current roots');
    } finally {
      fixture.dispose();
    }
  }
});

test('product contributes Create Project directly to the root Explorer menu, not a submenu', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../src/package.json'), 'utf8'));
  const command = manifest.contributes.commands.find(
    (entry: { command: string }) => entry.command === 'azureLogicAppsStandard.createProject'
  );
  const entries = manifest.contributes.menus['explorer/context'].filter((entry: { command?: string }) => entry.command === command.command);
  assert.equal(command.title, 'Create new project...');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].when, 'azureLogicAppsStandard.hasProject && explorerResourceIsRoot == true');
  assert.equal(entries[0].submenu, undefined);
});

const bytes = Buffer.from('unit-owned-func-fixture-not-an-executable');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const population = (count = 3, birth = '100'): Population => ({
  complete: true,
  processes: Array.from({ length: count }, (_, i): FuncIdentity => ({ pid: i + 100, birth, executable, sha256 })),
});
const virtualClock = () => {
  let time = 0;
  return {
    now: () => time,
    pause: async (ms: number) => {
      time += ms;
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
};
const options = (count = 3) => ({ executable, sha256, logicAppCount: count, deadline: 3000, stableMs: 500 });

function bootstrapFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-bootstrap-unit-'));
  fs.mkdirSync(path.join(root, 'FuncCoreTools'));
  const executable = path.join(root, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
  fs.writeFileSync(executable, 'unit-owned-binary-bytes-never-executed');
  fs.mkdirSync(path.join(root, 'FuncCoreTools', 'in-proc8'));
  fs.writeFileSync(path.join(root, 'FuncCoreTools', 'in-proc8', path.basename(executable)), 'unit-owned-worker-bytes-never-executed');
  const context: MultiRootBootstrapContext = {
    suiteId: 'workspaceMultiRoot',
    invocation: 'unit-bootstrap-invocation',
    startedUtc: new Date(Date.now() - 1000).toISOString(),
    runtimeRoot: fs.realpathSync(root),
    identity: { source: 'unit-source', run: 'unit-run', job: 'unit-job', platform: process.platform },
  };
  const request = { context, file: path.join(root, 'func-bootstrap.json') };
  const phase = {
    phaseId: 'runtimeDependencyBootstrap:bootstrap',
    complete: true,
    exitCode: 0,
    signal: null,
    cleanupVerified: true,
    diagnosticsError: '',
  };
  const probes = [
    `configured launcher ${executable}=4.1.2`,
    `in-proc8 worker host ${path.join(root, 'FuncCoreTools', 'in-proc8', path.basename(executable))}=4.1.2`,
  ];
  return { root, executable, context, request, phase, probes };
}

test('controlled Windows PATH uses one canonical key and disables current-directory/extension shadowing', () => {
  const env = controlledFuncEnvironment(
    'C:\\job\\FuncCoreTools',
    {
      PATH: 'C:\\other;.;C:\\job\\FuncCoreTools;C:\\tools',
      PATHEXT: '.COM;.BAT;.EXE',
      NoDefaultCurrentDirectoryInExePath: '',
    },
    'win32'
  );
  assert.equal(env.PATH, undefined);
  assert.equal(env.Path, 'C:\\job\\FuncCoreTools;C:\\other;C:\\tools');
  assert.equal(env.PATHEXT, '.EXE;.CMD;.BAT;.COM');
  assert.equal(env.NoDefaultCurrentDirectoryInExePath, '1');
  assert.throws(() => controlledFuncEnvironment('C:\\job\\FuncCoreTools', { PATH: 'C:\\a', Path: 'C:\\b' }, 'win32'), /Conflicting/);
});
test('controlled Linux PATH puts the admitted directory first and removes relative/current-directory entries', () => {
  const env = controlledFuncEnvironment('/job/FuncCoreTools', { PATH: '/other:.:/job/FuncCoreTools::/tools' }, 'linux');
  assert.equal(env.PATH, '/job/FuncCoreTools:/other:/tools');
  assert.throws(() => controlledFuncEnvironment('/job:ambiguous/FuncCoreTools', {}, 'linux'), /unambiguous/);
});
test('regular launch accepts actual plain-func activation only when PATH resolves bootstrap-attested bytes', () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    const admitted = readBootstrapAttestation(f.request.file, f.context, f.phase);
    const profile = path.join(f.root, 'profile');
    const launch = multiRootRegularLaunch(admitted, { LA_E2E_CLI_USER_DATA_DIR: path.join(f.root, 'stale-profile') }, profile);
    assert.equal(
      launch.env.LA_E2E_CLI_USER_DATA_DIR,
      profile,
      'Actual regular profile must replace absent/stale inherited observer profile'
    );
    const { assertLaunchProfile } = require('../../../scripts/vscode-lifecycle-producer');
    assert.doesNotThrow(() => assertLaunchProfile(launch.env, [`--user-data-dir=${profile}`]));
    assert.throws(() => assertLaunchProfile(launch.env, [`--user-data-dir=${path.join(f.root, 'foreign')}`]), /profiles differ/);
    assert.equal(launch.settings['azureLogicAppsStandard.funcCoreToolsBinaryPath'], 'func');
    assert.equal(launch.settings['azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation'], false);
    const resolution = observeFuncRuntime('func', false, f.root, launch.env);
    assertFuncRuntimeResolution(resolution, admitted);
    assert.throws(() => observeFuncRuntime(f.executable, false, f.root, launch.env), /not a profile pin/);
    assert.throws(() => observeFuncRuntime('func', true, f.root, launch.env), /another managed/);
    assert.throws(() => assertFuncRuntimeResolution({ ...resolution, sha256: 'b'.repeat(64) }, admitted), /different Func bytes/);
    fs.writeFileSync(f.executable, 'post-bootstrap-replacement-unit-file');
    assert.throws(() => multiRootRegularLaunch(admitted, {}, path.join(f.root, 'profile')), /changed before regular launch/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
test('initial Explorer actions wait for same-boot product activation, not just recorder startup', async () => {
  const f = bootstrapFixture();
  const menu = folderMenuFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    const admitted = readBootstrapAttestation(f.request.file, f.context, f.phase);
    const env = controlledFuncEnvironment(path.dirname(f.executable), {});
    const events: DebugEvent[] = [];
    let finishActivation!: () => void;
    const activation = new Promise<void>((resolve) => {
      finishActivation = resolve;
    });
    const recorder = { activate: (_context: unknown) => {} };
    const settings: Record<string, unknown> = {
      funcCoreToolsBinaryPath: 'func',
      autoRuntimeDependenciesValidationAndInstallation: false,
      autoRuntimeDependenciesPath: f.root,
    };
    // Execute the actual recorder producer with delayed product activation.
    // Only VS Code APIs and append-only event transport are supplied; no native
    // Code, Func executable or machine population is started.
    const modules: Record<string, unknown> = {
      vscode: {
        workspace: {
          workspaceFolders: [{ uri: { fsPath: menu.folder } }],
          getConfiguration: () => ({ inspect: (key: string) => ({ globalValue: settings[key] }) }),
        },
        extensions: { getExtension: () => ({ activate: () => activation }) },
        debug: { onDidStartDebugSession: () => ({}), onDidTerminateDebugSession: () => ({}) },
      },
      'node:fs': { appendFileSync: (_file: string, line: string) => events.push(JSON.parse(line)) },
      'node:crypto': { randomUUID: () => 'current-boot' },
      '../../../out/test/e2e/workspaceMultiRootLaunch': { observeFuncRuntime },
    };
    runInNewContext(
      fs.readFileSync(path.resolve(__dirname, '../../../scripts/fixtures/workspace-multi-root-recorder/extension.js'), 'utf8'),
      {
        exports: recorder,
        require: (id: string) => {
          assert.ok(id in modules, `Unexpected recorder dependency ${id}`);
          return modules[id];
        },
        process: { env: { ...env, LA_E2E_CLI_MULTI_ROOT_EVENTS: 'unit-event-transport' } },
      }
    );
    recorder.activate({ subscriptions: [] });
    assert.deepEqual(
      events.map((event) => event.kind),
      ['activation']
    );
    let reads = 0;
    await waitForActivatedMultiRootRuntime(
      () => {
        assert.deepEqual(menu.sent, [], 'No UI input while product activation is pending');
        reads++;
        if (reads === 1) {
          assert.deepEqual(
            events.map((event) => event.kind),
            ['activation']
          );
          finishActivation();
        }
        return events;
      },
      'current-boot',
      admitted,
      Date.now() + 2000
    );
    assert.ok(reads > 1, 'Recorder activation alone cannot satisfy product readiness');
    await folderCreateNewProject(menu.cdp, menu.folder, Date.now() + 2000, {
      workspaceFilePath: menu.workspaceFilePath,
      checkpoint: async () => undefined,
    });
    assert.equal(
      menu.sent.some((entry) => entry.params.code === 'ContextMenu'),
      true
    );

    const source = fs.readFileSync(path.resolve(__dirname, '../../../src/test/e2e/workspaceMultiRoot.test.ts'), 'utf8');
    const initialGate = source.indexOf('await waitForActivatedMultiRootRuntime');
    assert.ok(initialGate >= 0 && initialGate < source.indexOf('await addWorkspaceMultiRootProjects'));
  } finally {
    menu.dispose();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('product activation gate rejects same-boot errors and wrong runtime bytes without any Explorer input', async () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    const admitted = readBootstrapAttestation(f.request.file, f.context, f.phase);
    const env = controlledFuncEnvironment(path.dirname(f.executable), {});
    const resolution = observeFuncRuntime('func', false, f.root, env);
    for (const event of [
      { kind: 'runtimeResolution' as const, boot: 'current', error: 'product activation failed' },
      { kind: 'runtimeResolution' as const, boot: 'current', resolution: { ...resolution, sha256: 'b'.repeat(64) } },
    ]) {
      await assert.rejects(
        waitForActivatedMultiRootRuntime(() => [event], 'current', admitted, Date.now() + 1000),
        /product activation failed|different Func bytes/
      );
    }
    await assert.rejects(
      waitForActivatedMultiRootRuntime(
        () => [
          { kind: 'activation', boot: 'current' },
          { kind: 'runtimeResolution', boot: 'stale', resolution },
        ],
        'current',
        admitted,
        Date.now() + 30
      ),
      /Workbench action deadline exhausted/
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('same-name shell wrapper in admitted Func directory fails rather than masking shell resolution', () => {
  const f = bootstrapFixture();
  try {
    const env = controlledFuncEnvironment(path.dirname(f.executable), {});
    fs.writeFileSync(path.join(path.dirname(f.executable), process.platform === 'win32' ? 'func.cmd' : 'func.exe'), 'unit-shadow-not-run');
    assert.throws(() => observeFuncRuntime('func', false, f.root, env), /shadows/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap attestation derives exact job-owned binary bytes after successful probes and phase finalization', () => {
  const f = bootstrapFixture();
  try {
    const before = snapshotBootstrapBinary(f.context, f.executable);
    writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code-version');
    const admitted = readBootstrapAttestation(f.request.file, f.context, f.phase);
    assert.deepEqual(admitted.binary, before);
    assert.equal(admitted.binary.sha256, createHash('sha256').update(fs.readFileSync(f.executable)).digest('hex'));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('missing/failed/incomplete bootstrap phase cannot admit a Func attestation', () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    for (const phase of [
      {},
      { ...f.phase, complete: false },
      { ...f.phase, exitCode: 1 },
      { ...f.phase, cleanupVerified: false },
      { ...f.phase, signal: 'SIGTERM' },
      { ...f.phase, diagnosticsError: 'fixture original error' },
    ]) {
      assert.throws(() => readBootstrapAttestation(f.request.file, f.context, phase), /successful finalized/);
    }
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap attestation is bound to the current invocation, job/source and physical runtime root', () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    assert.throws(() => readBootstrapAttestation(f.request.file, { ...f.context, invocation: 'stale' }, f.phase), /invocation/);
    assert.throws(
      () =>
        readBootstrapAttestation(
          f.request.file,
          {
            ...f.context,
            identity: { ...f.context.identity, job: 'wrong-job' },
          },
          f.phase
        ),
      /job\/source/
    );
    assert.throws(
      () => readBootstrapAttestation(f.request.file, { ...f.context, runtimeRoot: os.tmpdir() }, f.phase),
      /different dependency root/
    );
    assert.throws(() => readBootstrapAttestation(path.join(f.root, 'missing.json'), f.context, f.phase));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('binary replacement during native probes or after bootstrap cannot be attested or admitted', () => {
  const f = bootstrapFixture();
  try {
    const before = snapshotBootstrapBinary(f.context, f.executable);
    fs.writeFileSync(f.executable, 'changed-longer-unit-fixture-binary-bytes-never-executed');
    assert.throws(() => writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code'), /changed during/);
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    fs.writeFileSync(f.executable, 'post-bootstrap-unit-fixture-replacement');
    assert.throws(() => readBootstrapAttestation(f.request.file, f.context, f.phase), /changed after/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

for (const boundary of [
  'missing-worker',
  'linked-worker-directory',
  'worker-probe-missing',
  'worker-during-probes',
  'worker-after-bootstrap',
]) {
  test(`both exact native role bytes and actual probes are required: ${boundary}`, () => {
    const f = bootstrapFixture();
    try {
      const before = snapshotBootstrapBinary(f.context, f.executable);
      assert.ok(before.worker);
      if (boundary === 'missing-worker') {
        fs.unlinkSync(before.worker.executable);
        assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /ENOENT/);
      } else if (boundary === 'linked-worker-directory') {
        const directory = path.dirname(before.worker.executable);
        const target = path.join(f.root, 'foreign-worker');
        fs.renameSync(directory, target);
        fs.symlinkSync(target, directory, 'junction');
        assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /link/);
      } else if (boundary === 'worker-probe-missing') {
        assert.throws(() => writeBootstrapAttestation(f.request, before, [f.probes[0], f.probes[0]], 'unit-Code'), /probes/);
      } else if (boundary === 'worker-during-probes') {
        fs.writeFileSync(before.worker.executable, 'changed-worker-bytes-never-executed');
        assert.throws(() => writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code'), /changed during/);
      } else {
        writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code');
        fs.writeFileSync(before.worker.executable, 'changed-worker-after-bootstrap-never-executed');
        assert.throws(() => readBootstrapAttestation(f.request.file, f.context, f.phase), /changed after/);
      }
    } finally {
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  });
}

test('outside-root executable and user-home cache are not bootstrap admission', () => {
  const f = bootstrapFixture();
  try {
    const outside = path.join(f.root, 'outside-func');
    fs.writeFileSync(outside, 'unit fixture');
    assert.throws(() => snapshotBootstrapBinary(f.context, outside), /outside/);
    assert.throws(
      () => parseBootstrapContext({ ...f.context, runtimeRoot: path.join(f.root, '.azurelogicapps/dependencies') }),
      /User-home/
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap evidence requires paired internal inputs, actual probe versions and a fresh evidence file', () => {
  const f = bootstrapFixture();
  try {
    assert.equal(bootstrapRequest({}), undefined);
    assert.throws(() => bootstrapRequest({ LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION: f.request.file }), /Both/);
    assert.throws(() => bootstrapRequest({ LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT: JSON.stringify(f.context) }), /Both/);
    const before = snapshotBootstrapBinary(f.context, f.executable);
    assert.throws(() => writeBootstrapAttestation(f.request, before, [], 'unit-Code'), /probes/);
    writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code');
    assert.throws(() => writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code'), /EEXIST/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap hash read permission errors and file-read races fail closed using own file fixtures', () => {
  const f = bootstrapFixture();
  try {
    const denied = mock.method(nativeFs, 'readFileSync', () => {
      throw new Error('EACCES unit fixture');
    });
    assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /EACCES/);
    denied.mock.restore();
    const raced = mock.method(nativeFs, 'readFileSync', () => {
      nativeFs.writeFileSync(f.executable, 'longer-unit-fixture-to-change-stat-during-read');
      return Buffer.from('unit-owned-race-result');
    });
    assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /changed during bootstrap hashing/);
    raced.mock.restore();
  } finally {
    mock.restoreAll();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('full executable count settles without attributing one process to each root', async () => {
  const result = await waitForFuncPopulation({ snapshot: async () => population() }, options(), virtualClock());
  assert.equal(result.processes.length, 3);
});

function populationDiagnosticFixture(clock = virtualClock()) {
  const lines: string[] = [];
  const trace = createDiagnosticProducer({
    producer: 'multi-root-population',
    maxEvents: 64,
    maxBytes: 131072,
    binding: { sourceSha: 'a'.repeat(40), run: '15890740', suite: 'workspaceMultiRoot', nativeInvocation: 'unit-invocation' },
    sink: (line) => lines.push(line),
  });
  const diagnostics = createPopulationDiagnostics(
    trace,
    { executable, workspaceFile: '/private/generated.code-workspace', roots: ['/private/root-a', '/private/root-b', '/private/root-c'] },
    clock.now
  );
  return { lines, trace, diagnostics, clock, records: () => lines.map((line) => JSON.parse(line)) };
}

test('observed in-proc8 Func shape still rejects; diagnostic path recognition never admits a worker', async () => {
  const f = populationDiagnosticFixture();
  const worker = path.join(path.dirname(executable), 'in-proc8', path.basename(executable));
  let queries = 0;
  const provider = createWindowsPopulationProvider(
    () => {
      queries++;
      return JSON.stringify([
        { pid: 10, parentPid: 5, name: 'func.exe', birth: '123', executable },
        { pid: 20, parentPid: 10, name: 'func.exe', birth: '124', executable: worker },
      ]);
    },
    () => bytes,
    (file) => file,
    f.diagnostics.collection
  );
  await assert.rejects(
    f.diagnostics.run(() => waitForFuncPopulation(provider, options(), f.clock)),
    /Unrelated\/wrong/
  );
  assert.equal(queries, 2, 'Diagnostics must reuse the two existing native queries, not rescan');
  const terminal = f.records().at(-1);
  assert.equal(terminal.status, 'summary');
  assert.equal(terminal.state.ok, false);
  assert.equal(terminal.state.complete, true, 'This is a full scan, not an accepted population');
  assert.equal(terminal.state.count, 2);
  assert.equal(terminal.state.workerPathCount, 1);
  assert.equal(terminal.state.launcherPathCount, 1);
  assert.equal(terminal.state.ownedCount, 0);
  assert.equal(terminal.state.unknownOwnershipCount, 2);
  assert.equal(terminal.state.ancestryProven, false, 'A bare parent PID is not birth-bound ancestry');
  assert.equal(terminal.state.commandProven, false);
  assert.equal(terminal.state.workspaceProven, false);
  assert.equal(terminal.state.processes.items[1].parentPid, 10);
  assert.equal(terminal.state.processes.items[1].sha256, sha256);
  assert.doesNotMatch(f.lines.join(''), /private|in-proc8|func\.exe|root-a|generated\.code-workspace/);
  assert.equal(terminal.sourceSha, 'a'.repeat(40));
  assert.equal(terminal.nativeInvocation, 'unit-invocation');
});

test('diagnostic wrapper preserves wrong same-root executable/worker/hash, missing metadata and extra global Func rejections', async () => {
  const fixtures = [
    () => {
      const value = population();
      value.processes[0].executable = path.join(path.dirname(executable), 'foreign', path.basename(executable));
      return value;
    },
    () => {
      const value = population();
      value.processes[0].executable = path.join(path.dirname(executable), 'in-proc6', path.basename(executable));
      return value;
    },
    () => {
      const value = population();
      value.processes[0].sha256 = 'b'.repeat(64);
      return value;
    },
    () => {
      const value = population();
      value.processes[0].birth = '';
      return value;
    },
    () => population(4),
  ];
  for (const fixture of fixtures) {
    const f = populationDiagnosticFixture();
    const provider = {
      snapshot: async () => {
        const value = fixture();
        f.diagnostics.collection({ ...value, nativePasses: 2, totalRows: 10, inspectedRows: 10, parents: [] });
        return value;
      },
    };
    await assert.rejects(f.diagnostics.run(() => waitForFuncPopulation(provider, options(), f.clock)));
    assert.equal(f.records().at(-1).state.ok, false);
    assert.equal(f.records().at(-1).state.ownedCount, 0);
  }
});

test('Linux partial scan and original collection error survive a throwing diagnostic sink without new reads', async () => {
  const failure = Object.assign(new Error('fixture binary denied'), { code: 'EACCES' });
  const calls: string[] = [];
  const run = async (sink?: Parameters<typeof createLinuxPopulationProvider>[2]) => {
    calls.length = 0;
    const provider = createLinuxPopulationProvider(
      procFixture({
        read: (file) => {
          calls.push(file);
          return file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'func' : fakeStat();
        },
        binary: () => {
          throw failure;
        },
      }),
      '/unit-owned-proc',
      sink
    );
    await assert.rejects(provider.snapshot(5000), (error) => error === failure);
    return [...calls];
  };
  const originalCalls = await run();
  let partial = false;
  const diagnosticCalls = await run((receipt) => {
    partial = !receipt.complete && receipt.inspectedRows === 1 && receipt.error === failure;
    throw new Error('secondary sink failure');
  });
  assert.ok(partial);
  assert.deepEqual(diagnosticCalls, originalCalls);
});

test('real serialized Linux IO receipts identify missing live exe row/state without changing the race or probing again', async () => {
  const f = populationDiagnosticFixture();
  const calls: string[] = [];
  const missing = Object.assign(new Error('private proc path'), { code: 'ENOENT' });
  const files = procFixture({
    readdir: () => {
      calls.push('enumerate');
      return ['100'];
    },
    read: (file) => {
      const operation = path.basename(file);
      calls.push(operation);
      if (operation === 'boot_id') {
        return 'private-boot-id';
      }
      if (operation === 'comm') {
        return 'private-unrelated-process\n';
      }
      assert.equal(operation, 'stat', 'Diagnostics must not add argv/other probes');
      return fakeStat();
    },
    readlink: () => {
      calls.push('exe-link');
      throw missing;
    },
  });
  await assert.rejects(
    f.diagnostics.run(() => createLinuxPopulationProvider(files, '/private/proc', f.diagnostics.collection).snapshot(5000)),
    PopulationRace
  );
  assert.deepEqual(calls, ['boot_id', 'enumerate', 'stat', 'comm', 'exe-link']);
  const terminal = f.records().at(-1);
  assert.equal(terminal.state.ok, false, 'A diagnostic observation must not admit an incomplete population');
  assert.equal(terminal.state.complete, false);
  assert.equal(terminal.state.races, 1);
  assert.equal(terminal.state.procFault.pid, 100);
  assert.equal(terminal.state.procFault.operationCode, 5);
  assert.equal(terminal.state.procFault.stateCode, 'S'.charCodeAt(0));
  assert.equal(terminal.state.procFault.errorCode, 1);
  assert.equal(terminal.state.procFault.birth.sha256, createHash('sha256').update('42').digest('hex'));
  assert.doesNotMatch(f.lines.join(''), /private|unrelated-process|private-boot-id/);
});

test('Linux IO fault receipts preserve denied primary errors and distinguish stat, comm, exe and hashing boundaries', async () => {
  for (const [operationCode, errorCode] of [
    [3, 2],
    [4, 2],
    [5, 3],
    [7, 2],
  ]) {
    const f = populationDiagnosticFixture();
    const error = Object.assign(new Error('private metadata failure'), { code: errorCode === 3 ? 'EPERM' : 'EACCES' });
    const files = procFixture({
      read: (file) => {
        if ((operationCode === 3 && file.endsWith('stat')) || (operationCode === 4 && file.endsWith('comm'))) {
          throw error;
        }
        return file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'func' : fakeStat();
      },
      readlink: () => {
        if (operationCode === 5) {
          throw error;
        }
        return executable;
      },
      binary: () => {
        throw error;
      },
    });
    await assert.rejects(
      f.diagnostics.run(() => createLinuxPopulationProvider(files, '/unit-owned-proc', f.diagnostics.collection).snapshot(5000)),
      (actual) => actual === error
    );
    const fault = f.records().at(-1).state.procFault;
    assert.equal(fault.operationCode, operationCode);
    assert.equal(fault.errorCode, errorCode);
    assert.equal(fault.pid, 100);
    assert.equal(fault.stateCode, operationCode === 3 ? null : 'S'.charCodeAt(0));
    assert.doesNotMatch(f.lines.join(''), /private metadata failure/);
  }
});

test('races, PID reuse and terminal receipts remain bounded past exhausted routine capacity', async () => {
  const f = populationDiagnosticFixture();
  // Simulate the routine budget already exhausted. The real UI has its own
  // producer, so cannot spend even this producer's routine capacity.
  for (let i = 0; i < 300; i++) {
    f.trace.emit('multi-root-population-sample', 'sample');
  }
  const provider = {
    snapshot: async () => {
      const error = new PopulationRace('unit population churn');
      f.diagnostics.collection({ complete: false, nativePasses: 1, totalRows: 10, inspectedRows: 5, processes: [], parents: [], error });
      throw error;
    },
  };
  await assert.rejects(
    f.diagnostics.run(() => waitForFuncPopulation(provider, options(), f.clock)),
    /deadline/
  );
  const terminal = f.records().at(-1);
  assert.equal(terminal.operation, 'multi-root-population-terminal');
  assert.ok(terminal.state.races > 0);
  assert.ok(terminal.dropped > 0);
  assert.ok(f.lines.length <= 64 && Buffer.byteLength(f.lines.join('')) <= 131072);

  const reuse = populationDiagnosticFixture();
  let samples = 0;
  const accepted = await reuse.diagnostics.run(() =>
    waitForFuncPopulation(
      {
        snapshot: async () => {
          const value = population(3, ++samples < 3 ? 'old' : 'new');
          reuse.diagnostics.collection({ ...value, nativePasses: 2, totalRows: 10, inspectedRows: 10, parents: [] });
          return value;
        },
      },
      options(),
      reuse.clock
    )
  );
  assert.ok(samples >= 5 && accepted.stability.durationMs >= options().stableMs);
  assert.equal(reuse.records().at(-1).state.ownedCount, 0, 'Count success alone never becomes workspace ownership');
});

test('unproven command/workspace claims and raw metadata cannot enter population telemetry', () => {
  const f = populationDiagnosticFixture();
  const value = population();
  Object.assign(value.processes[0], { command: 'secret-command --token=secret', workspace: 'foreign-customer-name', owned: true });
  f.diagnostics.collection({ ...value, nativePasses: 2, totalRows: 10, inspectedRows: 10, parents: [] });
  const state = f.records().at(-1).state;
  assert.equal(state.commandProven, false);
  assert.equal(state.workspaceProven, false);
  assert.equal(state.ownedCount, 0);
  assert.doesNotMatch(f.lines.join(''), /secret|foreign-customer-name/);
});

test('capped process details never truncate the global count or lose the terminal receipt', async () => {
  const f = populationDiagnosticFixture();
  const provider = {
    snapshot: async () => {
      const value = population(30);
      f.diagnostics.collection({ ...value, nativePasses: 2, totalRows: 100, inspectedRows: 100, parents: [] });
      return value;
    },
  };
  await assert.rejects(
    f.diagnostics.run(() => waitForFuncPopulation(provider, options(), f.clock)),
    /deadline/
  );
  const terminal = f.records().at(-1);
  assert.equal(terminal.operation, 'multi-root-population-terminal');
  assert.equal(terminal.state.count, 30);
  assert.equal(terminal.state.unknownOwnershipCount, 30);
  assert.equal(terminal.state.launcherPathCount, 30);
  assert.equal(terminal.state.processes.items.length, 12);
  assert.equal(terminal.state.capped, true);
  assert.equal(terminal.state.ok, false);
  assert.ok(f.lines.every((line) => Buffer.byteLength(line) <= 8192));
});
test('collector has no three-root ceiling', async () => {
  assert.equal((await waitForFuncPopulation({ snapshot: async () => population(5) }, options(5), virtualClock())).processes.length, 5);
});
test('wrong complete population count fails at the original deadline', async () => {
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => population(2) }, options(), virtualClock()), /deadline/);
});
test('extra global func cannot be filtered into a passing scoped count', async () => {
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => population(4) }, options(), virtualClock()), /deadline/);
});
test('permission failure is not process absence', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          throw new Error('EACCES unit fixture');
        },
      },
      options(),
      virtualClock()
    ),
    /EACCES/
  );
});
test('incomplete population is rejected even with the correct cardinality', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      { snapshot: async () => ({ ...population(), complete: false }) as unknown as Population },
      options(),
      virtualClock()
    ),
    /Partial/
  );
});
test('wrong binary identity fails instead of filtering that func out', async () => {
  const wrong = population();
  wrong.processes[0].sha256 = 'b'.repeat(64);
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => wrong }, options(), virtualClock()), /wrong binary/);
});
test('unrelated executable path fails despite matching binary bytes', async () => {
  const wrong = population();
  wrong.processes[0].executable = path.resolve('other/func.exe');
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => wrong }, options(), virtualClock()), /Unrelated/);
});
test('duplicate and missing native creation identities fail closed', () => {
  const duplicate = population();
  duplicate.processes[1].pid = duplicate.processes[0].pid;
  assert.throws(() => fingerprint(duplicate), /duplicate/);
  const missing = population();
  missing.processes[0].birth = '';
  assert.throws(() => fingerprint(missing), /Unverifiable/);
});
test('PID reuse resets the whole population stability interval', async () => {
  const clock = virtualClock();
  let samples = 0;
  await waitForFuncPopulation({ snapshot: async () => population(3, ++samples < 3 ? 'old' : 'new') }, options(), clock);
  assert.ok(samples >= 5 && clock.now() >= 1000);
});
test('repeated enumeration races exhaust the same deadline', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          throw new PopulationRace('fixture race');
        },
      },
      options(),
      virtualClock()
    ),
    /deadline/
  );
});
test('late successful collection cannot outrun the deadline', async () => {
  const clock = virtualClock();
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          clock.advance(4000);
          return population();
        },
      },
      options(),
      clock
    ),
    /deadline/
  );
});
test('deadline and absent binary oracle reject before collection', async () => {
  assert.throws(() => remainingBudget(10, 10), /deadline/);
  await assert.rejects(
    waitForFuncPopulation({ snapshot: async () => population() }, { ...options(), sha256: '' }, virtualClock()),
    /binary identity/
  );
});
test('func classifier excludes dotnet and NetFx workers', () => {
  for (const name of ['dotnet', 'Microsoft.Azure.Workflows.Functions.NetFxWorker', 'func-worker', 'functions']) {
    assert.equal(isFunc(name), false);
  }
  assert.equal(isFunc('FUNC.EXE'), true);
});

const rows = [
  { pid: 10, name: 'func.exe', birth: '123', executable: 'C:\\fixture\\func.exe' },
  { pid: 11, name: 'dotnet.exe', birth: '', executable: '' },
];
test('Windows full table includes only real func executable candidates, not workers', () => {
  assert.equal(parseWindowsPopulation(JSON.stringify(rows)).length, 1);
});

const windowsMarkers = (started: number, stages = 5) =>
  [0, 20, 30, 40, 50]
    .slice(0, stages)
    .map((elapsed, index) => `LA_MR_POP:${index + 1}:${started + 10 + elapsed}:${elapsed}\n`)
    .join('');

test('Windows owning RPC separates startup, CIM, projection, serialization and response without extra queries', async () => {
  const f = populationDiagnosticFixture();
  let queries = 0;
  const budgets: number[] = [];
  const execute: WindowsPopulationExecute = (_file, _args, options) => {
    queries++;
    budgets.push(options.timeout!);
    const output = windowsMarkers(f.clock.now()) + JSON.stringify(rows);
    f.clock.advance(200);
    return output;
  };
  const provider = createWindowsPopulationProvider(
    (budget, probe) => executeWindowsPopulation(budget, probe, execute, f.clock.now),
    () => {
      f.clock.advance(25);
      return bytes;
    },
    () => executable,
    f.diagnostics.collection,
    f.clock.now
  );
  const result = await f.diagnostics.run(() => provider.snapshot(1000));
  assert.equal(result.complete, true);
  assert.equal(queries, 2);
  assert.deepEqual(budgets, [1000, 775], 'The second RPC must use the original collector budget, not restart it');
  const state = f.records().at(-1).state;
  assert.equal(state.budgetMs, 1000);
  assert.equal(state.remainingMs, 550);
  assert.equal(state.collectionDurationMs, 450);
  assert.equal(state.collectionStageCode, 8);
  assert.equal(state.windowsFirstProbe.pass, 1);
  assert.equal(state.windowsFirstProbe.budgetMs, 1000);
  assert.equal(state.windowsProbe.pass, 2);
  assert.equal(state.windowsProbe.budgetMs, 775);
  assert.equal(state.windowsProbe.durationMs, 200);
  assert.equal(state.windowsProbe.startupMs, 10);
  assert.equal(state.windowsProbe.cimMs, 20);
  assert.equal(state.windowsProbe.projectionMs, 10);
  assert.equal(state.windowsProbe.serializationMs, 10);
  assert.equal(state.windowsProbe.respondMs, 10);
  assert.equal(state.windowsProbe.stageCode, 5);
  assert.doesNotMatch(f.lines.join(''), /fixture|powershell|Win32_Process|LA_MR_POP/);
});

for (const stage of [0, 1, 2, 3, 4]) {
  test(`Windows original second-pass ETIMEDOUT retains stage ${stage}, budget and exact failure without retry`, async () => {
    const f = populationDiagnosticFixture();
    let queries = 0;
    const failure = Object.assign(new Error('spawnSync powershell.exe ETIMEDOUT private-data'), {
      code: 'ETIMEDOUT',
      stdout: '',
    });
    const execute: WindowsPopulationExecute = () => {
      queries++;
      const output = windowsMarkers(f.clock.now(), queries === 1 ? 5 : stage);
      if (queries === 1) {
        f.clock.advance(200);
        return output + JSON.stringify(rows);
      }
      failure.stdout = `${output}private account and executable stdout must not be relayed`;
      f.clock.advance(800);
      throw failure;
    };
    const provider = createWindowsPopulationProvider(
      (budget, probe) => executeWindowsPopulation(budget, probe, execute, f.clock.now),
      () => bytes,
      () => executable,
      f.diagnostics.collection,
      f.clock.now
    );
    await assert.rejects(
      f.diagnostics.run(() => provider.snapshot(1000)),
      (error) => error === failure
    );
    assert.equal(queries, 2);
    const state = f.records().at(-1).state;
    assert.equal(state.complete, false);
    assert.equal(state.nativePasses, 1);
    assert.equal(state.collectionStageCode, 4);
    assert.equal(state.remainingMs, 0);
    assert.equal(state.windowsProbe.pass, 2);
    assert.equal(state.windowsProbe.budgetMs, 800);
    assert.equal(state.windowsProbe.durationMs, 800);
    assert.equal(state.windowsProbe.remainingMs, 0);
    assert.equal(state.windowsProbe.stageCode, stage);
    assert.equal(f.records().at(-1).firstFailedGate, 'multi-root-population');
    assert.doesNotMatch(f.lines.join(''), /private|account|powershell|LA_MR_POP/);
  });
}

test('Windows diagnostic markers do not turn late success or malformed table into acceptance', async () => {
  for (const late of [false, true]) {
    const f = populationDiagnosticFixture();
    const provider = createWindowsPopulationProvider(
      (budget, probe) =>
        executeWindowsPopulation(
          budget,
          probe,
          () => {
            const output = windowsMarkers(f.clock.now()) + (late ? JSON.stringify(rows) : '{"not":"a complete table"}');
            if (late) {
              f.clock.advance(budget + 1);
            }
            return output;
          },
          f.clock.now
        ),
      () => bytes,
      () => executable,
      f.diagnostics.collection,
      f.clock.now
    );
    await assert.rejects(
      f.diagnostics.run(() => provider.snapshot(1000)),
      late ? /deadline/ : /Malformed/
    );
    assert.equal(f.records().at(-1).state.ok, false);
  }
});

test(
  'Windows staged script protocol runs with synthetic CIM only, never a shared-host process scan',
  { skip: process.platform !== 'win32' },
  () => {
    const probe: WindowsPopulationProbe = { pass: 1, budgetMs: 5000, durationMs: 0, remainingMs: 5000, stageCode: 0 };
    const syntheticQuery = `function Get-CimInstance {
    [pscustomobject]@{ ProcessId=10; ParentProcessId=5; Name='func.exe'; CreationDate=[DateTime]'2026-01-01'; ExecutablePath='C:\\fixture\\func.exe' }
  }; `;
    const execute: WindowsPopulationExecute = (file, args, options) => {
      assert.equal(args.at(-1), windowsPopulationScript);
      assert.equal((windowsPopulationScript.match(/Get-CimInstance/g) ?? []).length, 1);
      assert.doesNotMatch(windowsPopulationScript, /-Filter|-Query|Where-Object/);
      return execFileSync(file, [...args.slice(0, -1), syntheticQuery + windowsPopulationScript], options);
    };
    const output = executeWindowsPopulation(5000, probe, execute);
    assert.equal(parseWindowsPopulation(output).length, 1);
    assert.equal(probe.stageCode, 5);
    for (const value of [probe.startupMs, probe.cimMs, probe.projectionMs, probe.serializationMs, probe.respondMs]) {
      assert.ok(typeof value === 'number' && value >= 0);
    }
    assert.doesNotMatch(output, /LA_MR_POP/);
  }
);

test(
  'Windows owning RPC retains its script-entry marker on an actual synthetic CIM timeout',
  { skip: process.platform !== 'win32' },
  () => {
    const probe: WindowsPopulationProbe = { pass: 1, budgetMs: 5000, durationMs: 0, remainingMs: 5000, stageCode: 0 };
    const execute: WindowsPopulationExecute = (file, args, options) =>
      execFileSync(
        file,
        // Fault injection, not a readiness sleep: block only the synthetic
        // query until the owning execFileSync budget terminates this child.
        [...args.slice(0, -1), `function Get-CimInstance { Start-Sleep -Seconds 30 }; ${windowsPopulationScript}`],
        options
      );
    assert.throws(
      () => executeWindowsPopulation(5000, probe, execute),
      (error: unknown) => (error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
    );
    assert.equal(probe.stageCode, 1, 'Partial stdout must distinguish script entry from PowerShell startup');
    assert.equal(probe.cimMs, undefined, 'A blocked query has no completion timing');
    assert.ok(probe.durationMs >= 5000);
    assert.ok(probe.remainingMs <= 0);
  }
);
test('Windows malformed/permission-hidden func rows are rejected', () => {
  for (const value of [{}, [null], [{ ...rows[0], executable: '' }], [{ ...rows[0], birth: '' }], [rows[0], rows[0]]]) {
    assert.throws(() => parseWindowsPopulation(JSON.stringify(value)));
  }
});
test('Windows native execution permission failure propagates', async () => {
  const provider = createWindowsPopulationProvider(
    () => {
      throw new Error('EPERM fixture');
    },
    () => bytes,
    () => executable
  );
  await assert.rejects(provider.snapshot(5000), /EPERM/);
});
test('Windows stale PID / population race between native scans is rejected', async () => {
  let scan = 0;
  const provider = createWindowsPopulationProvider(
    () => JSON.stringify([{ ...rows[0], birth: ++scan === 1 ? '123' : '124' }]),
    () => bytes,
    () => executable
  );
  await assert.rejects(provider.snapshot(5000), PopulationRace);
});
test('Windows binary permissions and binary replacement fail closed', async () => {
  const denied = createWindowsPopulationProvider(
    () => JSON.stringify(rows),
    () => {
      throw new Error('EACCES fixture');
    },
    () => executable
  );
  await assert.rejects(denied.snapshot(5000), /EACCES/);
  let read = 0;
  const changed = createWindowsPopulationProvider(
    () => JSON.stringify(rows),
    () => (++read === 1 ? bytes : Buffer.from('changed')),
    () => executable
  );
  await assert.rejects(changed.snapshot(5000), /executable race/);
});

const fakeStat = (birth = '42', flags = '0') => {
  const fields = ['S', ...Array.from({ length: 18 }, () => '0'), birth];
  fields[6] = flags;
  return `100 (func name) ${fields.join(' ')}`;
};
function procFixture(overrides: Partial<ProcFiles> = {}): ProcFiles {
  return {
    readdir: () => ['100'],
    read: (file) => (file.endsWith('boot_id') ? 'fixture-boot' : file.endsWith('comm') ? 'func\n' : fakeStat()),
    readlink: () => executable,
    binary: () => bytes,
    ...overrides,
  };
}
test('Linux unit-owned proc files prove executable and creation identity', async () => {
  const provider = createLinuxPopulationProvider(procFixture(), '/unit-owned-proc');
  assert.equal((await provider.snapshot(5000)).processes[0].birth, 'fixture-boot:42');
});

function zombieProcFixture(options: { zombieName?: string; mutate?: (operation: string, count: number) => string | undefined } = {}) {
  const calls = new Map<string, number>();
  const tick = (operation: string) => {
    const count = (calls.get(operation) ?? 0) + 1;
    calls.set(operation, count);
    return options.mutate?.(operation, count);
  };
  const missing = () => Object.assign(new Error('unit zombie has no executable'), { code: 'ENOENT' });
  const files = procFixture({
    readdir: () => ['100', '101'],
    read: (file) => {
      if (file.endsWith('boot_id')) {
        return 'boot';
      }
      const pid = path.basename(path.dirname(file));
      const operation = path.basename(file);
      if (pid === '100') {
        return operation === 'comm' ? 'func' : fakeStat();
      }
      const changed = tick(operation);
      if (changed !== undefined) {
        return changed;
      }
      if (operation === 'comm') {
        return options.zombieName ?? 'unit-exited';
      }
      if (operation === 'cmdline') {
        return '';
      }
      return fakeStat('43').replace(') S ', ') Z ');
    },
    readlink: (file) => {
      if (path.basename(path.dirname(file)) === '100') {
        return executable;
      }
      const changed = tick('exe');
      if (changed !== undefined) {
        return changed;
      }
      throw missing();
    },
  });
  return { files, calls };
}

test('Linux birth-bound zombie cannot starve the complete live executable population, including a Func-named zombie', async () => {
  for (const zombieName of ['unit-exited', 'func']) {
    const f = zombieProcFixture({ zombieName });
    const result = await createLinuxPopulationProvider(f.files, '/unit-owned-proc').snapshot(5000);
    assert.deepEqual(result.processes, [{ pid: 100, birth: 'boot:42', executable, sha256, parentPid: 0 }]);
    assert.ok((f.calls.get('stat') ?? 0) >= 3, 'Zombie state/birth must be rechecked across collection');
    assert.ok((f.calls.get('cmdline') ?? 0) >= 2, 'Empty argv must be rechecked across collection');
    assert.ok((f.calls.get('exe') ?? 0) >= 3, 'Executable absence must be rechecked across collection');
  }
});

test('Linux zombie exclusion rejects live-state transition, PID reuse, nonempty argv, inaccessible metadata and reappearing exe', async () => {
  for (const [operation, count, value] of [
    ['stat', 2, fakeStat('43')],
    ['stat', 3, fakeStat('44').replace(') S ', ') Z ')],
    ['cmdline', 1, 'func\0host\0start\0'],
    ['cmdline', 2, 'func\0host\0start\0'],
    ['exe', 2, executable],
    ['exe', 3, executable],
  ] as const) {
    const f = zombieProcFixture({ mutate: (actual, seen) => (actual === operation && seen === count ? value : undefined) });
    await assert.rejects(createLinuxPopulationProvider(f.files, '/unit-owned-proc').snapshot(5000));
  }
  for (const operation of ['stat', 'comm', 'cmdline', 'exe']) {
    const denied = Object.assign(new Error('unit metadata denied'), { code: 'EACCES' });
    const f = zombieProcFixture({
      mutate: (actual, count) => {
        if (actual === operation && (operation !== 'exe' || count > 1)) {
          throw denied;
        }
        return undefined;
      },
    });
    await assert.rejects(createLinuxPopulationProvider(f.files, '/unit-owned-proc').snapshot(5000), (actual) => actual === denied);
  }
});

test('Linux protected unrelated system process does not hide any Funcs from the full native population', async () => {
  for (const code of ['EACCES', 'EPERM']) {
    const denied = Object.assign(new Error('protected system exe'), { code });
    const files = procFixture({
      readdir: () => ['1', '100', '101'],
      read: (file) =>
        file.endsWith('boot_id')
          ? 'boot'
          : file.endsWith('stat')
            ? fakeStat()
            : file.endsWith('cmdline')
              ? '/sbin/init\0--system\0'
              : path.basename(path.dirname(file)) === '1'
                ? 'systemd\n'
                : path.basename(path.dirname(file)) === '101'
                  ? 'renamed-func\n'
                  : 'func\n',
      readlink: (file) => {
        if (path.basename(path.dirname(file)) === '1') {
          throw denied;
        }
        return executable;
      },
    });
    const result = await createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000);
    assert.deepEqual(result, {
      complete: true,
      processes: [100, 101].map((pid) => ({ pid, birth: 'boot:42', executable, sha256, parentPid: 0 })),
      lineage: [1, 100, 101].map((pid) => ({ pid, birth: 'boot:42', parentPid: 0 })),
    });
  }
});

test('Linux denied Func by comm or argv[0], unreadable metadata and unknown rows remain fatal, not absence', async () => {
  for (const kind of [
    'func-comm',
    'renamed-func',
    'no-argv',
    'malformed-argv',
    'unreadable-argv',
    'unreadable-comm',
    'empty-comm',
  ] as const) {
    const denied = Object.assign(new Error(`EACCES ${kind}`), { code: 'EACCES' });
    const files = procFixture({
      read: (file) => {
        if (file.endsWith('boot_id')) {
          return 'boot';
        }
        if (file.endsWith('stat')) {
          return fakeStat();
        }
        if (file.endsWith('comm')) {
          if (kind === 'unreadable-comm') {
            throw denied;
          }
          return kind === 'func-comm' ? 'func' : kind === 'empty-comm' ? '' : 'renamed';
        }
        if (kind === 'unreadable-argv') {
          throw denied;
        }
        return kind === 'renamed-func' ? '/other/func\0--port\0' : kind === 'malformed-argv' ? 'unknown' : '';
      },
      readlink: () => {
        throw denied;
      },
    });
    await assert.rejects(
      createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000),
      /EACCES|no classifiable process|Missing process name/,
      kind
    );
  }
});

test('Linux denied non-Func exclusion is revalidated against PID reuse, name changes and argv exec changes', async () => {
  for (const kind of ['birth', 'comm', 'argv', 'disappearance'] as const) {
    const reads: Record<string, number> = {};
    const files = procFixture({
      read: (file) => {
        const key = path.basename(file);
        reads[key] = (reads[key] || 0) + 1;
        // Change only on the final pass: a one-time permission catch-and-skip
        // would otherwise wrongly return complete:true.
        const changed = reads[key] >= 3;
        if (file.endsWith('boot_id')) {
          return 'boot';
        }
        if (file.endsWith('stat')) {
          if (kind === 'disappearance' && changed) {
            throw Object.assign(new Error('gone'), { code: 'ENOENT' });
          }
          return fakeStat(kind === 'birth' && changed ? '99' : '42');
        }
        if (file.endsWith('comm')) {
          return kind === 'comm' && changed ? 'func' : 'systemd';
        }
        return kind === 'argv' && changed ? '/other/func\0' : '/sbin/init\0';
      },
      readlink: () => {
        throw Object.assign(new Error('protected exe'), { code: 'EACCES' });
      },
    });
    await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), PopulationRace, kind);
  }
});

test('Linux non-permission executable errors and Func binary permission failures cannot be excluded', async () => {
  for (const kind of ['io-error', 'func-binary'] as const) {
    const error = Object.assign(new Error(kind), { code: kind === 'io-error' ? 'EIO' : 'EACCES' });
    const files = procFixture({
      readlink: () => {
        if (kind === 'io-error') {
          throw error;
        }
        return executable;
      },
      binary: () => {
        throw error;
      },
    });
    await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), (actual) => actual === error);
  }
});

test('Linux any unreadable process name blocks complete enumeration', async () => {
  const files = procFixture({
    read: () => {
      throw new Error('EACCES own fixture');
    },
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), /EACCES/);
});
test('Linux process disappearing while enumerating cannot establish an empty population', async () => {
  const error = Object.assign(new Error('gone'), { code: 'ENOENT' });
  const files = procFixture({
    readlink: () => {
      throw error;
    },
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), PopulationRace);
});
test('Linux stale PID and table population races are rejected', async () => {
  let reads = 0;
  const files = procFixture({
    read: (file) => (file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'func' : fakeStat(++reads === 1 ? '42' : '43')),
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), PopulationRace);
  let scans = 0;
  const changing = procFixture({ readdir: () => (++scans === 1 ? ['100'] : ['100', '101']) });
  await assert.rejects(createLinuxPopulationProvider(changing, '/unit-owned-proc').snapshot(5000), PopulationRace);
});

test('Linux verified executable-free kernel thread is not a func process', async () => {
  for (const code of ['ENOENT', 'EACCES', 'EPERM']) {
    const inaccessible = Object.assign(new Error('fixture kernel executable link unavailable'), { code });
    const kernel = procFixture({
      readlink: () => {
        throw inaccessible;
      },
      read: (file) =>
        file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'kernel' : file.endsWith('cmdline') ? '' : fakeStat('42', '2097152'),
    });
    assert.deepEqual(await createLinuxPopulationProvider(kernel, '/unit-owned-proc').snapshot(5000), {
      complete: true,
      processes: [],
      lineage: [{ pid: 100, birth: 'boot:42', parentPid: 0 }],
    });
  }
});
test('Linux empty userspace argv does not prove a kernel thread when its executable is unavailable', async () => {
  for (const code of ['ENOENT', 'EACCES']) {
    const files = procFixture({
      readlink: () => {
        throw Object.assign(new Error('inaccessible userspace exe'), { code });
      },
      read: (file) => (file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'nonfunc' : file.endsWith('cmdline') ? '' : fakeStat()),
    });
    await assert.rejects(
      createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000),
      /userspace process|no classifiable process/
    );
  }
});
test('Linux inaccessible/missing userspace executable is not silently removed from the population', async () => {
  const missing = Object.assign(new Error('fixture missing executable'), { code: 'ENOENT' });
  const files = procFixture({
    readlink: () => {
      throw missing;
    },
    read: (file) =>
      file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'nonfunc' : file.endsWith('cmdline') ? 'userspace-argv' : fakeStat(),
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), /userspace process/);
});

const view = (overrides: Partial<WorkbenchState> = {}): WorkbenchState => ({
  timeOrigin: 1,
  title: 'unit.code-workspace - Visual Studio Code',
  ready: true,
  roots: ['one', 'two', 'three'],
  activeTabs: ['MultiRootMap'],
  visibleWebviews: ['vscode-webview://mapper/index.html'],
  debugToolbar: false,
  ...overrides,
});
test('hidden/wrong Mapper iframe and wrong active tab fail', () => {
  assert.throws(() => assertActiveWebview(view(), 'vscode-webview://designer/index.html', 'MultiRootMap'), /visible/);
  assert.throws(
    () => assertActiveWebview(view({ activeTabs: ['Create workspace'] }), 'vscode-webview://mapper/index.html', 'MultiRootMap'),
    /active editor/
  );
});
test('Mapper command discovery/title is not Mapper-open evidence', () => {
  assert.throws(() => assertMapper('Create data map', true), /Actual Data Mapper/);
  assert.throws(() => assertMapper('Source schema Target schema ENOENT', true), /failed/);
  assert.throws(() => assertMapper('Source schema Target schema', false), /did not load/);
  assertMapper('Source schema Target schema', true);
});
const debugPair = (folder: string, id: string): DebugEvent[] => [
  { kind: 'started', boot: 'reloaded', folder, id, name: 'Run logic app', type: 'coreclr' },
  { kind: 'terminated', boot: 'reloaded', folder, id, name: 'Run logic app', type: 'coreclr' },
];
test('every folder actually starts and terminates sequentially', () => {
  assertSequentialDebug([...debugPair('one', '1'), ...debugPair('two', '2')], ['one', 'two']);
  assertSequentialDebug(debugPair('d:\\unit\\app', 'windows'), ['D:\\Unit\\App'], 'win32');
  assert.throws(() => assertSequentialDebug(debugPair('/unit/app', 'linux'), ['/Unit/App'], 'linux'), /Wrong-folder/);
});
test('overlap, wrong root, incomplete lifecycle, and wrong termination folder fail', () => {
  const a = debugPair('one', '1');
  const b = debugPair('two', '2');
  assert.throws(() => assertSequentialDebug([a[0], b[0], a[1], b[1]], ['one', 'two']), /one at a time/);
  assert.throws(() => assertSequentialDebug(debugPair('wrong', '1'), ['one']), /Wrong-folder/);
  assert.throws(() => assertSequentialDebug([a[0]], ['one']), /remained active/);
  assert.throws(() => assertSequentialDebug([a[0], { ...a[1], folder: 'two' }], ['one']), /different folder/);
  assert.throws(() => assertSequentialDebug(a, ['one', 'two']), /Every folder/);
  assert.throws(() => assertSequentialDebug([a[0], { ...a[1], boot: 'replacement' }], ['one']), /different extension host/);
  assert.throws(() => assertSequentialDebug([...a, { kind: 'activation', boot: 'replacement' }, ...b], ['one', 'two']), /replaced between/);
});
test('complete persisted root denominator rejects absent/partial/duplicate roots and has no ceiling', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-unit-'));
  try {
    const roots = Array.from({ length: 5 }, (_, i) => path.join(temp, `app-${i}`));
    for (const folder of roots) {
      fs.mkdirSync(path.join(folder, 'main'), { recursive: true });
      for (const file of ['host.json', 'local.settings.json', 'main/workflow.json']) {
        fs.writeFileSync(path.join(folder, file), '{}');
      }
    }
    const file = path.join(temp, 'fixture.code-workspace');
    const write = (folders: string[]) => fs.writeFileSync(file, JSON.stringify({ folders: folders.map((folder) => ({ path: folder })) }));
    write(roots);
    assert.equal(readLogicAppRoots(file, roots).length, 5);
    write(roots.slice(1));
    assert.throws(() => readLogicAppRoots(file, roots), /missing/);
    write([...roots, roots[0]]);
    assert.throws(() => readLogicAppRoots(file, roots), /Duplicate/);
    write(roots);
    fs.rmSync(path.join(roots[0], 'host.json'));
    assert.throws(() => readLogicAppRoots(file, roots), /Incomplete/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
import './workspaceMultiRootOwnership.unit';
