import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
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
  type FolderMenuCheckpoint,
  type DebugEvent,
  readLogicAppRoots,
  waitForActivatedMultiRootRuntime,
  waitForProjectWizardClosed,
  type WorkbenchState,
} from './workspaceMultiRootWorkbench';
import { contextMenuDom, workbenchDomFixture } from './workbenchDomFixture';
import { selectRadioOption } from './cdpFormHelpers';

const executable = path.resolve('func.exe');

// Fluent Radio/Field use native input-label associations in LogicAppTypeStep
// and WorkflowTypeStep. Review renders these same strings as plain text.
const projectSetupDom = `
  <div class="fui-Field"><label for="app">Logic app name *</label><input id="app"></div>
  <div class="fui-Radio"><input type="radio" id="standard"><label for="standard">Logic app (Standard)</label></div>
  <div class="fui-Field"><label for="workflow">Workflow name *</label><input id="workflow"></div>
  <button>Next</button>`;
const projectReviewDom = `
  <h2>Review + create</h2><p>Review your configuration and create your Logic App workspace.</p>
  <div>Logic app name: <span>multiroot-second</span></div>
  <div>Logic app type: <span>Logic app (Standard)</span></div>
  <div>Workflow name: <span>main</span></div><button>Create project</button>`;

test('Create project readiness requires its own live setup controls, not the previous review page strings', async () => {
  const setup = workbenchDomFixture(projectSetupDom);
  const review = workbenchDomFixture(projectReviewDom);
  try {
    await assertProjectSetupForm(setup.cdp, 1);
    await assert.rejects(assertProjectSetupForm(review.cdp, 1), /own enabled setup controls/);
    // Reproduce the reached error with the real shared helper, without changing
    // its selector or replaying radio clicks against a summary document.
    await assert.rejects(selectRadioOption(review.cdp, 1, 'Logic app (Standard)'), /Radio input not found/);
    assert.deepEqual(review.sent, []);
  } finally {
    setup.dispose();
    review.dispose();
  }
});

test('Create project readiness rejects hidden, disabled, ambiguous or incomplete setup controls', async () => {
  for (const kind of ['hidden', 'disabled', 'duplicate', 'missing-label', 'no-next'] as const) {
    const fixture = workbenchDomFixture(projectSetupDom);
    try {
      if (kind === 'hidden') {
        fixture.document.querySelector('.fui-Radio').style.display = 'none';
      } else if (kind === 'disabled') {
        fixture.document.querySelector('#app').disabled = true;
      } else if (kind === 'duplicate') {
        fixture.document.body.insertAdjacentHTML(
          'beforeend',
          projectSetupDom.replaceAll('id="', 'id="copy-').replaceAll('for="', 'for="copy-')
        );
      } else if (kind === 'missing-label') {
        fixture.document.querySelector('label[for="workflow"]').remove();
      } else {
        fixture.document.querySelector('button').remove();
      }
      await assert.rejects(assertProjectSetupForm(fixture.cdp, 1), /own enabled setup controls/);
      assert.deepEqual(fixture.sent, []);
    } finally {
      fixture.dispose();
    }
  }
});

test('Create project discovery admits only the active owner and a live setup document before any input', async () => {
  for (const kind of ['setup', 'review', 'wrong-owner', 'inactive-tab'] as const) {
    const form = workbenchDomFixture(kind === 'review' ? projectReviewDom : projectSetupDom);
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
      'View: Show Explorer',
      'Create Project is never invoked through the command palette/service'
    );
    assert.equal(
      fixture.sent.filter((entry) => entry.params.type === 'mousePressed').length,
      3,
      'Palette, root, and actual menu item clicks'
    );
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
  const probes = [`configured launcher ${executable}=4.1.2`, 'in-proc8 fixture=4.1.2'];
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
    const launch = multiRootRegularLaunch(admitted, {}, path.join(f.root, 'profile'));
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
    assert.ok(initialGate >= 0 && initialGate < source.indexOf('await folderCreateNewProject'));
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
      processes: [100, 101].map((pid) => ({ pid, birth: 'boot:42', executable, sha256 })),
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
    assert.deepEqual(await createLinuxPopulationProvider(kernel, '/unit-owned-proc').snapshot(5000), { complete: true, processes: [] });
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
