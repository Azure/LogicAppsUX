import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpEvaluator } from './cdpFormHelpers';
import type { WorkspacePromptObservation } from './workspacePromptCancel';
import type { ScreenshotReadinessMetadata, ScreenshotReadinessSnapshot } from './screenshotReadiness';

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-cancel-unit-'));
  const originalScreenshotDir = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  process.env.LA_E2E_CLI_SCREENSHOT_DIR = path.join(root, 'captures');
  const {
    assertExistingAppView,
    captureWorkspacePromptCancelBaseline,
    captureRequiredCancelScreenshot,
    createWorkspacePromptCancelPhase,
    assertWorkspacePromptCancelPhaseBudget,
    assertWorkspacePromptCancelSettled,
    isOpenFolderPickerReady,
    isWorkspacePromptNavigationError,
    waitForWorkspacePromptNavigation,
    workspacePromptCancelScreenshotOptions,
  } = await import('./workspacePromptCancel');
  try {
    const appDir = path.join(root, 'workspace', 'existing-app');
    fs.mkdirSync(path.join(appDir, '.vscode'), { recursive: true });
    const workspace = {
      appDir,
      workspaceFilePath: path.join(root, 'workspace', 'existing.code-workspace'),
      workflowJsonPath: path.join(appDir, 'workflow.json'),
    };
    for (const name of ['tasks.json', 'launch.json', 'settings.json', 'extensions.json']) {
      fs.writeFileSync(path.join(appDir, '.vscode', name), '{}');
    }
    for (const file of [
      workspace.workspaceFilePath,
      workspace.workflowJsonPath,
      path.join(appDir, 'host.json'),
      path.join(appDir, 'local.settings.json'),
    ]) {
      fs.writeFileSync(file, '{}');
    }
    const baseline = captureWorkspacePromptCancelBaseline(root, workspace);
    assert.strictEqual(baseline.files.length, 8);
    assert.deepStrictEqual(captureWorkspacePromptCancelBaseline(root, workspace), baseline);
    fs.writeFileSync(workspace.workflowJsonPath, '{ }');
    assert.notDeepStrictEqual(
      captureWorkspacePromptCancelBaseline(root, workspace).files,
      baseline.files,
      'Even semantically equal byte changes must fail'
    );
    fs.writeFileSync(workspace.workflowJsonPath, '{}');
    fs.writeFileSync(path.join(appDir, 'unexpected.txt'), 'unexpected');
    assert.notDeepStrictEqual(
      captureWorkspacePromptCancelBaseline(root, workspace).entries,
      baseline.entries,
      'New files must not count as nothing happening'
    );
    const view = { title: 'existing-app - [Extension Development Host]', folderNames: ['EXISTING-APP'], tabs: [] };
    assertExistingAppView(view, workspace);
    assert.throws(() => assertExistingAppView({ ...view, title: 'existing workspace' }, workspace), /must still show the existing app/);
    assert.throws(() => assertExistingAppView({ ...view, folderNames: ['workspace'] }, workspace), /Explorer must still show/);
    assert.throws(() => assertExistingAppView({ ...view, tabs: ['Create logic app workspace'] }, workspace), /must not open the wizard/);
    const appObservation: WorkspacePromptObservation = {
      ...view,
      containers: [],
      timeOrigin: 2,
      readyState: 'complete',
      workbenchVisible: true,
    };
    const transitionError = new Error('Inspected target navigated or closed');
    for (const error of [
      transitionError,
      new Error('Cannot find context with specified id'),
      new Error('Execution context was destroyed.'),
    ]) {
      assert.strictEqual(isWorkspacePromptNavigationError(error), true);
    }
    for (const error of [
      'Inspected target navigated or closed',
      new Error('CDP WebSocket closed'),
      new Error('Target closed'),
      new Error('Timed out waiting for CDP Runtime.evaluate response after 1500ms'),
      new Error('Required supplementary result failed'),
    ]) {
      assert.strictEqual(
        isWorkspacePromptNavigationError(error),
        false,
        'Process loss, RPC expiry and terminal failures are not navigation'
      );
    }
    const navigation = new NavigationFixture([
      { ...appObservation, timeOrigin: 1 },
      transitionError,
      { ...appObservation, readyState: 'loading' },
      { ...appObservation, workbenchVisible: false },
      { ...appObservation, folderNames: ['other-app'] },
      appObservation,
    ]);
    const navigationOptions = {
      workspace,
      previousTimeOrigin: 1,
      expectedView: 'app' as const,
      phase: createWorkspacePromptCancelPhase('preceding-no-setup'),
    };
    assert.deepStrictEqual(await waitForWorkspacePromptNavigation(navigation, navigationOptions), appObservation);
    assert.strictEqual(navigation.evaluateCalls, 6, 'Old documents, loading shells and wrong folders cannot satisfy navigation');
    assert.strictEqual(navigation.sendCalls, 0, 'Navigation readiness must not replay any user input');
    const emptyObservation = { ...appObservation, timeOrigin: 3, title: '[Extension Development Host]', folderNames: [] };
    const closeFolder = new NavigationFixture([appObservation, emptyObservation]);
    assert.deepStrictEqual(
      await waitForWorkspacePromptNavigation(closeFolder, { ...navigationOptions, previousTimeOrigin: 2, expectedView: 'empty' }),
      emptyObservation
    );
    for (const error of [
      new Error('CDP WebSocket closed'),
      new Error('Timed out waiting for CDP Runtime.evaluate response after 1500ms'),
      new Error('Required supplementary result failed'),
    ]) {
      const fatalNavigation = new NavigationFixture([error, appObservation]);
      await assert.rejects(waitForWorkspacePromptNavigation(fatalNavigation, navigationOptions), (actual) => actual === error);
      assert.strictEqual(fatalNavigation.evaluateCalls, 1, 'Only document-navigation errors may be retried');
    }
    await assert.rejects(
      waitForWorkspacePromptNavigation(
        new NavigationFixture([{ ...appObservation, tabs: ['Create logic app workspace'] }]),
        navigationOptions
      ),
      /must not open the wizard/,
      'An unexpected wizard is an assertion failure, not transient navigation'
    );
    await assert.rejects(
      waitForWorkspacePromptNavigation(new NavigationFixture([{ ...appObservation, refusal: 'DialogService refused' }]), navigationOptions),
      /refused the real workspace dialog/
    );
    for (const observation of [
      { ...appObservation, timeOrigin: 1 },
      { ...appObservation, folderNames: ['other-app'] },
    ]) {
      const timeoutNavigation = new NavigationFixture([observation]);
      const fixedPhase = createWorkspacePromptCancelPhase('preceding-no-setup', Date.now() - 29970);
      await assert.rejects(
        waitForWorkspacePromptNavigation(timeoutNavigation, { ...navigationOptions, phase: fixedPhase }),
        /Folder navigation did not reach the new app workbench/,
        'Neither a stale document nor a competing app can extend the phase deadline or satisfy readiness'
      );
      assert.strictEqual(fixedPhase.deadline - fixedPhase.startedAt, 30000);
    }
    const lateNavigation = new NavigationFixture([appObservation], 40);
    await assert.rejects(
      waitForWorkspacePromptNavigation(lateNavigation, {
        ...navigationOptions,
        phase: createWorkspacePromptCancelPhase('preceding-no-setup', Date.now() - 29980),
      }),
      /deadline expired/,
      'A ready document arriving after the original deadline cannot be accepted'
    );
    await assert.rejects(
      waitForWorkspacePromptNavigation(new NavigationFixture([appObservation]), {
        ...navigationOptions,
        previousTimeOrigin: Number.NaN,
      }),
      /original workbench document identity/
    );
    const picker = { visible: true, title: 'Open Folder', value: appDir, busy: false, rowCount: 1 };
    assert.strictEqual(isOpenFolderPickerReady(picker), true);
    for (const rejected of [
      { ...picker, visible: false },
      { ...picker, title: 'Open File' },
      { ...picker, value: '' },
      { ...picker, busy: true },
      { ...picker, rowCount: 0 },
    ]) {
      assert.strictEqual(isOpenFolderPickerReady(rejected), false, 'An initializing or wrong picker cannot accept path input');
    }
    const deadline = Date.now() + 30000;
    const screenshot = workspacePromptCancelScreenshotOptions('unit-checkpoint', deadline);
    assert.strictEqual(screenshot.classification, 'evidence');
    assert.deepStrictEqual(screenshot.expectation, { kind: 'workbenchShell', label: 'unit-checkpoint' });
    assert.ok(screenshot.timeoutMs > 0 && screenshot.timeoutMs <= 5000);
    assert.ok(screenshot.deadlineMs <= deadline, 'Capture cannot extend the existing case deadline');
    assert.throws(() => workspacePromptCancelScreenshotOptions('expired', Date.now() - 1), /original case deadline/);
    const setupPhase = createWorkspacePromptCancelPhase('preceding-no-setup', 1000);
    const cancelPhase = createWorkspacePromptCancelPhase('cancel', 31000);
    assert.strictEqual(setupPhase.deadline, 31000);
    assert.strictEqual(cancelPhase.deadline, 61000, 'The original Cancel budget begins before repeated Open Folder, not after Cancel');
    assert.throws(() => assertWorkspacePromptCancelPhaseBudget(setupPhase, 31000), /deadline expired/);
    assert.throws(() => assertWorkspacePromptCancelPhaseBudget(cancelPhase, 61000), /deadline expired/);
    assert.throws(() => assertWorkspacePromptCancelSettled(60000, cancelPhase, 61500), /deadline expired/);
    assert.throws(() => assertWorkspacePromptCancelSettled(59000, cancelPhase, 60000), /stable unchanged/);
    assert.throws(() => assertWorkspacePromptCancelSettled(undefined, cancelPhase, 60000), /stable unchanged/);
    assert.throws(() => assertWorkspacePromptCancelSettled(1000, setupPhase, 3000), /stable unchanged/);
    assertWorkspacePromptCancelSettled(58000, cancelPhase, 60000);
    assert.strictEqual(cancelPhase.deadline, 61000, 'Settlement never resets or extends the original phase clock');
    const recovered = new CancelCaptureFixture('warmup-once');
    await captureRequiredCancelScreenshot(recovered, 'cancel-generation-recovered', Date.now() + 2500);
    const metadata = JSON.parse(
      fs.readFileSync(path.join(root, 'captures', 'cancel-generation-recovered.json'), 'utf8')
    ) as ScreenshotReadinessMetadata;
    assert.strictEqual(recovered.captureAttempts, 2, 'The original fixture connection must retry after generation warmup');
    const rejected = metadata.events?.find((event) => event.name === 'rejected');
    assert.strictEqual(rejected?.details?.preCaptureGeneration, 0);
    assert.strictEqual(rejected?.details?.postCaptureGeneration, 2);
    assert.strictEqual(metadata.verdict, 'accepted');
    assert.strictEqual(metadata.target.generation, 2);
    assert.ok(metadata.events?.some((event) => event.name === 'accepted' && event.attempt === 2 && event.generation === 2));
    for (const mode of ['unstable', 'rpc-failure', 'deadline'] as const) {
      const name = `cancel-${mode}`;
      const fixture = new CancelCaptureFixture(mode);
      const originalDeadline = Date.now() + (mode === 'deadline' ? 10 : 700);
      await assert.rejects(
        captureRequiredCancelScreenshot(fixture, name, originalDeadline),
        /Screenshot readiness failed|deadline/,
        'A failed or continuously changing original capture must never become accepted evidence'
      );
      assert.ok(!fs.existsSync(path.join(root, 'captures', `${name}.png`)));
      const failed = JSON.parse(fs.readFileSync(path.join(root, 'captures', `${name}.json`), 'utf8')) as ScreenshotReadinessMetadata;
      assert.strictEqual(failed.verdict, 'failed');
      assert.ok(!failed.events?.some((event) => event.name === 'accepted'));
      if (mode === 'rpc-failure') {
        assert.ok(failed.reasonCodes?.includes('capture-rpc-failed'), 'RPC expiry remains distinct from generation rejection');
      }
      if (mode === 'unstable') {
        assert.ok(
          failed.events?.some(
            (event) => event.name === 'rejected' && event.details?.preCaptureGeneration !== event.details?.postCaptureGeneration
          ),
          'Continuously changing original generations must be rejected, not just reported as a missing capture'
        );
      }
      if (mode === 'deadline') {
        assert.strictEqual(fixture.captureAttempts, 0, 'Expired stability cannot start a capture');
      }
    }
    console.log('[workspacePromptCancel.unit] baseline/view assertions passed; no native/UI coverage claimed.');
  } finally {
    if (originalScreenshotDir === undefined) {
      delete process.env.LA_E2E_CLI_SCREENSHOT_DIR;
    } else {
      process.env.LA_E2E_CLI_SCREENSHOT_DIR = originalScreenshotDir;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

class NavigationFixture implements CdpEvaluator {
  readonly targetId = 'unit-original-workbench';
  readonly contextGeneration = 0;
  evaluateCalls = 0;
  sendCalls = 0;

  constructor(
    private readonly observations: Array<WorkspacePromptObservation | Error>,
    private readonly readDelayMs = 0
  ) {}

  async evaluate<T>(): Promise<T> {
    if (this.readDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.readDelayMs));
    }
    const observation = this.observations[Math.min(this.evaluateCalls++, this.observations.length - 1)];
    if (observation instanceof Error) {
      throw observation;
    }
    return observation as T;
  }

  async send(): Promise<unknown> {
    this.sendCalls++;
    throw new Error('Navigation readiness must not dispatch input or replace the connection');
  }
}

class CancelCaptureFixture {
  contextGeneration = 0;
  captureAttempts = 0;
  readonly targetId = 'unit-cancel-workbench';

  constructor(private readonly mode: 'warmup-once' | 'unstable' | 'rpc-failure' | 'deadline') {}

  async send(method: string, _params?: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<unknown> {
    if (method === 'Page.getFrameTree') {
      return { result: { frameTree: { frame: { id: 'unit-cancel-frame' } } } };
    }
    if (method === 'Page.captureScreenshot') {
      this.captureAttempts++;
      if (this.mode === 'rpc-failure') {
        await new Promise((resolve) => setTimeout(resolve, options?.timeoutMs ?? 0));
        throw new Error('Unit original capture RPC deadline expired');
      }
      if (this.mode === 'unstable' || (this.mode === 'warmup-once' && this.captureAttempts === 1)) {
        this.contextGeneration += 2;
      }
      return { result: { data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64') } };
    }
    return { result: {} };
  }

  async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
    if (expression.includes('visibleWorkbench:')) {
      return { visibleWorkbench: true } as T;
    }
    if (
      expression.includes("const key = '__logicAppsScreenshotInvalidation'") ||
      expression.includes('delete globalThis.__logicAppsScreenshotInvalidation')
    ) {
      return { revision: 0 } as T;
    }
    const sample: ScreenshotReadinessSnapshot = {
      ready: true,
      reasonCodes: ['workbench-shell-visible'],
      blockers: [],
      anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
      viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
      counts: { workbenchShellParts: 2 },
      generation: this.contextGeneration,
      revision: 0,
      structuralRevision: 0,
      scrollY: 0,
      expectationKind: 'workbenchShell',
    };
    return sample as T;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
