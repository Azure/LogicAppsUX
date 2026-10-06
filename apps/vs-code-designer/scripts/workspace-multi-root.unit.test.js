/* global __dirname, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const { assertAssets, assertEvidence, finalizeResult, runWorkspaceMultiRoot, validateHandoff } = require('./workspace-multi-root');

test('native family cannot run on a shared host; rejection precedes any native operation', async () => {
  await assert.rejects(runWorkspaceMultiRoot({}, {}), /isolated native consumer/);
});
test('missing Data Mapper HTML/JS is a meaningful block, not command discovery pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-assets-unit-'));
  try {
    assert.throws(() => assertAssets(root));
    fs.mkdirSync(path.join(root, 'dist/vs-code-react/assets'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist/main.js'), 'fixture');
    fs.writeFileSync(path.join(root, 'dist/vs-code-react/index.html'), '<html>fixture</html>');
    assert.throws(() => assertAssets(root), /assets/);
    fs.writeFileSync(path.join(root, 'dist/vs-code-react/assets/fixture.js'), 'fixture');
    assertAssets(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
const passing = () => ({
  observationPassed: true,
  evidenceVerified: true,
  originalCodeClose: { code: 0, signal: null },
  diagnosticsVerified: true,
  cleanupVerified: true,
  errors: [],
});
test('final result only passes after observation, evidence, ordinary native close, diagnostics and cleanup', () => {
  assert.equal(finalizeResult(passing()).complete, true);
  for (const field of ['observationPassed', 'evidenceVerified', 'diagnosticsVerified', 'cleanupVerified']) {
    assert.equal(finalizeResult({ ...passing(), [field]: false }).complete, false);
  }
  for (const originalCodeClose of [null, { code: 1, signal: null }, { code: 0, signal: 'SIGTERM' }]) {
    assert.equal(finalizeResult({ ...passing(), originalCodeClose }).complete, false);
  }
});
test('finalization retains both original and teardown errors and cannot promote a GUI observation pass', () => {
  const errors = ['original collection failed', 'ordinary close failed'];
  const result = finalizeResult({ ...passing(), errors });
  assert.equal(result.complete, false);
  assert.deepEqual(result.errors, errors);
});
test('missing observations, wrong Mapper, absent reload and partial population cannot credit evidence', () => {
  assert.throws(() => assertEvidence(undefined, '', ''));
  assert.throws(() => assertEvidence({ mapperOpened: false }, '', ''));
  assert.throws(
    () => assertEvidence({ mapperOpened: true, roots: ['a', 'b'], originalBoot: 'same', reloadedBoot: 'same' }, '', ''),
    /reload/
  );
  assert.throws(() =>
    assertEvidence(
      {
        mapperOpened: true,
        roots: ['a', 'b'],
        originalBoot: 'before',
        reloadedBoot: 'after',
        population: { complete: false },
      },
      '',
      ''
    )
  );
});
test('registration is additive and leaves baseline CLI labels untouched', () => {
  const root = path.resolve(__dirname, '..');
  const runner = fs.readFileSync(path.join(__dirname, 'run-e2e-cli.js'), 'utf8');
  assert.ok(runner.includes("process.argv.includes('--workspace-multi-root')"));
  const config = fs.readFileSync(path.join(root, '.vscode-test.mjs'), 'utf8');
  assert.ok(config.includes("'LA_E2E_CLI_MULTI_ROOT_HANDOFF'"));
  assert.ok(
    !config.includes("label: 'workspaceMultiRoot'"),
    'Supplementary native evidence must not alter canonical Mocha label/count baselines'
  );
  assert.ok(runner.includes('options.retainWorkspaceForSupplement && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF'));
  const family = fs.readFileSync(path.join(__dirname, 'workspace-multi-root.js'), 'utf8');
  assert.ok(family.includes('retainWorkspaceForSupplement: true'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(packageJson.scripts['test:e2e-cli:unit'].includes('workspaceMultiRoot.unit.js'));
});

test('wizard handoff rejects stale/wrong job, escaped root, changed Code, changed extensions and missing same app', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-handoff-unit-'));
  try {
    const appDir = path.join(root, 'workspace/app');
    fs.mkdirSync(appDir, { recursive: true });
    const wsFilePath = path.join(root, 'workspace/workspace.code-workspace');
    fs.writeFileSync(wsFilePath, JSON.stringify({ folders: [{ path: 'app' }] }));
    const code = path.join(root, 'Code.exe');
    fs.writeFileSync(code, 'unit-owned-nonexecutable-Code-fixture');
    const extensions = path.join(root, 'extensions');
    fs.mkdirSync(extensions);
    const context = {
      invocation: 'unit-invocation',
      identity: { source: 'unit-source', job: 'unit-job' },
      workspaceParent: fs.realpathSync(root),
      extensionsDir: extensions,
      startedUtc: new Date(Date.now() - 1000).toISOString(),
      requestedVersion: 'stable',
    };
    const value = {
      invocation: context.invocation,
      identity: context.identity,
      entry: { appType: 'standard', wfType: 'Stateful', parentDir: root, appDir, wsFilePath, createdAt: new Date().toISOString() },
      launch: {
        executable: fs.realpathSync(code),
        sha256: createHash('sha256').update(fs.readFileSync(code)).digest('hex'),
        version: 'unit-version',
        extensionsDir: extensions,
      },
    };
    assert.deepEqual(validateHandoff(value, context).entry, value.entry);
    assert.throws(() => validateHandoff({ ...value, invocation: 'stale' }, context), /Stale/);
    assert.throws(() => validateHandoff({ ...value, identity: { source: 'wrong', job: 'unit-job' } }, context), /Wrong job/);
    assert.throws(() => validateHandoff({ ...value, entry: { ...value.entry, appDir: os.tmpdir() } }, context), /escaped/);
    assert.throws(
      () => validateHandoff({ ...value, entry: { ...value.entry, createdAt: '2000-01-01T00:00:00Z' } }, context),
      /Stale wizard/
    );
    assert.throws(() => validateHandoff({ ...value, launch: { ...value.launch, sha256: 'a'.repeat(64) } }, context), /Code binary/);
    assert.throws(() => validateHandoff({ ...value, launch: { ...value.launch, extensionsDir: root } }, context), /extensions/);
    assert.throws(() => validateHandoff(value, { ...context, requestedVersion: 'other-version' }), /admitted version/);
    fs.writeFileSync(wsFilePath, JSON.stringify({ folders: [] }));
    assert.throws(() => validateHandoff(value, context), /same app/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
