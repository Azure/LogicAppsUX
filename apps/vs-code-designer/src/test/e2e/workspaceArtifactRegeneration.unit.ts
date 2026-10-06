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
  deleteRegenerationTargets,
  regenerationArtifacts,
  regenerationCases,
  regenerationDeadline,
  regenerationPhaseIds,
  remainingRegenerationBudget,
  requireRegenerationYes,
  selectRegenerationYes,
  type RegenerationPromptObservation,
} from './workspaceArtifactRegeneration';
import type { WorkbenchPromptContainer } from './workbenchPromptSelection';

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-unit-'));
  let checks = 0;
  try {
    // Unit-owned files prove only the test oracle/negative controls. Native
    // fixtures must still come from the real registered CLI wizard/handoff.
    const workspaceDir = path.join(root, 'workspace');
    const appDir = path.join(workspaceDir, 'app');
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

    const prompt = initializationPrompt(appDir);
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
