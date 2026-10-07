/**
 * Regular-workbench supplement to the official CLI wizard host.
 * Registered by run-e2e-cli.js --workspace-artifact-regeneration, not standalone
 * Mocha or an extension-host dialog mock. Each reopen uses the creating host's
 * admitted Code executable, prepared extensions, and original .code-workspace.
 */
import * as assert from 'assert';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { type CdpConnection, connectToVsCodeWorkbenchCdp } from './cdpClient';
import { clickPoint, type CdpEvaluator } from './cdpFormHelpers';
import {
  assertRegenerationComplete,
  assertRegenerationNonTargets,
  assertTemplateContracts,
  buildRegenerationPhaseResults,
  captureRegenerationSnapshot,
  captureTemplateContracts,
  confirmRegenerationPromptSequence,
  deleteRegenerationTargets,
  regenerationCases,
  regenerationDeadline,
  regenerationPhaseIds,
  remainingRegenerationBudget,
  selectRegenerationOverwriteYes,
  selectRegenerationYes,
  type RegenerationDeadline,
  type RegenerationHostPhase,
  type RegenerationPromptObservation,
  type RegenerationSnapshot,
} from './workspaceArtifactRegeneration';
import { captureRequiredCancelScreenshot, closeWorkspacePromptCancelWindow } from './workspacePromptCancel';
import {
  assertRegenerationRuntimeProfile,
  verifyRegenerationRuntimeSettings,
  writeRegenerationRuntimeProfile,
  type RegenerationRuntimeBinding,
  type RegenerationRuntimeHandoff,
} from './workspaceArtifactRegenerationRuntime';

interface RegenerationContext extends RegenerationRuntimeBinding {
  workspaceParent: string;
  root: string;
  resultPath: string;
}

interface RegenerationHandoff {
  workspace: { appDir: string; workspaceFilePath: string; workflowJsonPath: string };
  launch: { executable: string; sha256: string; version: string; extensionsDir: string };
  runtimeSettings: RegenerationRuntimeHandoff;
}

export { buildRegenerationPhaseResults };

export interface RegenerationResult {
  schemaVersion: 1;
  suiteId: 'workspaceArtifactRegeneration';
  scenario: 'workspace-artifact-regeneration';
  invocation: string;
  identity: Record<string, string>;
  code: { version: string; sha256: string };
  observationPassed: boolean;
  originalCodeClose: RegenerationHostPhase['close'];
  hosts: RegenerationHostPhase[];
  observations: Array<{
    name: string;
    targets: readonly string[];
    realYesMouseInput: true;
    realOverwriteYesMouseInput: true;
    initializationYesCount: number;
    overwriteYesCount: number;
    before: RegenerationSnapshot;
    after: RegenerationSnapshot;
    freshReopen: true;
  }>;
  plannedCases: string[];
  errors: string[];
  cleanup?: { verified: boolean };
  complete: boolean;
}

function boundedConnection(cdp: CdpConnection, phase: RegenerationDeadline) {
  return {
    targetId: cdp.targetId,
    targetUrl: cdp.targetUrl,
    targetTitle: cdp.targetTitle,
    get contextGeneration() {
      return cdp.contextGeneration;
    },
    getExecutionContextIds: () => cdp.getExecutionContextIds(),
    getExecutionContextFrameId: (contextId: number) => cdp.getExecutionContextFrameId(contextId),
    evaluate: <T>(contextId: number | undefined, expression: string, options?: { timeoutMs?: number }) =>
      cdp.evaluate<T>(contextId, expression, {
        timeoutMs: Math.min(options?.timeoutMs ?? 1500, remainingRegenerationBudget(phase)),
      }),
    send: (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) =>
      cdp.send(method, params, { timeoutMs: Math.min(options?.timeoutMs ?? 1500, remainingRegenerationBudget(phase)) }),
  };
}

async function readRegenerationWorkbench(cdp: CdpEvaluator, workspaceFile: string, appDir: string): Promise<RegenerationPromptObservation> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) { return false; }
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const text = (element) => (element.innerText || element.textContent || '').replace(/\\s+/g, ' ').trim();
      const containers = Array.from(document.querySelectorAll('.monaco-dialog-box, .notification-toast, .notification-list-item'))
        .filter(visible).map((container) => ({
          kind: container.matches('.monaco-dialog-box') ? 'dialog' : 'notification',
          text: text(container), rows: [],
          buttons: Array.from(container.querySelectorAll('button, a.monaco-button, .monaco-text-button')).filter(visible).map((button) => {
            const rect = button.getBoundingClientRect();
            const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            const hit = document.elementFromPoint(point.x, point.y);
            const enabled = !button.hasAttribute('disabled') && button.getAttribute('aria-disabled') !== 'true';
            return { text: text(button), ...(enabled && hit && (hit === button || button.contains(hit)) ? { point } : {}) };
          })
        }));
      if (containers.some((container) => /DialogService:.*refused to show dialog/i.test(container.text))) {
        throw new Error('Stock Code refused a required regeneration dialog');
      }
      const folders = Array.from(document.querySelectorAll(
        '.explorer-folders-view .monaco-list-row[aria-level="1"] .label-name, .explorer-viewlet .pane-header .title'
      )).filter(visible).map(text);
      const ready = document.readyState === 'complete' && Array.from(document.querySelectorAll('.monaco-workbench')).some(visible) &&
        document.title.toLowerCase().includes(${JSON.stringify(path.basename(workspaceFile, '.code-workspace').toLowerCase())}) &&
        folders.some((name) => name.toLowerCase() === ${JSON.stringify(path.basename(appDir).toLowerCase())});
      return { containers, ready, timeOrigin: performance.timeOrigin };
    })()`
  );
}

async function poll(phase: RegenerationDeadline): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.min(100, remainingRegenerationBudget(phase))));
}

async function waitForStableFiles(
  cdp: CdpEvaluator,
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  phase: RegenerationDeadline,
  check: (snapshot: RegenerationSnapshot) => void,
  settleMs: number
): Promise<RegenerationSnapshot> {
  let previous: string | undefined;
  let stableSince: number | undefined;
  let timeOrigin: number | undefined;
  const { appDir, workspaceFilePath } = handoff.workspace;
  while (Date.now() < phase.deadline) {
    const view = await readRegenerationWorkbench(cdp, workspaceFilePath, appDir);
    remainingRegenerationBudget(phase);
    if (view.ready) {
      timeOrigin ??= view.timeOrigin;
      assert.strictEqual(view.timeOrigin, timeOrigin, 'No incidental workbench reload may replace the observed regeneration phase');
      assert.strictEqual(selectRegenerationYes(view.containers, appDir).visible, false, 'Initialization prompt must be dismissed/absent');
      assert.strictEqual(selectRegenerationOverwriteYes(view.containers).visible, false, 'Overwrite confirmation must be dismissed/absent');
      const snapshot = captureRegenerationSnapshot(context.workspaceParent, path.dirname(workspaceFilePath));
      check(snapshot);
      const serialized = JSON.stringify(snapshot);
      if (previous !== serialized) {
        previous = serialized;
        stableSince = Date.now();
      } else if (stableSince !== undefined && Date.now() - stableSince >= settleMs) {
        remainingRegenerationBudget(phase);
        return snapshot;
      }
    }
    await poll(phase);
  }
  throw new Error(`Regeneration ${phase.phase}: generated files/workbench did not settle before the original deadline`);
}

function assertAcceptedScreenshot(root: string, name: string): void {
  const sidecar: { checkpoint?: string; classification?: string; verdict?: string } = JSON.parse(
    fs.readFileSync(path.join(root, 'screenshots', `${name}.json`), 'utf8')
  );
  assert.strictEqual(sidecar.checkpoint, name);
  assert.strictEqual(sidecar.classification, 'evidence');
  assert.strictEqual(sidecar.verdict, 'accepted', 'Regeneration requires accepted workbench evidence, not a diagnostic fallback');
}

async function captureRegenerationEvidence(cdp: CdpConnection, context: RegenerationContext, phase: RegenerationDeadline, name: string) {
  await captureRequiredCancelScreenshot(boundedConnection(cdp, phase), name, phase.deadline);
  remainingRegenerationBudget(phase);
  assertAcceptedScreenshot(context.root, name);
}

async function runFreshRegenerationHost(
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  env: NodeJS.ProcessEnv,
  result: RegenerationResult,
  phaseName: string,
  observe: (cdp: CdpConnection, phase: RegenerationDeadline) => Promise<void>
): Promise<void> {
  const phase = regenerationDeadline(phaseName);
  const host: RegenerationHostPhase = { phase: phaseName, close: null, observationPassed: false, errors: [] };
  result.hosts.push(host);
  result.originalCodeClose = null;
  const profile = path.join(
    env.LA_E2E_CLI_USER_DATA_PARENT || path.dirname(context.root),
    `rg-${createHash('sha256').update(`${context.invocation}/${phaseName}`).digest('hex').slice(0, 8)}`
  );
  assert.ok(!fs.existsSync(profile), 'Every regeneration/reopen requires a fresh regular Code profile');
  if (process.platform === 'linux') {
    assert.ok(
      Buffer.byteLength(path.join(profile, 'main.sock'), 'utf8') < 100,
      'Actual regeneration profile socket path exceeds Linux limit'
    );
  }
  const profileSettingsPath = writeRegenerationRuntimeProfile(profile, handoff.runtimeSettings, context);
  remainingRegenerationBudget(phase);
  const log = fs.createWriteStream(path.join(context.root, `${phaseName}-code.log`), { flags: 'wx' });
  const errors: unknown[] = [];
  log.on('error', (error) => errors.push(error));
  const child = spawn(
    handoff.launch.executable,
    [
      ...(process.platform === 'linux' ? ['--password-store=gnome-libsecret'] : []),
      `--user-data-dir=${profile}`,
      `--extensions-dir=${handoff.launch.extensionsDir}`,
      `--extensionDevelopmentPath=${path.join(__dirname, '..', '..', '..', 'dist')}`,
      '--disable-workspace-trust',
      '--disable-updates',
      '--disable-restore-windows',
      '--disable-gpu',
      '--enable-smoke-test-driver',
      '--skip-welcome',
      '--skip-release-notes',
      '--locale=en-US',
      '--new-window',
      '--window-size=1920,1080',
      `--remote-debugging-port=${env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT || '9514'}`,
      '--remote-debugging-address=127.0.0.1',
      handoff.workspace.workspaceFilePath,
    ],
    {
      env: {
        ...env,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
        VSCODE_RUNNING_TESTS: '1',
        DEBUGTELEMETRY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const completion = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      host.close = { code, signal };
      result.originalCodeClose = host.close;
      resolve();
    });
  });
  // Attach a handler immediately; a launch failure must not become an unhandled rejection.
  completion.catch((error) => errors.push(error));
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (data: Buffer) => log.write(data));
  }
  let cdp: CdpConnection | undefined;
  let observed = false;
  try {
    cdp = await connectToVsCodeWorkbenchCdp({
      activate: false,
      waitForServer: true,
      timeoutMs: Math.min(15000, remainingRegenerationBudget(phase)),
    });
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    await Promise.race([
      observe(cdp, phase),
      completion.then(() => {
        throw new Error('Regular Code closed before the regeneration observation finished');
      }),
    ]);
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    remainingRegenerationBudget(phase);
    observed = true;
    host.observationPassed = true;
  } catch (error) {
    errors.push(error);
  } finally {
    cdp?.dispose();
    if (!host.close) {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          (async () => {
            await closeWorkspacePromptCancelWindow(!observed);
            await completion;
          })(),
          new Promise<void>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('Ordinary Code Close Window was not confirmed; retain the wizard fixture')), 10000);
          }),
        ]);
      } catch (error) {
        errors.push(error);
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      await new Promise<void>((resolve, reject) => {
        log.once('error', reject);
        log.end(resolve);
      });
    } catch (error) {
      errors.push(error);
    }
    // Keep the actual profile for the existing runner's sanitized diagnostic collector.
    console.log(`[workspace-regeneration] ${JSON.stringify({ phase: phaseName, profile, close: host.close })}`);
    fs.writeFileSync(path.join(context.root, `${phaseName}-profile.json`), `${JSON.stringify({ profile, phase: phaseName })}\n`);
  }
  if (host.close?.code !== 0 || host.close.signal !== null) {
    errors.push(new Error(`Regeneration ${phaseName}: ordinary Code exit 0/null is required`));
  }
  try {
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    verifyRegenerationRuntimeSettings(handoff.runtimeSettings, context);
  } catch (error) {
    errors.push(error);
  }
  host.errors = errors.map(String);
  if (errors.length > 0) {
    throw new AggregateError(errors, `Regeneration ${phaseName} failed: ${errors.map(String).join('; ')}`);
  }
}

export async function runWorkspaceArtifactRegeneration(
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  env: NodeJS.ProcessEnv
): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    scenario: 'workspace-artifact-regeneration',
    invocation: context.invocation,
    identity: context.identity,
    code: { version: handoff.launch.version, sha256: handoff.launch.sha256 },
    observationPassed: false,
    originalCodeClose: null,
    hosts: [],
    observations: [],
    plannedCases: regenerationCases.map((entry) => entry.name),
    errors: [],
    complete: false,
  };
  const { appDir, workspaceFilePath } = handoff.workspace;
  verifyRegenerationRuntimeSettings(handoff.runtimeSettings, context);
  const workspaceDir = path.dirname(workspaceFilePath);
  const template = captureTemplateContracts(appDir);
  const wizardSnapshot = captureRegenerationSnapshot(context.workspaceParent, workspaceDir);
  let baseline: RegenerationSnapshot | undefined;
  try {
    await runFreshRegenerationHost(context, handoff, env, result, 'baseline', async (cdp, phase) => {
      baseline = await waitForStableFiles(
        boundedConnection(cdp, phase),
        context,
        handoff,
        phase,
        (snapshot) => {
          assertTemplateContracts(appDir, template);
          for (const [name, hash] of Object.entries(wizardSnapshot.files)) {
            assert.strictEqual(snapshot.files[name], hash, 'Opening the valid wizard project must preserve original generated file bytes');
          }
        },
        1500
      );
      await captureRegenerationEvidence(cdp, context, phase, 'workspace-regeneration-baseline');
    });
    assert.ok(baseline, 'A real fresh-reopen baseline is required before deletion');
    // The initial ordinary activation may add its own design-time directory. It is
    // now part of the exact invariant; no files/directories are excluded thereafter.
    assert.deepStrictEqual(
      captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
      baseline,
      'Baseline-host closure must not silently replace the captured invariant'
    );
    for (const entry of regenerationCases) {
      const before = baseline;
      deleteRegenerationTargets(context.workspaceParent, workspaceDir, appDir, entry.targets, before);
      let after: RegenerationSnapshot | undefined;
      let prompts: { initializationYesCount: number; overwriteYesCount: number } | undefined;
      await runFreshRegenerationHost(context, handoff, env, result, entry.name, async (cdp, phase) => {
        const bounded = boundedConnection(cdp, phase);
        const read = () => readRegenerationWorkbench(bounded, workspaceFilePath, appDir);
        const healed = () => entry.targets.every((target) => fs.existsSync(path.join(appDir, target)));
        prompts = await confirmRegenerationPromptSequence({
          read,
          appDir,
          phase,
          filesHealed: healed,
          assertBeforeOverwrite: () =>
            assertRegenerationNonTargets(
              before,
              captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
              workspaceDir,
              appDir,
              entry.targets,
              false
            ),
          capture: (kind) =>
            captureRegenerationEvidence(
              cdp,
              context,
              phase,
              `workspace-regeneration-${entry.name}-${kind === 'initialize' ? 'before-yes' : 'before-overwrite-yes'}`
            ),
          click: (point) => clickPoint(bounded, point),
        });
        // Neither Yes is replayed or substituted with an API response. File writes
        // must follow the distinct real overwrite modal, within this same deadline.
        while (Date.now() < phase.deadline && !healed()) {
          await poll(phase);
        }
        remainingRegenerationBudget(phase);
        after = await waitForStableFiles(
          bounded,
          context,
          handoff,
          phase,
          (snapshot) => {
            assertTemplateContracts(appDir, template);
            assertRegenerationNonTargets(before, snapshot, workspaceDir, appDir, entry.targets, true);
          },
          1500
        );
        await captureRegenerationEvidence(cdp, context, phase, `workspace-regeneration-${entry.name}-after-yes`);
      });
      assert.ok(after, 'Real Yes must produce validated, durably written artifacts');
      assert.ok(
        prompts && prompts.initializationYesCount === 1 && prompts.overwriteYesCount === 1,
        'Exactly one real Yes for each distinct production prompt is required'
      );
      const regenerated = captureRegenerationSnapshot(context.workspaceParent, workspaceDir);
      assert.deepStrictEqual(regenerated, after, 'Ordinary Code closure must not alter the regenerated files');
      await runFreshRegenerationHost(context, handoff, env, result, `${entry.name}-reopen`, async (cdp, phase) => {
        await waitForStableFiles(
          boundedConnection(cdp, phase),
          context,
          handoff,
          phase,
          (snapshot) => {
            assertTemplateContracts(appDir, template);
            assert.deepStrictEqual(snapshot, regenerated, 'Fresh reopen must preserve all target and non-target bytes/entries');
          },
          1500
        );
        await captureRegenerationEvidence(cdp, context, phase, `workspace-regeneration-${entry.name}-reopened`);
      });
      assert.deepStrictEqual(
        captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
        regenerated,
        'Persistence-host closure must leave all files unchanged'
      );
      result.observations.push({
        name: entry.name,
        targets: entry.targets,
        realYesMouseInput: true,
        realOverwriteYesMouseInput: true,
        ...prompts,
        before,
        after: regenerated,
        freshReopen: true,
      });
      baseline = regenerated;
    }
    assert.strictEqual(result.observations.length, regenerationCases.length, 'No branch may fall through to success');
    result.observationPassed = true;
  } catch (error) {
    result.errors.push(String(error));
    console.error(`[workspace-regeneration] ${String(error)}`);
  }
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export function finalizeWorkspaceArtifactRegeneration(
  context: RegenerationContext,
  result: RegenerationResult,
  cleanup: { verified: boolean },
  errors: unknown[]
): void {
  result.cleanup = { verified: cleanup.verified };
  result.errors.push(...errors.map(String));
  result.complete = false;
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
  assertWorkspaceArtifactRegenerationEvidence(context, result);
  assertRegenerationComplete(result);
  result.complete = true;
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
}

export function assertWorkspaceArtifactRegenerationEvidence(
  context: RegenerationContext,
  result: RegenerationResult,
  additionalErrors: unknown[] = []
): void {
  assert.strictEqual(result.observationPassed, true, 'Every required regeneration and fresh-reopen phase must pass');
  assert.deepStrictEqual(result.originalCodeClose, { code: 0, signal: null }, 'Every regular Code host must close ordinarily');
  assert.deepStrictEqual(
    [...result.errors, ...additionalErrors.map(String)],
    [],
    'Required observation, diagnostics and teardown errors must be retained'
  );
  assert.strictEqual(result.observations.length, regenerationCases.length, 'All planned branches must have genuine observations');
  assert.strictEqual(result.hosts.length, 1 + regenerationCases.length * 2, 'Baseline, each real Yes, and each fresh reopen are required');
  assert.deepStrictEqual(
    result.hosts.map((host) => `workspaceArtifactRegeneration:${host.phase}`),
    regenerationPhaseIds.slice(1),
    'Recorded native hosts must match the exact registered order; there is no invented bootstrap'
  );
  for (const host of result.hosts) {
    assert.strictEqual(host.observationPassed, true, 'Every recorded regular Code phase must have its real observation');
    assert.deepStrictEqual(host.errors, [], 'Earlier host observation/teardown errors must remain fatal');
    assert.deepStrictEqual(host.close, { code: 0, signal: null }, 'No failed/unclosed earlier host may be hidden by a later host');
  }
  for (const entry of regenerationCases) {
    assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-before-yes`);
    assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-before-overwrite-yes`);
    assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-after-yes`);
    assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-reopened`);
  }
  for (const observation of result.observations) {
    assert.strictEqual(observation.realOverwriteYesMouseInput, true);
    assert.strictEqual(observation.initializationYesCount, 1);
    assert.strictEqual(observation.overwriteYesCount, 1);
  }
  assertAcceptedScreenshot(context.root, 'workspace-regeneration-baseline');
  const profileLogIndices = walkFiles(path.join(context.root, 'vscode-logs')).filter(
    (file) => path.basename(file) === 'profile-log-index.md'
  );
  for (const phaseId of regenerationPhaseIds.slice(1)) {
    const phase = phaseId.slice('workspaceArtifactRegeneration:'.length);
    assert.ok(
      profileLogIndices.some((file) => fs.readFileSync(file, 'utf8').includes(`Phase: ${phase}\n`)),
      `Required sanitized profile diagnostics are missing for ${phase}`
    );
  }
  for (const host of result.hosts) {
    const codeLog = path.join(context.root, `${host.phase}-code.log`);
    assert.ok(fs.statSync(codeLog).isFile(), `Required Code diagnostics are missing for ${host.phase}`);
  }
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(candidate) : [candidate];
  });
}
