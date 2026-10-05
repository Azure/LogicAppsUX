/* global __dirname, console, process, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  prepareCancelContext,
  adaptCancelHandoff,
  resolveCancelProfile,
  assertRequiredScreenshots,
  assertCancelResult,
  finalizeCancelResult,
} = require('./workspace-prompt-cancel');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-contract-'));
try {
  const parent = path.join(root, 'wizard');
  const wsDir = path.join(parent, 'workspace');
  const appDir = path.join(wsDir, 'app');
  const wfDir = path.join(appDir, 'workflow');
  const extensionsDir = path.join(root, 'prepared-extensions');
  fs.mkdirSync(wfDir, { recursive: true });
  fs.mkdirSync(extensionsDir);
  const wsFilePath = path.join(wsDir, 'workspace.code-workspace');
  fs.writeFileSync(wsFilePath, JSON.stringify({ folders: [{ path: './app' }] }));
  fs.writeFileSync(path.join(wfDir, 'workflow.json'), '{"kind":"Stateful"}');
  const env = {
    LA_E2E_CLI_CANCEL_DIAGNOSTICS_DIR: path.join(root, 'evidence'),
    LA_E2E_CLI_EXTENSIONS_DIR: extensionsDir,
    LA_E2E_CLI_VSCODE_VERSION: '1.140.0',
  };
  const context = prepareCancelContext(env, parent);
  const executable = fs.realpathSync(process.execPath);
  const envelope = {
    schemaVersion: 1,
    invocation: context.invocation,
    identity: context.identity,
    entries: [
      {
        parentDir: context.workspaceParent,
        wsDir,
        wsFilePath,
        appDir,
        wfDir,
        appType: 'standard',
        wfType: 'Stateful',
        createdAt: new Date().toISOString(),
      },
    ],
    launch: {
      executable,
      sha256: createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),
      extensionsDir,
      version: '1.140.0',
    },
  };
  const valid = adaptCancelHandoff(envelope, context);
  assert.deepEqual(valid.workspace, { appDir, workspaceFilePath: wsFilePath, workflowJsonPath: path.join(wfDir, 'workflow.json') });
  for (const change of [
    { invocation: 'copied-old-run' },
    { identity: { ...context.identity, job: 'different' } },
    { entries: [] },
    { entries: [...envelope.entries, ...envelope.entries] },
    { entries: [{ ...envelope.entries[0], appType: 'customCode' }] },
    { entries: [{ ...envelope.entries[0], wfType: 'Stateless' }] },
    { entries: [{ ...envelope.entries[0], createdAt: '2000-01-01T00:00:00Z' }] },
    { entries: [{ ...envelope.entries[0], parentDir: root }] },
    { launch: { ...envelope.launch, sha256: 'f'.repeat(64) } },
    { launch: { ...envelope.launch, executable: 'Code' } },
    { launch: { ...envelope.launch, extensionsDir: root } },
    { launch: { ...envelope.launch, version: '1.139.0' } },
  ]) {
    assert.throws(() => adaptCancelHandoff({ ...envelope, ...change }, context));
  }
  assert.throws(() => prepareCancelContext(env, parent), /fresh/);
  assert.throws(() => resolveCancelProfile({ LA_E2E_CLI_CANCEL_USER_DATA_DIR: path.join(root, 'x'.repeat(120)) }, 'linux'));
  assert.throws(() => resolveCancelProfile({ LA_E2E_CLI_USER_DATA_PARENT: path.join(root, 'unicode-'.repeat(40)) }, 'linux'));
  const profile = resolveCancelProfile({ LA_E2E_CLI_USER_DATA_PARENT: root }, 'linux', 'abcdefgh');
  assert.equal(profile, path.join(root, 'uc-abcdefgh'));
  assert.throws(() => assertRequiredScreenshots(context.root));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=', 'base64');
  fs.mkdirSync(path.join(context.root, 'screenshots'));
  for (const name of ['open-folder', 'before', 'after', 'preceding-no']) {
    fs.writeFileSync(path.join(context.root, 'screenshots', `workspace-prompt-cancel-ui-${name}.png`), png);
  }
  assert.throws(() => assertRequiredScreenshots(context.root), 'PNGs alone must not pass without readiness sidecars');
  const sidecars = ['open-folder', 'before', 'after', 'preceding-no'].map((name) => {
    const checkpoint = `workspace-prompt-cancel-ui-${name}`;
    const readiness = {
      schemaVersion: 1,
      checkpoint,
      classification: 'evidence',
      verdict: 'accepted',
      target: { owner: 'workbench', opaqueTargetId: 'id-unit', opaqueFrameId: 'id-unit', generation: 1 },
      timing: { samples: 3, captureAttempts: 1 },
      geometry: { viewport: { width: 1, height: 1 } },
      events: [{ name: 'accepted', attempt: 1, generation: 1 }],
    };
    const file = path.join(context.root, 'screenshots', `${checkpoint}.json`);
    fs.writeFileSync(file, JSON.stringify(readiness));
    return { file, readiness };
  });
  for (const { file, readiness } of sidecars) {
    for (const changes of [
      { checkpoint: 'wrong-capture' },
      { verdict: 'failed' },
      { classification: 'diagnostic' },
      { events: [] },
      { events: [{ name: 'accepted', attempt: 1, generation: 99 }] },
    ]) {
      fs.writeFileSync(file, JSON.stringify({ ...readiness, ...changes }));
      assert.throws(() => assertRequiredScreenshots(context.root), 'Failed/mismatched readiness must fail for every required image');
    }
    fs.unlinkSync(file);
    assert.throws(() => assertRequiredScreenshots(context.root), 'Every required image needs its own readiness sidecar');
    fs.writeFileSync(file, JSON.stringify(readiness));
  }
  fs.mkdirSync(path.join(context.root, 'vscode-logs'));
  fs.writeFileSync(path.join(context.root, 'code.log'), 'original Code output\n');
  const unitBaseline = {
    files: Array.from({ length: 8 }, (_, index) => ({ name: `unit-${index}.json`, sha256: 'a'.repeat(64) })),
    entries: { app: ['workflow'], vscode: ['launch.json'], workspace: ['app'] },
  };
  const base = {
    schemaVersion: 1,
    scenario: 'workspace-prompt-cancel',
    identity: context.identity,
    invocationCount: 1,
    complete: false,
    observationPassed: true,
    originalCodeClose: { code: 0, signal: null },
    errors: [],
    observation: {
      realCancelMouseInput: true,
      realPrecedingNoMouseInput: true,
      noReload: true,
      samples: 7,
      initialFiles: unitBaseline.files,
      initialDirectories: unitBaseline.entries,
      postNoDirectories: unitBaseline.entries,
      before: unitBaseline,
      after: unitBaseline,
    },
    screenshots: assertRequiredScreenshots(context.root),
  };
  const accepted = finalizeCancelResult(context, structuredClone(base), { verified: true });
  assertCancelResult(accepted, context.root, context.identity);
  for (const count of [0, 2]) {
    const result = structuredClone(accepted);
    result.invocationCount = count;
    assert.throws(() => assertCancelResult(result, context.root));
  }
  const teardownFailure = finalizeCancelResult(context, structuredClone(base), { verified: true }, [
    new Error('original Close Window failed'),
  ]);
  assert.equal(teardownFailure.complete, false);
  assert.match(teardownFailure.errors[0], /original Close Window failed/);
  assert.throws(() => assertCancelResult(teardownFailure, context.root));
  const failedCleanup = finalizeCancelResult(context, structuredClone(base), { verified: false });
  assert.equal(failedCleanup.complete, false);
  fs.unlinkSync(path.join(context.root, 'screenshots', 'workspace-prompt-cancel-ui-after.png'));
  assert.throws(() => finalizeCancelResult(context, structuredClone(base), { verified: true }));
  assert.equal(
    JSON.parse(fs.readFileSync(context.resultPath)).complete,
    false,
    'Evidence rejection must persist failure, not pass-shaped JSON'
  );
  const template = fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', '.config', 'templates', 'vscode-e2e-cli-run-suite.yml'),
    'utf8'
  );
  assert.equal((template.match(/LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL:/g) || []).length, 4);
  assert.ok(template.includes('baseline-green/Cancel-missing'));
  assert.ok(template.indexOf('Copy-Item $cancelSource') < template.indexOf('Required supplementary workspace Cancel evidence failed'));
  console.log(
    '[workspace-cancel.unit] manifest, stale/wrong/ambiguous, actual Linux path, exact cache, once-only, PNG and teardown-failure contracts passed; no GUI credit.'
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
