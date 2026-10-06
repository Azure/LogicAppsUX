import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import { assertNextButtonEnabled, enterFieldValue, getPageText, selectDropdownOption, selectRadioOption } from './cdpFormHelpers';
import { captureCdpScreenshot } from './screenshot';
import { nativePopulationProvider, remainingBudget, waitForFuncPopulation } from './workspaceMultiRootCollector';
import {
  activeWebview,
  assertMapper,
  assertSequentialDebug,
  boundedCdp,
  clickText,
  command,
  debugEvents,
  enterQuickInput,
  folderCreateNewProject,
  poll,
  readLogicAppRoots,
  readWorkbench,
  realReload,
} from './workspaceMultiRootWorkbench';

export interface MultiRootWorkspace {
  wsFilePath: string;
  appDir: string;
}

export interface MultiRootOptions {
  workspace: MultiRootWorkspace;
  eventsFile: string;
  funcExecutable: string;
  funcSha256: string;
  deadline: number;
}

// Executed by the official CLI runner's supplementary regular-window route.
// The observer lives outside the extension host: real Reload Window cannot
// silently end/restart the test and manufacture a fresh-window substitute.
export async function runWorkspaceMultiRootUi(options: MultiRootOptions) {
  assert.equal(process.env.LA_E2E_CLI_MULTI_ROOT_ISOLATED, '1', 'Native multi-root UI requires an isolated consumer');
  const { workspace, deadline } = options;
  const cdp = await connectToVsCodeWorkbenchCdp({ waitForServer: true, timeoutMs: Math.min(15000, remainingBudget(deadline)) });
  const workbench = boundedCdp(cdp, deadline);
  const phaseDeadline = (budgetMs: number) => Math.min(deadline, Date.now() + budgetMs);
  const capture = async (name: string) => {
    const file = await captureCdpScreenshot(cdp, name, {
      classification: 'evidence',
      expectation: { kind: 'workbenchShell', label: name },
      timeoutMs: Math.min(5000, remainingBudget(deadline)),
      deadlineMs: Math.min(deadline, Date.now() + 5000),
    });
    assert.ok(file && fs.existsSync(file), 'Required multi-root workbench evidence was not captured');
    return file;
  };
  try {
    await cdp.send('Runtime.enable', {}, { timeoutMs: remainingBudget(deadline) });
    await cdp.send('Page.enable', {}, { timeoutMs: remainingBudget(deadline) });
    await command(workbench, 'View: Show Explorer', phaseDeadline(30000));
    await poll(
      () => readWorkbench(workbench),
      (state) => state.ready && state.roots.includes(path.basename(workspace.appDir)),
      phaseDeadline(30000)
    );

    // Three example roots, matching the source fixture shape. No extra app-type
    // matrix and no maximum of three in the collector, root loader or debug contract.
    const createdRoots = [fs.realpathSync(workspace.appDir)];
    for (const name of ['multiroot-second', 'multiroot-third']) {
      const phase = phaseDeadline(120000);
      await folderCreateNewProject(workbench, createdRoots[0], phase);
      const { cdp: wizard, contextId } = await activeWebview(workbench, 'Create project', ['Logic app name', 'Workflow name'], phase);
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
    }
    const roots = readLogicAppRoots(workspace.wsFilePath, createdRoots);
    await command(workbench, 'View: Show Explorer', phaseDeadline(30000));
    await poll(
      () => readWorkbench(workbench),
      (state) => roots.every((root) => state.roots.includes(path.basename(root))),
      phaseDeadline(30000)
    );
    const screenshots = [await capture('workspace-multi-root-created')];
    const originalBoot = debugEvents(options.eventsFile)
      .filter((event) => event.kind === 'activation')
      .at(-1)?.boot;
    assert.ok(originalBoot, 'Native observer did not activate in the original workspace window');

    const reload = await realReload(cdp, roots, phaseDeadline(60000));
    const activation = await poll(
      async () =>
        debugEvents(options.eventsFile)
          .filter((event) => event.kind === 'activation')
          .at(-1),
      (event) => !!event && event.boot !== originalBoot,
      phaseDeadline(30000)
    );
    assert.ok(activation?.roots);
    assert.deepEqual(
      activation.roots
        .filter((root) => fs.existsSync(path.join(root, 'host.json')))
        .map((root) => fs.realpathSync(root))
        .sort(),
      [...roots].sort(),
      'Fresh extension-host workspace roots differ from the complete generated Logic App population'
    );
    assert.deepEqual(readLogicAppRoots(workspace.wsFilePath, createdRoots), roots, 'Reload changed the count denominator');
    const population = await waitForFuncPopulation(nativePopulationProvider(), {
      logicAppCount: roots.length,
      executable: options.funcExecutable,
      sha256: options.funcSha256,
      deadline: phaseDeadline(90000),
    });
    assert.deepEqual(
      readLogicAppRoots(workspace.wsFilePath, createdRoots),
      roots,
      'Logic App denominator changed during population collection'
    );
    screenshots.push(await capture('workspace-multi-root-reloaded'));

    for (const folder of roots) {
      const phase = phaseDeadline(180000);
      const launch: { configurations: { name: string; type: string; request: string }[] } = JSON.parse(
        fs.readFileSync(path.join(folder, '.vscode/launch.json'), 'utf8')
      );
      const configs = launch.configurations.filter((config) => config.request === 'attach' || config.request === 'launch');
      assert.equal(configs.length, 1, 'A unique generated Logic App debug configuration is required');
      const config = configs[0];
      const qualified = `${config.name} (${path.basename(folder)})`;
      assert.ok(
        !debugEvents(options.eventsFile).some((event) => event.kind === 'started' && event.folder === folder),
        'Duplicate debug request'
      );
      await command(workbench, 'Debug: Select and Start Debugging', phase);
      await clickText(workbench, '.quick-input-list .monaco-list-row', qualified, phase);
      const started = await poll(
        async () => debugEvents(options.eventsFile).filter((event) => event.kind === 'started' && event.folder === folder),
        (events) => events.length > 0,
        phase
      );
      assert.equal(started.length, 1);
      assert.equal(started[0].boot, activation.boot, 'Debug evidence came from a replaced extension host');
      assert.equal(started[0].name, config.name);
      assert.equal(started[0].type, config.type);
      await poll(
        () => readWorkbench(workbench),
        (state) => state.debugToolbar,
        phase
      );
      screenshots.push(await capture(`workspace-multi-root-debug-${path.basename(folder)}`));
      await command(workbench, 'Debug: Stop', phase);
      await poll(
        async () => debugEvents(options.eventsFile).some((event) => event.kind === 'terminated' && event.id === started[0].id),
        Boolean,
        phase
      );
      await poll(
        () => readWorkbench(workbench),
        (state) => !state.debugToolbar,
        phase
      );
    }
    const events = debugEvents(options.eventsFile);
    assertSequentialDebug(events, roots);

    const mapperPhase = phaseDeadline(120000);
    // Navigate through the real Azure view and its real Create data map action.
    await command(workbench, 'View: Close All Editors', mapperPhase);
    await clickText(workbench, '.activitybar .action-label', 'Azure', mapperPhase);
    const mapperExpanded = await workbench.evaluate<boolean>(
      undefined,
      `Array.from(document.querySelectorAll('.sidebar .pane-header')).some(e =>
        /Data Mapper/i.test(e.textContent || '') && e.getAttribute('aria-expanded')==='true') ||
       Array.from(document.querySelectorAll('.sidebar button, .sidebar .monaco-button')).some(e =>
        /create data map/i.test(e.textContent || '') && !!e.getClientRects().length)`
    );
    if (!mapperExpanded) {
      await clickText(workbench, '.sidebar .pane-header .title', 'Data Mapper', mapperPhase);
    }
    await clickText(workbench, '.sidebar button, .sidebar .monaco-button', 'Create data map', mapperPhase);
    await clickText(workbench, '.quick-input-list .monaco-list-row .label-name', path.basename(roots[0]), mapperPhase);
    await poll(
      () =>
        workbench.evaluate<boolean>(
          undefined,
          `(() => {
        const widget=document.querySelector('.quick-input-widget');
        return !!widget && /Data Map/i.test((widget.textContent||'')+' '+(widget.querySelector('input')?.placeholder||''));
      })()`
        ),
      Boolean,
      mapperPhase
    );
    const mapName = 'MultiRootMap';
    await enterQuickInput(workbench, mapName, mapperPhase);
    const { cdp: mapper, contextId } = await activeWebview(workbench, mapName, ['Source schema', 'Target schema'], mapperPhase);
    try {
      const view = boundedCdp(mapper, mapperPhase);
      const state = await view.evaluate<{ text: string; loaded: boolean }>(
        contextId,
        `({text:document.body.innerText,loaded:document.readyState==='complete' &&
          !!document.querySelector('.react-flow, .ms-Stack, [class*="schema"], [class*="Schema"]')})`
      );
      assertMapper(state.text, state.loaded);
      screenshots.push(await capture('workspace-multi-root-mapper'));
    } finally {
      mapper.dispose();
    }
    remainingBudget(deadline);
    return { roots, reload, originalBoot, reloadedBoot: activation.boot, population, events, mapperOpened: true, screenshots };
  } finally {
    cdp.dispose();
  }
}
