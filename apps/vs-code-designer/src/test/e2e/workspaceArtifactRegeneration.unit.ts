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
  captureRegenerationSnapshot,
  captureTemplateContracts,
  deleteRegenerationTargets,
  regenerationArtifacts,
  regenerationCases,
  regenerationDeadline,
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
