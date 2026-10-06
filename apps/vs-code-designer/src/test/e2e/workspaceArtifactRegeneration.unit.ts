import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertOwnedRegenerationPath,
  assertRegenerationComplete,
  assertRegenerationNonTargets,
  assertTemplateContracts,
  buildRegenerationPhaseResults,
  captureRegenerationSnapshot,
  captureTemplateContracts,
  confirmRegenerationPromptSequence,
  deleteRegenerationTargets,
  regenerationArtifacts,
  regenerationCases,
  regenerationDeadline,
  regenerationPhaseIds,
  regenerationOverwriteMessage,
  remainingRegenerationBudget,
  requireRegenerationYes,
  selectRegenerationYes,
  selectRegenerationOverwriteYes,
  type RegenerationPromptObservation,
} from './workspaceArtifactRegeneration';
import type { WorkbenchPromptContainer } from './workbenchPromptSelection';
import {
  assertRegenerationRuntimeProfile,
  assertRegenerationRuntimeRoot,
  captureRegenerationRuntimeSettings,
  regenerationRuntimeSettingKeys,
  verifyRegenerationRuntimeSettings,
  writeRegenerationRuntimeProfile,
  type RegenerationRuntimeBinding,
} from './workspaceArtifactRegenerationRuntime';

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-unit-'));
  let checks = 0;
  try {
    // Unit-owned files prove only the test oracle/negative controls. Native
    // fixtures must still come from the real registered CLI wizard/handoff.
    const workspaceDir = path.join(root, 'workspace');
    const appDir = path.join(workspaceDir, 'app');
    const prompt = initializationPrompt(appDir);
    fs.mkdirSync(path.join(appDir, '.vscode'), { recursive: true });
    for (const artifact of regenerationArtifacts) {
      fs.writeFileSync(path.join(appDir, artifact), JSON.stringify({ artifact, version: 1 }));
    }
    const workflowDir = path.join(appDir, 'workflow');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'workflow.json'), '{"kind":"Stateful"}');
    fs.writeFileSync(path.join(workspaceDir, 'workspace.code-workspace'), '{"folders":[{"path":"app"}]}');
    const template = captureTemplateContracts(appDir);
    const baseline = captureRegenerationSnapshot(root, workspaceDir);
    assertTemplateContracts(appDir, template);
    assert.strictEqual(regenerationCases.length, 6);
    assert.ok(regenerationCases.some((entry) => entry.targets.length > 1 && entry.targets.every((name) => name.startsWith('.vscode/'))));
    assert.ok(regenerationCases.some((entry) => entry.targets.includes('host.json') && entry.targets.includes('local.settings.json')));
    assert.strictEqual(regenerationCases.filter((entry) => entry.targets.includes('.vscode/tasks.json')).length, 2);
    checks++;

    const overwrite: WorkbenchPromptContainer = {
      kind: 'dialog',
      text: regenerationOverwriteMessage,
      buttons: [{ text: 'Yes', point: { x: 30, y: 40 } }],
      rows: [],
    };
    assert.strictEqual(selectRegenerationOverwriteYes([prompt]).visible, false);
    assert.strictEqual(selectRegenerationOverwriteYes([{ ...overwrite, kind: 'notification' }]).visible, false);
    assert.strictEqual(selectRegenerationOverwriteYes([{ ...overwrite, text: 'Overwrite unrelated files?' }]).visible, false);
    assert.throws(() => selectRegenerationOverwriteYes([overwrite, overwrite]), /Ambiguous/);
    const sequenceClock = fakeClock();
    const clicks: Array<{ x: number; y: number }> = [];
    const captures: string[] = [];
    const sequenceOptions = {
      appDir,
      phase: regenerationDeadline('two-real-prompts', 0),
      clock: sequenceClock,
      read: async (): Promise<RegenerationPromptObservation> => ({
        ready: true,
        timeOrigin: 1,
        containers: clicks.length === 0 ? [prompt] : [overwrite],
      }),
      filesHealed: () => false,
      assertBeforeOverwrite: () => {
        assert.ok(clicks.length < 2, 'No writes may precede overwrite Yes');
      },
      click: async (point: { x: number; y: number }) => {
        clicks.push(point);
      },
      capture: async (kind: 'initialize' | 'overwrite') => {
        captures.push(kind);
      },
    };
    assert.deepStrictEqual(await confirmRegenerationPromptSequence(sequenceOptions), { initializationYesCount: 1, overwriteYesCount: 1 });
    assert.deepStrictEqual(
      clicks,
      [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      'Two distinct real controls, never replaying the first Yes'
    );
    assert.deepStrictEqual(captures, ['initialize', 'overwrite']);
    checks++;

    for (const failure of [
      'missing',
      'disabled',
      'wrong-message',
      'navigation',
      'early-write',
      'capture-expiry',
      'input-failure',
      'disappeared',
    ]) {
      const failureClock = fakeClock();
      const inputs: Array<{ x: number; y: number }> = [];
      let overwriteCaptured = false;
      const modal =
        failure === 'disabled'
          ? { ...overwrite, buttons: [{ text: 'Yes' }] }
          : failure === 'wrong-message'
            ? { ...overwrite, text: 'Overwrite unrelated files?' }
            : overwrite;
      await assert.rejects(
        confirmRegenerationPromptSequence({
          ...sequenceOptions,
          clock: failureClock,
          phase: regenerationDeadline(failure, 0),
          read: async () => ({
            ready: true,
            timeOrigin: failure === 'navigation' && inputs.length > 0 ? 2 : 1,
            containers:
              inputs.length === 0 ? [prompt] : failure === 'missing' || (failure === 'disappeared' && overwriteCaptured) ? [] : [modal],
          }),
          assertBeforeOverwrite: () => {
            if (failure === 'early-write' && inputs.length > 0) {
              throw new Error('Files changed before overwrite Yes');
            }
          },
          capture: async (kind) => {
            if (kind === 'overwrite') {
              overwriteCaptured = true;
              if (failure === 'capture-expiry') {
                failureClock.advance(30000);
              }
            }
          },
          click: async (point) => {
            inputs.push(point);
            if (failure === 'input-failure') {
              throw new Error('Uncertain trusted input RPC');
            }
          },
        })
      );
      assert.strictEqual(inputs.length, 1, `${failure} must not replay initialization or fabricate overwrite Yes`);
      assert.deepStrictEqual(inputs[0], { x: 10, y: 20 });
    }
    checks++;

    const target = '.vscode/tasks.json';
    const targetPath = path.join(appDir, target);
    const original = fs.readFileSync(targetPath);
    deleteRegenerationTargets(root, workspaceDir, appDir, [target], baseline);
    assert.strictEqual(fs.existsSync(targetPath), false);
    const deleted = captureRegenerationSnapshot(root, workspaceDir);
    assertRegenerationNonTargets(baseline, deleted, workspaceDir, appDir, [target], false);
    assert.throws(() => assertTemplateContracts(appDir, template), /ENOENT/);
    assert.throws(() => assertRegenerationNonTargets(baseline, deleted, workspaceDir, appDir, [target], true), /must be regenerated/);
    assert.throws(() => deleteRegenerationTargets(root, workspaceDir, appDir, [target], baseline), /Fixture changed before deletion/);
    fs.writeFileSync(targetPath, original);
    assert.deepStrictEqual(captureRegenerationSnapshot(root, workspaceDir), baseline);
    assertRegenerationNonTargets(baseline, baseline, workspaceDir, appDir, [target], true);
    checks++;

    // Unit-owned runtime/profile files exercise provenance and configuration
    // controls only; they are not installed binaries or a native wizard fixture.
    const dependencyRoot = path.join(root, 'admitted-runtime');
    const binaryPaths = ['FuncCoreTools', 'DotNetSDK', 'NodeJs'].map((name) => {
      fs.mkdirSync(path.join(dependencyRoot, name), { recursive: true });
      const file = path.join(dependencyRoot, name, 'unit-binary');
      fs.writeFileSync(file, `unit-only-${name}`);
      return file;
    });
    const sourceSettingsPath = path.join(root, 'creating-profile', 'User', 'settings.json');
    fs.mkdirSync(path.dirname(sourceSettingsPath), { recursive: true });
    const runtimeSettings: Record<string, unknown> = {
      'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': true,
      'azureLogicAppsStandard.autoRuntimeDependenciesPath': dependencyRoot,
      'azureLogicAppsStandard.funcCoreToolsBinaryPath': binaryPaths[0],
      'azureLogicAppsStandard.dotnetBinaryPath': binaryPaths[1],
      'azureLogicAppsStandard.nodeJsBinaryPath': binaryPaths[2],
      'azureLogicAppsStandard.e2eStrictDependencyValidation': true,
      'azureLogicAppsStandard.validateDotNetSDK': false,
      'dotnetAcquisitionExtension.sharedExistingDotnetPath': binaryPaths[1],
      'dotnetAcquisitionExtension.existingDotnetPath': [
        'ms-dotnettools.csharp',
        'ms-dotnettools.csdevkit',
        'ms-azuretools.vscode-azurefunctions',
        'ms-azuretools.vscode-azurelogicapps',
      ].map((extensionId) => ({ extensionId, path: binaryPaths[1] })),
    };
    const writeSource = (settings: Record<string, unknown>) =>
      fs.writeFileSync(sourceSettingsPath, JSON.stringify({ ...settings, 'unit.auth.setting': 'unit-only-not-copied' }));
    writeSource(runtimeSettings);
    fs.mkdirSync(path.join(root, 'creating-profile', 'User', 'globalStorage'));
    fs.writeFileSync(path.join(root, 'creating-profile', 'User', 'globalStorage', 'unit-store'), 'unit-store-sentinel');
    const binding: RegenerationRuntimeBinding = {
      invocation: 'unit-invocation',
      identity: { source: 'unit-source', job: 'unit-job', platform: process.platform },
      startedUtc: new Date(Date.now() - 1000).toISOString(),
      runtimeAdmission: { root: dependencyRoot, sourceSettingsPath },
    };
    const queried: string[] = [];
    const runtimeHandoff = captureRegenerationRuntimeSettings(binding, (key) => {
      queried.push(key);
      return runtimeSettings[key];
    });
    assert.deepStrictEqual(queried, [...regenerationRuntimeSettingKeys]);
    assert.deepStrictEqual(Object.keys(runtimeHandoff.settings).sort(), [...regenerationRuntimeSettingKeys].sort());
    verifyRegenerationRuntimeSettings(runtimeHandoff, binding);
    const freshProfile = path.join(root, 'regular-profile');
    const freshSettingsPath = writeRegenerationRuntimeProfile(freshProfile, runtimeHandoff, binding);
    assertRegenerationRuntimeProfile(freshSettingsPath, runtimeHandoff);
    const freshSettings: Record<string, unknown> = JSON.parse(fs.readFileSync(freshSettingsPath, 'utf8'));
    for (const key of regenerationRuntimeSettingKeys) {
      assert.deepStrictEqual(freshSettings[key], runtimeSettings[key], 'Fresh profile must derive from actual creating-host configuration');
    }
    assert.strictEqual(freshSettings['unit.auth.setting'], undefined);
    assert.strictEqual(
      fs.existsSync(path.join(freshProfile, 'User', 'globalStorage')),
      false,
      'Never copy original profile/secret storage'
    );
    assert.throws(() => writeRegenerationRuntimeProfile(freshProfile, runtimeHandoff, binding), /fresh/);
    checks++;

    assert.throws(() => assertRegenerationRuntimeRoot(undefined), /explicit admitted/);
    assert.throws(() => captureRegenerationRuntimeSettings(binding, () => undefined), /actual creating-host global configuration/i);
    assert.throws(() => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, invocation: 'stale' }, binding), /Stale/);
    assert.throws(() => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, identity: { job: 'other' } }, binding), /Wrong job/);
    assert.throws(() => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, capturedUtc: '2000-01-01T00:00:00Z' }, binding), /Stale/);
    assert.throws(() => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, root: root }, binding), /same admitted root/);
    const otherSettings = path.join(root, 'other-settings.json');
    fs.copyFileSync(sourceSettingsPath, otherSettings);
    assert.throws(
      () => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, sourceSettingsPath: otherSettings }, binding),
      /actual creating profile/
    );
    assert.throws(
      () => verifyRegenerationRuntimeSettings({ ...runtimeHandoff, allowlistedSettingsSha256: 'stale' }, binding),
      /settings hash/
    );
    writeSource({ ...runtimeSettings, 'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false });
    assert.throws(() => verifyRegenerationRuntimeSettings(runtimeHandoff, binding), /configuration changed/);
    assert.throws(
      () =>
        captureRegenerationRuntimeSettings(binding, (key) =>
          key === 'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation' ? false : runtimeSettings[key]
        ),
      /must stay enabled/
    );
    writeSource(runtimeSettings);
    const binary = binaryPaths[0];
    const originalBinary = fs.readFileSync(binary);
    fs.writeFileSync(binary, 'changed-unit-binary');
    assert.throws(() => verifyRegenerationRuntimeSettings(runtimeHandoff, binding), /binary bytes changed/);
    fs.writeFileSync(binary, originalBinary);
    const outsideBinary = path.join(root, 'outside-binary');
    fs.writeFileSync(outsideBinary, 'unit-only');
    const wrongBinarySettings: Record<string, unknown> = {
      ...runtimeSettings,
      'azureLogicAppsStandard.funcCoreToolsBinaryPath': outsideBinary,
    };
    writeSource(wrongBinarySettings);
    assert.throws(() => captureRegenerationRuntimeSettings(binding, (key) => wrongBinarySettings[key]), /outside its admitted/);
    writeSource(runtimeSettings);
    fs.writeFileSync(freshSettingsPath, JSON.stringify({ ...freshSettings, 'azureLogicAppsStandard.funcCoreToolsBinaryPath': 'func' }));
    assert.throws(() => assertRegenerationRuntimeProfile(freshSettingsPath, runtimeHandoff), /substituted system binaries/);
    const envOnlyProfile = path.join(root, 'env-only', 'settings.json');
    fs.mkdirSync(path.dirname(envOnlyProfile));
    fs.writeFileSync(envOnlyProfile, '{}');
    assert.throws(() => assertRegenerationRuntimeProfile(envOnlyProfile, runtimeHandoff), /explicitly configure/);
    checks++;

    for (const entry of regenerationCases) {
      const originals = entry.targets.map((artifact) => ({ artifact, bytes: fs.readFileSync(path.join(appDir, artifact)) }));
      deleteRegenerationTargets(root, workspaceDir, appDir, entry.targets, baseline);
      assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(root, workspaceDir), workspaceDir, appDir, entry.targets, false);
      for (const originalFile of originals) {
        fs.writeFileSync(path.join(appDir, originalFile.artifact), originalFile.bytes);
      }
      assertTemplateContracts(appDir, template);
      assert.deepStrictEqual(captureRegenerationSnapshot(root, workspaceDir), baseline, 'Every deletion branch must restore exactly');
    }
    for (const rootArtifact of ['host.json', 'local.settings.json'] as const) {
      const absolute = path.join(appDir, rootArtifact);
      const originalBytes = fs.readFileSync(absolute);
      fs.writeFileSync(absolute, '{"wrongTemplate":true}');
      assert.throws(() => assertTemplateContracts(appDir, template), /original wizard-generated JSON contract/);
      fs.writeFileSync(absolute, originalBytes);
    }
    checks++;

    fs.writeFileSync(targetPath, '{"artifact":"incorrect","version":1}');
    assert.throws(() => assertTemplateContracts(appDir, template), /original wizard-generated JSON contract/);
    fs.writeFileSync(targetPath, '{');
    assert.throws(() => assertTemplateContracts(appDir, template), SyntaxError);
    fs.writeFileSync(targetPath, JSON.stringify(template[target], null, 2));
    assertTemplateContracts(appDir, template);
    assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(root, workspaceDir), workspaceDir, appDir, [target], true);
    assert.notDeepStrictEqual(
      captureRegenerationSnapshot(root, workspaceDir),
      baseline,
      'Fresh-reopen byte oracle must detect target rewrites'
    );
    fs.writeFileSync(targetPath, original);
    checks++;

    const workflowPath = path.join(workflowDir, 'workflow.json');
    fs.writeFileSync(workflowPath, '{ "kind":"Stateful" }');
    assert.throws(
      () => assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(root, workspaceDir), workspaceDir, appDir, [target], true),
      /byte-for-byte unchanged/
    );
    fs.writeFileSync(workflowPath, '{"kind":"Stateful"}');
    const extra = path.join(appDir, 'unexpected.json');
    fs.writeFileSync(extra, '{}');
    assert.throws(
      () => assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(root, workspaceDir), workspaceDir, appDir, [target], true),
      /byte-for-byte unchanged/
    );
    fs.unlinkSync(extra);
    fs.mkdirSync(path.join(appDir, 'unexpected'));
    assert.throws(
      () => assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(root, workspaceDir), workspaceDir, appDir, [target], true),
      /directory entries/
    );
    fs.rmdirSync(path.join(appDir, 'unexpected'));
    checks++;

    assert.throws(() => deleteRegenerationTargets(root, workspaceDir, appDir, [], baseline), /nonempty and unique/);
    assert.throws(() => deleteRegenerationTargets(root, workspaceDir, appDir, [target, target], baseline), /nonempty and unique/);
    assert.throws(() => assertOwnedRegenerationPath(root, os.tmpdir()), /inside the wizard root/);
    assert.throws(() => assertOwnedRegenerationPath(root, root), /inside the wizard root/);
    assert.throws(() => assertOwnedRegenerationPath(root, 'relative'), /absolute owned fixture paths/);
    const link = path.join(root, 'linked-workspace');
    fs.symlinkSync(workspaceDir, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => captureRegenerationSnapshot(root, link), /traverse links/);
    fs.unlinkSync(link);
    checks++;

    const phase = regenerationDeadline('unit', 100);
    assert.strictEqual(phase.deadline, 30100);
    assert.strictEqual(remainingRegenerationBudget(phase, 30099), 1);
    assert.throws(() => remainingRegenerationBudget(phase, 30100), /cannot be reset/);
    checks++;

    assert.deepStrictEqual(selectRegenerationYes([prompt], appDir).point, { x: 10, y: 20 });
    assert.strictEqual(selectRegenerationYes([initializationPrompt(`${appDir}-other`)], appDir).visible, false);
    // The text contains the actual complete path; an unrelated app without that
    // path, outdated-files prompt, or unrelated Yes must never be selected.
    assert.strictEqual(selectRegenerationYes([initializationPrompt(path.join(root, 'other'))], appDir).visible, false);
    assert.strictEqual(
      selectRegenerationYes(
        [{ ...prompt, text: `Detected out of date .vscode configuration files for Logic App project "${appDir}". Regenerate?` }],
        appDir
      ).visible,
      false
    );
    assert.strictEqual(
      selectRegenerationYes([{ ...prompt, buttons: [{ text: "Don't warn again", point: { x: 10, y: 20 } }] }], appDir).point,
      undefined
    );
    assert.throws(() => selectRegenerationYes([prompt, prompt], appDir), /Ambiguous/);
    checks++;

    for (const [healed, expected] of [
      [false, /was absent before the original deadline/],
      [true, /files healed silently/],
    ] as const) {
      const clock = fakeClock();
      const empty: RegenerationPromptObservation = { containers: [], ready: true, timeOrigin: 1 };
      await assert.rejects(
        requireRegenerationYes(
          async () => empty,
          appDir,
          regenerationDeadline('missing', 0),
          () => healed,
          clock
        ),
        expected
      );
      assert.strictEqual(clock.now(), 30000, 'Silent healing must not create a fresh deadline or fake Yes');
      checks++;
    }
    const clock = fakeClock();
    const observed: RegenerationPromptObservation = { containers: [prompt], ready: true, timeOrigin: 1 };
    const selected = await requireRegenerationYes(
      async () => observed,
      appDir,
      regenerationDeadline('real', 0),
      () => false,
      clock
    );
    assert.deepStrictEqual(selected.point, { x: 10, y: 20 });
    let readinessReads = 0;
    const readinessClock = fakeClock();
    const readySelection = await requireRegenerationYes(
      async () => ({ ...observed, ready: ++readinessReads > 1 }),
      appDir,
      regenerationDeadline('workbench-readiness', 0),
      () => false,
      readinessClock
    );
    assert.deepStrictEqual(readySelection.point, { x: 10, y: 20 });
    assert.strictEqual(readinessReads, 2, 'A visible Yes without the correct ready workspace is not sufficient');
    await assert.rejects(
      requireRegenerationYes(
        async () => ({ ...observed, containers: [{ ...prompt, buttons: [{ text: 'Yes' }] }] }),
        appDir,
        regenerationDeadline('disabled', 0),
        () => false,
        clock
      ),
      /enabled, unobstructed Yes/
    );
    await assert.rejects(
      requireRegenerationYes(
        async () => {
          throw new Error('CDP disconnected');
        },
        appDir,
        regenerationDeadline('transport', 0),
        () => false,
        clock
      ),
      /CDP disconnected/
    );
    const expiredClock = fakeClock();
    await assert.rejects(
      requireRegenerationYes(
        async () => {
          expiredClock.advance(30000);
          return observed;
        },
        appDir,
        regenerationDeadline('late-read', 0),
        () => false,
        expiredClock
      ),
      /deadline expired/
    );
    checks++;

    const success = { observationPassed: true, originalCodeClose: { code: 0, signal: null }, errors: [], cleanup: { verified: true } };
    assertRegenerationComplete(success);
    for (const failure of [
      { ...success, observationPassed: false },
      { ...success, originalCodeClose: null },
      { ...success, originalCodeClose: { code: 1, signal: null } },
      { ...success, errors: ['original failure'] },
      { ...success, cleanup: { verified: false } },
    ]) {
      assert.throws(() => assertRegenerationComplete(failure));
    }
    checks++;

    // Invalid registration combinations must exit before any wizard/Code launch.
    const runner = path.join(__dirname, '..', '..', '..', 'scripts', 'run-e2e-cli.js');
    const invalid = spawnSync(process.execPath, [runner, '--workspace-artifact-regeneration', '--label', 'unitTests'], {
      encoding: 'utf8',
    });
    assert.strictEqual(invalid.status, 1);
    assert.match(invalid.stderr, /do not combine flags/);
    checks++;

    const scriptRoot = path.dirname(runner);
    const batch: {
      SUITE_REGISTRY: Record<string, { id: string; args: string[]; expectedPhases: string[] }>;
      normalizeSuiteSelection(value: string, options: { platform: string }): Array<{ id: string }>;
      createSuiteContext(input: unknown): unknown;
      buildSuiteEnvironment(env: NodeJS.ProcessEnv, context: unknown): NodeJS.ProcessEnv;
    } = require(path.join(scriptRoot, 'e2e-cli-batch.js'));
    const registration = batch.SUITE_REGISTRY.workspaceArtifactRegeneration;
    assert.strictEqual(registration.id, 'workspaceArtifactRegeneration');
    assert.deepStrictEqual(registration.args, ['--workspace-artifact-regeneration']);
    assert.deepStrictEqual(
      registration.expectedPhases,
      regenerationPhaseIds,
      'Registered phases must exactly match the real host sequence'
    );
    assert.strictEqual(regenerationPhaseIds.length, 14, 'Wizard create, baseline, six regeneration and six reopen phases');
    for (const platform of ['win32', 'linux']) {
      assert.deepStrictEqual(
        batch.normalizeSuiteSelection('workspaceArtifactRegeneration', { platform }).map((suite) => suite.id),
        ['workspaceArtifactRegeneration']
      );
      const canonical = batch.normalizeSuiteSelection(platform === 'win32' ? 'windows' : 'linux', { platform });
      assert.strictEqual(canonical.length, 6, 'Explicit new suite must not inflate canonical aliases');
      assert.ok(canonical.every((suite) => suite.id !== 'workspaceArtifactRegeneration'));
    }
    checks++;

    const contaminated = {
      LA_E2E_CLI_REQUIRE_WORKSPACE_REGENERATION: '1',
      LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR: path.join(root, 'wrong-suite'),
    };
    const otherContext = batch.createSuiteContext({
      batchRoot: root,
      suite: batch.SUITE_REGISTRY.unitTests,
      index: 0,
      total: 1,
    });
    const otherEnv = batch.buildSuiteEnvironment(contaminated, otherContext);
    assert.strictEqual(
      otherEnv.LA_E2E_CLI_REQUIRE_WORKSPACE_REGENERATION,
      undefined,
      'Regeneration control must not bleed to another suite'
    );
    assert.strictEqual(otherEnv.LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR, undefined);
    const ownContext = batch.createSuiteContext({ batchRoot: root, suite: registration, index: 0, total: 1 });
    const ownEnv = batch.buildSuiteEnvironment(contaminated, ownContext);
    assert.strictEqual(
      ownEnv.LA_E2E_CLI_REQUIRE_WORKSPACE_REGENERATION,
      undefined,
      'Only the registered family route enables its supplement'
    );
    assert.ok(ownEnv.LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR?.startsWith(root));
    assert.notStrictEqual(ownEnv.LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR, contaminated.LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR);
    checks++;

    const reporting: {
      _test: {
        getDirectSuiteComplete(label: string, phases: unknown[]): boolean;
        writeSuiteFinalEvidence(input: unknown): void;
        writeSuitePhaseResult(env: NodeJS.ProcessEnv, phase: unknown): void;
        publishRegenerationStageEvidence(context: unknown, result: unknown, phases: unknown[], cleanup: unknown): unknown;
        assertRegenerationStageEvidence(root: string, identity: Record<string, string>): unknown;
        getDirectRegenerationEvidencePaths(): { terminalResultPath: string; cleanupLedgerPath: string };
        beginDirectRegenerationEvidence(context: unknown, paths: unknown): void;
        writeDirectRegenerationEvidence(context: unknown, terminal: unknown, cleanup: unknown, paths: unknown): void;
      };
    } = require(runner);
    // These are modeled reporting controls, not actual Code observations or
    // accepted native fixtures. The GUI driver alone supplies these fields natively.
    const protocolInput = {
      wizard: { code: 0, signal: null, verified: true, mochaPassingCount: 1 },
      hosts: regenerationPhaseIds.slice(1).map((phaseId) => ({
        phase: phaseId.slice('workspaceArtifactRegeneration:'.length),
        close: { code: 0, signal: null },
        observationPassed: true,
        errors: [],
      })),
      complete: true,
      cleanupVerified: true,
      errors: [],
    };
    const protocolPhases = buildRegenerationPhaseResults(protocolInput);
    assert.deepStrictEqual(
      protocolPhases.map((phase) => phase.phaseId),
      regenerationPhaseIds
    );
    assert.strictEqual(
      protocolPhases.reduce((count, phase) => count + phase.mochaPassingCount, 0),
      1
    );
    assert.strictEqual(reporting._test.getDirectSuiteComplete(registration.id, protocolPhases), true);
    for (const partial of [
      protocolPhases.slice(0, 1),
      protocolPhases.slice(0, -1),
      [...protocolPhases].reverse(),
      [...protocolPhases, protocolPhases[0]],
      [...protocolPhases, { ...protocolPhases[0], phaseId: 'workspaceArtifactRegeneration:invented-bootstrap' }],
      buildRegenerationPhaseResults({ ...protocolInput, complete: false }),
      buildRegenerationPhaseResults({ ...protocolInput, cleanupVerified: false }),
      buildRegenerationPhaseResults({ ...protocolInput, wizard: { ...protocolInput.wizard, verified: false } }),
      buildRegenerationPhaseResults({ ...protocolInput, wizard: { ...protocolInput.wizard, mochaPassingCount: 0 } }),
      buildRegenerationPhaseResults({
        ...protocolInput,
        hosts: protocolInput.hosts.map((host, index) => (index === 0 ? { ...host, observationPassed: false } : host)),
      }),
      buildRegenerationPhaseResults({
        ...protocolInput,
        hosts: protocolInput.hosts.map((host, index) => (index === 0 ? { ...host, close: null } : host)),
      }),
    ]) {
      assert.strictEqual(reporting._test.getDirectSuiteComplete(registration.id, partial), false, 'Missing/failed phases cannot pass');
    }
    checks++;

    const reportRoot = path.join(root, 'phase-reporting');
    fs.mkdirSync(reportRoot);
    const context = {
      expectedPhaseIds: regenerationPhaseIds,
      phaseResultsPath: path.join(reportRoot, 'phase-results.jsonl'),
      cleanupLedgerPath: path.join(reportRoot, 'cleanup.json'),
      terminalResultPath: path.join(reportRoot, 'terminal.json'),
    };
    for (const [phases, expectedComplete] of [
      [protocolPhases, true],
      [protocolPhases.slice(0, 1), false],
      [[...protocolPhases].reverse(), false],
      [[...protocolPhases, protocolPhases[0]], false],
      [protocolPhases.map((phase, index) => (index === 1 ? { ...phase, complete: false } : phase)), false],
    ] as const) {
      fs.writeFileSync(context.phaseResultsPath, `${phases.map((phase) => JSON.stringify(phase)).join('\n')}\n`);
      reporting._test.writeSuiteFinalEvidence({
        context,
        suite: registration,
        exitCode: 0,
        signal: null,
        processCleanup: { verified: true },
      });
      const terminal: { complete: boolean; expectedPhaseIds: string[]; observedPhaseIds: string[] } = JSON.parse(
        fs.readFileSync(context.terminalResultPath, 'utf8')
      );
      assert.strictEqual(terminal.complete, expectedComplete);
      assert.deepStrictEqual(terminal.expectedPhaseIds, regenerationPhaseIds);
      assert.deepStrictEqual(
        terminal.observedPhaseIds,
        phases.map((phase) => phase.phaseId)
      );
    }
    const directEnv = {
      LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: path.join(reportRoot, 'direct-terminal.json'),
      LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: path.join(reportRoot, 'direct-cleanup.json'),
    };
    for (const phase of protocolPhases) {
      reporting._test.writeSuitePhaseResult(directEnv, { ...phase, cleanupLedger: { verified: true } });
    }
    const direct: { complete: boolean; lifecycleFinalized: boolean; mochaPassingCount: number; phaseResults: Array<{ phaseId: string }> } =
      JSON.parse(fs.readFileSync(directEnv.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH, 'utf8'));
    assert.strictEqual(direct.complete, true);
    assert.strictEqual(direct.lifecycleFinalized, true);
    assert.strictEqual(direct.mochaPassingCount, 1, 'Regular workbench phases must not become fabricated Mocha counts');
    assert.deepStrictEqual(
      direct.phaseResults.map((phase) => phase.phaseId),
      regenerationPhaseIds
    );
    checks++;

    // Archive protocol models only: synthetic PNG headers/receipts below are
    // never native fixture/evidence claims. No Code, CDP or runtime is launched.
    const stageRoot = path.join(root, 'archive-protocol-model');
    fs.mkdirSync(path.join(stageRoot, 'screenshots'), { recursive: true });
    const stageContext = {
      ...binding,
      root: stageRoot,
      workspaceParent: path.join(root, 'removed-wizard-model'),
      resultPath: path.join(stageRoot, 'final-result.json'),
    };
    const launch = { version: 'unit-only', sha256: 'a'.repeat(64) };
    fs.writeFileSync(path.join(stageRoot, 'invocation.json'), JSON.stringify(stageContext));
    fs.writeFileSync(
      path.join(stageRoot, 'wizard-handoff.json'),
      JSON.stringify({
        schemaVersion: 1,
        invocation: binding.invocation,
        identity: binding.identity,
        launch,
        runtimeSettings: runtimeHandoff,
      })
    );
    const modelNames = regenerationCases.map((entry) => entry.name);
    const stageResult = {
      schemaVersion: 1,
      invocation: binding.invocation,
      identity: binding.identity,
      complete: true,
      code: launch,
      errors: [],
      hosts: protocolInput.hosts,
      observations: modelNames.map((name) => ({
        name,
        realYesMouseInput: true,
        realOverwriteYesMouseInput: true,
        initializationYesCount: 1,
        overwriteYesCount: 1,
        freshReopen: true,
      })),
    };
    const ownedCleanup = { verified: true, action: 'removed', workspaceParent: stageContext.workspaceParent };
    for (const host of protocolInput.hosts) {
      fs.writeFileSync(path.join(stageRoot, `${host.phase}-code.log`), 'unit-only Authorization: Bearer unit-secret\n');
      const logDir = path.join(stageRoot, 'vscode-logs', 'unit-sanitized', host.phase);
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, 'profile-log-index.md'), `Phase: ${host.phase}\n`);
    }
    const checkpoints = [
      'workspace-regeneration-baseline',
      ...modelNames.flatMap((name) =>
        ['before-yes', 'before-overwrite-yes', 'after-yes', 'reopened'].map((suffix) => `workspace-regeneration-${name}-${suffix}`)
      ),
    ];
    for (const checkpoint of checkpoints) {
      fs.writeFileSync(path.join(stageRoot, 'screenshots', `${checkpoint}.png`), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
      fs.writeFileSync(
        path.join(stageRoot, 'screenshots', `${checkpoint}.json`),
        JSON.stringify({
          checkpoint,
          classification: 'evidence',
          verdict: 'accepted',
          target: { owner: 'workbench', opaqueTargetId: 'unit-target', opaqueFrameId: 'unit-frame', generation: 1 },
          timing: { samples: 2, captureAttempts: 1 },
          events: [{ name: 'accepted', attempt: 1, generation: 1 }],
        })
      );
    }
    const completeTerminal = reporting._test.publishRegenerationStageEvidence(stageContext, stageResult, protocolPhases, ownedCleanup);
    const canonicalPaths = reporting._test.getDirectRegenerationEvidencePaths();
    assert.strictEqual(path.basename(canonicalPaths.terminalResultPath), 'workspaceArtifactRegeneration.terminal-result.json');
    assert.strictEqual(path.basename(path.dirname(canonicalPaths.terminalResultPath)), 'results');
    assert.strictEqual(path.basename(path.dirname(path.dirname(canonicalPaths.terminalResultPath))), '.vscode-test');
    const modeledDirectPaths = {
      terminalResultPath: path.join(reportRoot, 'canonical-model.terminal-result.json'),
      cleanupLedgerPath: path.join(reportRoot, 'canonical-model.cleanup-ledger.json'),
    };
    reporting._test.writeDirectRegenerationEvidence(stageContext, completeTerminal, ownedCleanup, modeledDirectPaths);
    const requiredTerminal: {
      suiteId: string;
      complete: boolean;
      lifecycleFinalized: boolean;
      exitCode: number | null;
      signal: string | null;
      cleanupVerified: boolean;
      diagnosticsError: string;
      phaseCompleteness: boolean;
      expectedPhaseIds: string[];
      observedPhaseIds: string[];
      missingPhaseIds: string[];
      unexpectedPhaseIds: string[];
      duplicatePhaseIds: string[];
      blockedPhaseIds: string[];
      phaseResults: unknown[];
    } = JSON.parse(fs.readFileSync(modeledDirectPaths.terminalResultPath, 'utf8'));
    assert.strictEqual(requiredTerminal.suiteId, 'workspaceArtifactRegeneration');
    assert.strictEqual(requiredTerminal.complete, true);
    assert.strictEqual(requiredTerminal.lifecycleFinalized, true);
    assert.strictEqual(requiredTerminal.exitCode, 0);
    assert.strictEqual(requiredTerminal.signal, null);
    assert.strictEqual(requiredTerminal.cleanupVerified, true);
    assert.strictEqual(requiredTerminal.diagnosticsError, '');
    assert.strictEqual(requiredTerminal.phaseCompleteness, true);
    assert.deepStrictEqual(requiredTerminal.expectedPhaseIds, regenerationPhaseIds);
    assert.deepStrictEqual(requiredTerminal.observedPhaseIds, regenerationPhaseIds);
    for (const name of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds'] as const) {
      assert.deepStrictEqual(requiredTerminal[name], []);
    }
    assert.strictEqual(requiredTerminal.phaseResults.length, 14);
    // Reset a previous green before any creating-host admission/launch can fail.
    reporting._test.beginDirectRegenerationEvidence({ ...stageContext, invocation: 'new-scope' }, modeledDirectPaths);
    const pending: { complete: boolean; lifecycleFinalized: boolean; invocation: string } = JSON.parse(
      fs.readFileSync(modeledDirectPaths.terminalResultPath, 'utf8')
    );
    assert.strictEqual(pending.complete, false);
    assert.strictEqual(pending.lifecycleFinalized, false);
    assert.strictEqual(pending.invocation, 'new-scope');
    assert.throws(() =>
      reporting._test.writeDirectRegenerationEvidence(
        stageContext,
        completeTerminal,
        { ...ownedCleanup, verified: false },
        modeledDirectPaths
      )
    );
    assert.throws(() =>
      reporting._test.writeDirectRegenerationEvidence(
        stageContext,
        { ...requiredTerminal, invocation: 'stale' },
        ownedCleanup,
        modeledDirectPaths
      )
    );
    const incomplete = reporting._test.publishRegenerationStageEvidence(
      stageContext,
      stageResult,
      protocolPhases.slice(0, 1),
      ownedCleanup
    );
    reporting._test.writeDirectRegenerationEvidence(stageContext, incomplete, ownedCleanup, modeledDirectPaths);
    const failedCanonical: { complete: boolean; phaseCompleteness: boolean; diagnosticsError: string; missingPhaseIds: string[] } =
      JSON.parse(fs.readFileSync(modeledDirectPaths.terminalResultPath, 'utf8'));
    assert.strictEqual(failedCanonical.complete, false);
    assert.strictEqual(failedCanonical.phaseCompleteness, false);
    assert.ok(failedCanonical.diagnosticsError);
    assert.strictEqual(failedCanonical.missingPhaseIds.length, 13, 'A passing wizard is not a finalized lifecycle');
    reporting._test.publishRegenerationStageEvidence(stageContext, stageResult, protocolPhases, ownedCleanup);
    checks++;
    assert.ok(
      !fs.readFileSync(path.join(stageRoot, 'code.log'), 'utf8').includes('unit-secret'),
      'Only sanitized code.log may be archived'
    );
    assert.ok(fs.readFileSync(path.join(stageRoot, 'code.log'), 'utf8').includes('<redacted>'));
    // Stage validation must work from the archive alone, without the original
    // raw profiles or runtime caches, even if consumer phase paths were set.
    fs.renameSync(dependencyRoot, `${dependencyRoot}-not-archived`);
    fs.renameSync(path.dirname(sourceSettingsPath), `${path.dirname(sourceSettingsPath)}-not-archived`);
    try {
      reporting._test.assertRegenerationStageEvidence(stageRoot, binding.identity);
    } finally {
      fs.renameSync(`${dependencyRoot}-not-archived`, dependencyRoot);
      fs.renameSync(`${path.dirname(sourceSettingsPath)}-not-archived`, path.dirname(sourceSettingsPath));
    }
    assert.throws(
      () => reporting._test.assertRegenerationStageEvidence(stageRoot, { ...binding.identity, job: 'wrong' }),
      /Wrong current job/
    );
    for (const phases of [protocolPhases.slice(0, 1), protocolPhases.slice(0, -1), [...protocolPhases].reverse()]) {
      reporting._test.publishRegenerationStageEvidence(stageContext, stageResult, phases, ownedCleanup);
      assert.throws(() => reporting._test.assertRegenerationStageEvidence(stageRoot, binding.identity));
    }
    reporting._test.publishRegenerationStageEvidence(stageContext, stageResult, protocolPhases, {
      ...ownedCleanup,
      verified: false,
      action: 'preserved',
    });
    assert.throws(() => reporting._test.assertRegenerationStageEvidence(stageRoot, binding.identity));
    reporting._test.publishRegenerationStageEvidence(stageContext, stageResult, protocolPhases, ownedCleanup);
    fs.unlinkSync(path.join(stageRoot, 'screenshots', 'workspace-regeneration-vscode-single-before-overwrite-yes.png'));
    assert.throws(() => reporting._test.assertRegenerationStageEvidence(stageRoot, binding.identity), /ENOENT/);
    checks++;
    console.log(`[workspace-regeneration-unit] ${checks} focused contract groups passed; no VS Code/runtime/native coverage claimed.`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function initializationPrompt(appDir: string): WorkbenchPromptContainer {
  return {
    kind: 'notification',
    text: `Detected an Azure Logic App project "${appDir}" that may have been created outside of VS Code or is missing configuration files. Initialize for optimal use with VS Code?`,
    buttons: [{ text: 'Yes', point: { x: 10, y: 20 } }],
    rows: [],
  };
}

function fakeClock() {
  let now = 0;
  return {
    now: () => now,
    advance: (elapsedMs: number) => {
      now += elapsedMs;
    },
    poll: async (remainingMs: number) => {
      now += Math.min(1000, remainingMs);
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
