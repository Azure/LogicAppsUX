import * as assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { selectWorkbenchPromptOption, type WorkbenchPromptContainer, type WorkbenchPromptSelection } from './workbenchPromptSelection';

export const regenerationArtifacts = [
  '.vscode/tasks.json',
  '.vscode/launch.json',
  '.vscode/settings.json',
  '.vscode/extensions.json',
  'host.json',
  'local.settings.json',
] as const;

export type RegenerationArtifact = (typeof regenerationArtifacts)[number];
export const regenerationCases: ReadonlyArray<{ name: string; targets: readonly RegenerationArtifact[] }> = [
  { name: 'vscode-single', targets: ['.vscode/tasks.json'] },
  { name: 'vscode-multiple', targets: ['.vscode/launch.json', '.vscode/settings.json', '.vscode/extensions.json'] },
  { name: 'vscode-repeat', targets: ['.vscode/tasks.json'] },
  { name: 'root-single', targets: ['host.json'] },
  { name: 'root-multiple', targets: ['host.json', 'local.settings.json'] },
  { name: 'root-repeat', targets: ['local.settings.json'] },
];

export const regenerationPhaseIds = [
  'workspaceArtifactRegeneration:create',
  'workspaceArtifactRegeneration:baseline',
  ...regenerationCases.flatMap((entry) => [
    `workspaceArtifactRegeneration:${entry.name}`,
    `workspaceArtifactRegeneration:${entry.name}-reopen`,
  ]),
];

export interface RegenerationHostPhase {
  phase: string;
  close: { code: number | null; signal: string | null } | null;
  observationPassed: boolean;
  errors: string[];
}

export function buildRegenerationPhaseResults(input: {
  wizard: { code: number | null; signal: string | null; verified: boolean; mochaPassingCount: number };
  hosts: readonly RegenerationHostPhase[];
  complete: boolean;
  cleanupVerified: boolean;
  errors: readonly string[];
}) {
  const diagnosticsError = input.errors.join('; ');
  const common = {
    label: 'workspaceArtifactRegeneration',
    cleanupVerified: input.cleanupVerified,
    ogfScenarios: [],
  };
  const admitted = input.complete && input.cleanupVerified && !diagnosticsError;
  return [
    {
      ...common,
      phaseId: 'workspaceArtifactRegeneration:create',
      exitCode: input.wizard.code,
      signal: input.wizard.signal,
      diagnosticsError,
      complete:
        admitted && input.wizard.verified && input.wizard.code === 0 && input.wizard.signal === null && input.wizard.mochaPassingCount > 0,
      mochaPassingCount: input.wizard.mochaPassingCount,
    },
    ...input.hosts.map((host) => ({
      ...common,
      phaseId: `workspaceArtifactRegeneration:${host.phase}`,
      exitCode: host.close?.code ?? null,
      signal: host.close?.signal ?? null,
      diagnosticsError: [...input.errors, ...host.errors].join('; '),
      complete: admitted && host.observationPassed && host.close?.code === 0 && host.close.signal === null && host.errors.length === 0,
      // Regular Code observations are not additional Mocha bodies.
      mochaPassingCount: 0,
    })),
  ];
}

export interface RegenerationDeadline {
  phase: string;
  startedAt: number;
  deadline: number;
}

export function regenerationDeadline(phase: string, now = Date.now()): RegenerationDeadline {
  return { phase, startedAt: now, deadline: now + 120000 };
}

export function remainingRegenerationBudget(phase: RegenerationDeadline, now = Date.now()): number {
  const remaining = phase.deadline - now;
  assert.ok(remaining > 0, `Regeneration ${phase.phase} deadline expired; the original phase clock cannot be reset`);
  return remaining;
}

export function assertOwnedRegenerationPath(root: string, candidate: string): void {
  assert.ok(path.isAbsolute(root) && path.isAbsolute(candidate), 'Regeneration requires absolute owned fixture paths');
  const relative = path.relative(root, candidate);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Regeneration path must stay inside the wizard root');
  assert.ok(!fs.lstatSync(root).isSymbolicLink(), 'Wizard root must not be a link');
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Regeneration must not traverse links');
  }
}

export interface RegenerationSnapshot {
  entries: string[];
  files: Record<string, string>;
}

export function captureRegenerationSnapshot(workspaceParent: string, workspaceDir: string): RegenerationSnapshot {
  assertOwnedRegenerationPath(workspaceParent, workspaceDir);
  const entries: string[] = [];
  const files: Record<string, string> = {};
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      assertOwnedRegenerationPath(workspaceParent, absolute);
      const relative = path.relative(workspaceDir, absolute).split(path.sep).join('/');
      assert.ok(entry.isDirectory() || entry.isFile(), 'Only regular wizard files/directories are admitted');
      entries.push(`${entry.isDirectory() ? 'directory' : 'file'}:${relative}`);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        files[relative] = createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
      }
    }
  };
  visit(workspaceDir);
  return { entries: entries.sort(), files };
}

export function captureTemplateContracts(appDir: string): Record<RegenerationArtifact, unknown> {
  return Object.fromEntries(
    regenerationArtifacts.map((artifact) => [artifact, JSON.parse(fs.readFileSync(path.join(appDir, artifact), 'utf8')) as unknown])
  ) as Record<RegenerationArtifact, unknown>;
}

export function assertTemplateContracts(appDir: string, expected: Record<RegenerationArtifact, unknown>): void {
  for (const artifact of regenerationArtifacts) {
    const actual: unknown = JSON.parse(fs.readFileSync(path.join(appDir, artifact), 'utf8'));
    assert.deepStrictEqual(actual, expected[artifact], `${artifact} must equal its original wizard-generated JSON contract`);
  }
}

function targetNames(workspaceDir: string, appDir: string, targets: readonly RegenerationArtifact[]): string[] {
  assert.ok(targets.length > 0 && new Set(targets).size === targets.length, 'Deletion targets must be nonempty and unique');
  assert.ok(
    targets.every((target) => regenerationArtifacts.includes(target)),
    'Only source-required artifacts may be deleted'
  );
  return targets.map((target) => path.relative(workspaceDir, path.join(appDir, target)).split(path.sep).join('/'));
}

export function deleteRegenerationTargets(
  workspaceParent: string,
  workspaceDir: string,
  appDir: string,
  targets: readonly RegenerationArtifact[],
  baseline: RegenerationSnapshot
): void {
  assert.deepStrictEqual(captureRegenerationSnapshot(workspaceParent, workspaceDir), baseline, 'Fixture changed before deletion');
  targetNames(workspaceDir, appDir, targets);
  // Validate the entire set before changing anything. Missing targets are not a successful deletion.
  for (const target of targets) {
    const absolute = path.join(appDir, target);
    assertOwnedRegenerationPath(workspaceParent, absolute);
    assert.ok(fs.lstatSync(absolute).isFile(), 'Deletion target must be an existing regular wizard file');
  }
  for (const target of targets) {
    fs.unlinkSync(path.join(appDir, target));
    assert.ok(!fs.existsSync(path.join(appDir, target)), `${target} must actually be absent before reopening Code`);
  }
  assertRegenerationNonTargets(baseline, captureRegenerationSnapshot(workspaceParent, workspaceDir), workspaceDir, appDir, targets, false);
}

export function assertRegenerationNonTargets(
  before: RegenerationSnapshot,
  after: RegenerationSnapshot,
  workspaceDir: string,
  appDir: string,
  targets: readonly RegenerationArtifact[],
  regenerated: boolean
): void {
  const names = new Set(targetNames(workspaceDir, appDir, targets));
  for (const name of names) {
    assert.ok(before.files[name], `${name} must belong to the original wizard snapshot`);
    assert.strictEqual(Boolean(after.files[name]), regenerated, `${name} must be ${regenerated ? 'regenerated' : 'deleted'}`);
  }
  const withoutTargets = (snapshot: RegenerationSnapshot) =>
    Object.fromEntries(Object.entries(snapshot.files).filter(([name]) => !names.has(name)));
  assert.deepStrictEqual(withoutTargets(after), withoutTargets(before), 'Every non-target file must remain byte-for-byte unchanged');
  const entriesWithoutTargets = (snapshot: RegenerationSnapshot) =>
    snapshot.entries.filter((entry) => !names.has(entry.replace(/^file:/, '')));
  assert.deepStrictEqual(entriesWithoutTargets(after), entriesWithoutTargets(before), 'Non-target directory entries must remain unchanged');
}

export function selectRegenerationYes(containers: WorkbenchPromptContainer[], appDir: string): WorkbenchPromptSelection {
  const matches = containers.filter(
    (container) =>
      container.text.includes(`"${appDir}"`) &&
      /Detected an Azure Logic App project/i.test(container.text) &&
      /Initialize for optimal use with VS Code\?/i.test(container.text)
  );
  assert.ok(matches.length <= 1, 'Ambiguous initialization prompts cannot be credited');
  return selectWorkbenchPromptOption([{ matchText: 'Initialize for optimal use with VS Code?', optionText: 'Yes' }], matches);
}

export const regenerationOverwriteMessage =
  'The .vscode configuration files will be regenerated to match the current project settings. This will overwrite any custom modifications. Continue?';

export function selectRegenerationOverwriteYes(containers: WorkbenchPromptContainer[]): WorkbenchPromptSelection {
  const matches = containers.filter((container) => container.kind === 'dialog' && container.text.includes(regenerationOverwriteMessage));
  assert.ok(matches.length <= 1, 'Ambiguous overwrite confirmations cannot be credited');
  return selectWorkbenchPromptOption([{ matchText: regenerationOverwriteMessage, optionText: 'Yes' }], matches);
}

export interface RegenerationPromptObservation {
  containers: WorkbenchPromptContainer[];
  ready: boolean;
  timeOrigin: number;
}

export async function requireRegenerationYes(
  read: () => Promise<RegenerationPromptObservation>,
  appDir: string,
  phase: RegenerationDeadline,
  filesHealed: () => boolean,
  clock: { now: () => number; poll: (remainingMs: number) => Promise<void> } = {
    now: Date.now,
    poll: async (remainingMs) => new Promise((resolve) => setTimeout(resolve, Math.min(100, remainingMs))),
  }
): Promise<WorkbenchPromptSelection> {
  let silentHealingObserved = false;
  while (clock.now() < phase.deadline) {
    remainingRegenerationBudget(phase, clock.now());
    const observation = await read();
    remainingRegenerationBudget(phase, clock.now());
    silentHealingObserved ||= filesHealed();
    const selection = selectRegenerationYes(observation.containers, appDir);
    if (observation.ready && selection.visible) {
      assert.ok(selection.point, 'The real initialization prompt must offer an enabled, unobstructed Yes');
      return selection;
    }
    await clock.poll(remainingRegenerationBudget(phase, clock.now()));
  }
  throw new Error(
    silentHealingObserved
      ? `Regeneration ${phase.phase}: files healed silently, but the required initialization prompt/real Yes was absent`
      : `Regeneration ${phase.phase}: required initialization prompt/real Yes was absent before the original deadline`
  );
}

export async function confirmRegenerationPromptSequence(options: {
  read: () => Promise<RegenerationPromptObservation>;
  appDir: string;
  phase: RegenerationDeadline;
  filesHealed: () => boolean;
  assertBeforeOverwrite: () => void;
  capture: (kind: 'initialize' | 'overwrite') => Promise<void>;
  click: (point: { x: number; y: number }) => Promise<void>;
  clock?: { now: () => number; poll: (remainingMs: number) => Promise<void> };
}): Promise<{ initializationYesCount: number; overwriteYesCount: number }> {
  const clock = options.clock ?? {
    now: Date.now,
    poll: async (remainingMs: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(100, remainingMs))),
  };
  const budget = () => remainingRegenerationBudget(options.phase, clock.now());
  await requireRegenerationYes(options.read, options.appDir, options.phase, options.filesHealed, clock);
  await options.capture('initialize');
  budget();
  const initial = await options.read();
  budget();
  const initialize = selectRegenerationYes(initial.containers, options.appDir);
  assert.ok(initial.ready && initialize.point, 'The same real initialization prompt must remain enabled immediately before Yes');
  assert.strictEqual(selectRegenerationOverwriteYes(initial.containers).visible, false, 'Overwrite must be a second distinct prompt');
  options.assertBeforeOverwrite();
  // An uncertain input RPC is fatal. Neither click is retried or replayed.
  await options.click(initialize.point);
  budget();
  const initializationYesCount = 1;
  while (clock.now() < options.phase.deadline) {
    const view = await options.read();
    budget();
    assert.strictEqual(view.timeOrigin, initial.timeOrigin, 'The overwrite confirmation must belong to the same workbench document');
    options.assertBeforeOverwrite();
    const overwrite = selectRegenerationOverwriteYes(view.containers);
    if (view.ready && overwrite.visible) {
      assert.ok(overwrite.point, 'The distinct real overwrite modal must offer an enabled, unobstructed Yes');
      await options.capture('overwrite');
      budget();
      const current = await options.read();
      budget();
      assert.ok(current.ready && current.timeOrigin === initial.timeOrigin, 'Overwrite must retain the original app/workbench binding');
      const actual = selectRegenerationOverwriteYes(current.containers);
      assert.ok(actual.point, 'The same real overwrite modal must remain enabled immediately before Yes');
      options.assertBeforeOverwrite();
      await options.click(actual.point);
      budget();
      return { initializationYesCount, overwriteYesCount: 1 };
    }
    await clock.poll(budget());
  }
  throw new Error(
    `Regeneration ${options.phase.phase}: distinct overwrite-existing-.vscode confirmation/real Yes was absent before the original deadline`
  );
}

export function assertRegenerationComplete(result: {
  observationPassed: boolean;
  originalCodeClose: { code: number | null; signal: string | null } | null;
  errors: string[];
  cleanup?: { verified: boolean };
}): void {
  assert.strictEqual(result.observationPassed, true, 'Every required regeneration and fresh-reopen phase must pass');
  assert.deepStrictEqual(result.originalCodeClose, { code: 0, signal: null }, 'Every regular Code host must close ordinarily');
  assert.deepStrictEqual(result.errors, [], 'Original observation/teardown errors must not be discarded');
  assert.strictEqual(result.cleanup?.verified, true, 'Existing final wizard-root cleanup must be verified');
}
