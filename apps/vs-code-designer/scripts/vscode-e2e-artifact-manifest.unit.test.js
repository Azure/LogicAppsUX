/* global console, process, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  _test: { parseArgs, parseTarTableEntry, validateSafeTarEntries, validateSafeTarMembers, verifyManifest, writeManifest },
} = require('./vscode-e2e-artifact-manifest.js');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-artifact-manifest-unit-'));
const previousEnv = { ...process.env };
const currentHeadSha = getCurrentHeadSha();
const alternateHeadSha = currentHeadSha === '0'.repeat(40) ? '1'.repeat(40) : '0'.repeat(40);

try {
  testParseRepeatedRoots();
  testParseTarInventoryFormats();
  testRejectsUnsafeArchiveMembers();
  testGenerateAndVerifyManifest();
  testPrivilegedAdmissionRequiresTrustedProvenance();
  testVerifyRejectsMissingRequiredMetadata();
  testVerifyRejectsWrongSha();
  testVerifyRejectsAppendedByteTamperBySize();
  testVerifyRejectsSameLengthTamperByHash();
  console.log('[vscode-e2e-artifact-manifest.unit] all tests passed');
} finally {
  process.env = previousEnv;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function testParseRepeatedRoots() {
  const args = parseArgs([
    'generate',
    '--artifact',
    'extension-build.tar.gz',
    '--out',
    'manifest.json',
    '--artifact-name',
    'vscode-e2e-build',
    '--payload-root',
    'apps\\vs-code-designer\\dist',
    '--payload-root',
    './apps/vs-code-designer/out/',
  ]);
  assert.strictEqual(args.command, 'generate');
  assert.deepStrictEqual(args.payloadRoots, ['apps/vs-code-designer/dist', 'apps/vs-code-designer/out']);
}

function testParseTarInventoryFormats() {
  assert.deepStrictEqual(parseTarTableEntry('-rw-r--r-- root/root 7 2026-09-28 10:00 apps/vs-code-designer/dist/package.json'), {
    type: '-',
    size: 7,
    path: 'apps/vs-code-designer/dist/package.json',
    linkTarget: undefined,
  });
  assert.deepStrictEqual(
    parseTarTableEntry('-rw-r--r--  0 user group       7 Sep 28 10:00 apps/vs-code-designer/dist/name with spaces.json'),
    {
      type: '-',
      size: 7,
      path: 'apps/vs-code-designer/dist/name with spaces.json',
      linkTarget: undefined,
    }
  );
  assert.deepStrictEqual(
    parseTarTableEntry('lrwxrwxrwx root/root 0 2026-09-28 10:00 apps/vs-code-designer/dist/escape-link -> /outside-review-fixture'),
    {
      type: 'l',
      size: 0,
      path: 'apps/vs-code-designer/dist/escape-link',
      linkTarget: '/outside-review-fixture',
    }
  );
  assert.deepStrictEqual(parseTarTableEntry('-rw-r--r-- root/root 1 2026-09-28 10:00 apps/vs-code-designer/dist/name -> not link.txt'), {
    type: '-',
    size: 1,
    path: 'apps/vs-code-designer/dist/name -> not link.txt',
    linkTarget: undefined,
  });
}

function testRejectsUnsafeArchiveMembers() {
  assert.throws(() => validateSafeTarMembers(['../secret.txt']), /unsafe/);
  assert.throws(() => validateSafeTarMembers(['/absolute.txt']), /unsafe/);
  assert.throws(() => validateSafeTarMembers(['apps/vs-code-designer/.vscode-test/token.json']), /unsafe/);
  assert.doesNotThrow(() => validateSafeTarMembers(['apps/vs-code-designer/dist/package.json', 'apps/vs-code-designer/out/test/e2e.js']));
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/package.json' },
        { type: 'l', size: 0, path: 'apps/vs-code-designer/dist/escape-link', linkTarget: '/outside-review-fixture' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /escape-link/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/package.json' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/Package.json' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /case-collides/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/package.json' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/package.json' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /duplicate archive member/
  );
  assert.throws(
    () => validateSafeTarEntries([{ type: '-', size: 1, path: 'apps/vs-code-designer/dist/package.json' }]),
    /missing required/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/config.json:stream' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /alternate-stream/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/CON' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /reserved device/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps/vs-code-designer/dist/file.' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /trailing dot/
  );
  assert.throws(
    () =>
      validateSafeTarEntries([
        { type: '-', size: 1, path: 'apps\\vs-code-designer\\dist\\package.json' },
        { type: '-', size: 1, path: 'apps/vs-code-designer/out/test/e2e.js' },
      ]),
    /backslash separators/
  );
}

function testGenerateAndVerifyManifest() {
  const artifact = createArtifact('valid-artifact', {
    'apps/vs-code-designer/dist/package.json': '{"name":"unit"}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'valid-manifest.json');
  setBuildEnv({ runId: '12345', definitionId: '24067', sourceVersion: currentHeadSha });

  const manifest = writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
    artifactVersion: 'unit-version',
    checkoutRef: currentHeadSha,
    payloadRoots: ['apps/vs-code-designer/dist', 'apps/vs-code-designer/out'],
  });

  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.producer.runId, '12345');
  assert.strictEqual(manifest.producer.definitionId, '24067');
  assert.strictEqual(manifest.producer.sourceVersion, currentHeadSha);
  assert.strictEqual(manifest.producer.checkoutRef, currentHeadSha);
  assert.strictEqual(manifest.artifact.name, 'vscode-e2e-build');
  assert.strictEqual(manifest.artifact.version, 'unit-version');
  assert.ok(manifest.artifact.members.includes('apps/vs-code-designer/dist/package.json'));

  const verified = verifyManifest({
    artifact,
    manifest: manifestPath,
    expectedProducerRunId: '12345',
    expectedProducerDefinitionId: '24067',
    expectedSourceSha: currentHeadSha,
  });
  assert.strictEqual(verified.artifact.sha256, manifest.artifact.sha256);
}

function testPrivilegedAdmissionRequiresTrustedProvenance() {
  const artifact = createArtifact('privileged-artifact', {
    'apps/vs-code-designer/dist/package.json': '{}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'privileged-manifest.json');
  setBuildEnv({ runId: '67890', definitionId: '24067', sourceVersion: currentHeadSha });
  writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
    checkoutRef: currentHeadSha,
    payloadRoots: ['apps/vs-code-designer/dist', 'apps/vs-code-designer/out'],
  });

  assert.throws(() => verifyManifest({ artifact, manifest: manifestPath, privilegedAdmission: true }), /requires --expected-source-sha/);
  assert.throws(
    () =>
      verifyManifest({
        artifact,
        manifest: manifestPath,
        privilegedAdmission: true,
        expectedSourceSha: `${currentHeadSha}bad`,
        expectedProducerRunId: '67890',
        expectedProducerDefinitionId: '24067',
      }),
    /full 40-character git SHA/
  );
  assert.throws(
    () =>
      verifyManifest({
        artifact,
        manifest: manifestPath,
        privilegedAdmission: true,
        expectedSourceSha: currentHeadSha,
        expectedProducerRunId: '67890',
        expectedProducerDefinitionId: '99999',
      }),
    /Producer definition ID mismatch/
  );
  assert.doesNotThrow(() =>
    verifyManifest({
      artifact,
      manifest: manifestPath,
      privilegedAdmission: true,
      expectedSourceSha: currentHeadSha,
      expectedProducerRunId: '67890',
      expectedProducerDefinitionId: '24067',
      expectedRepositoryName: 'Azure/LogicAppsUX',
      expectedRepositoryUri: 'https://github.com/Azure/LogicAppsUX',
      expectedCheckoutRef: currentHeadSha,
    })
  );
  assertPrivilegedAdmissionRejectsMutatedManifest({
    artifact,
    manifestPath,
    mutate: (manifest) => {
      manifest.producer.sourceVersion = alternateHeadSha;
    },
    expectedMessage: /sourceVersion must match actualArtifactBuildSha/,
  });
  assertPrivilegedAdmissionRejectsMutatedManifest({
    artifact,
    manifestPath,
    mutate: (manifest) => {
      manifest.producer.sourceVersion = '123456';
    },
    expectedMessage: /full 40-character git SHA/,
  });
  assertPrivilegedAdmissionRejectsMutatedManifest({
    artifact,
    manifestPath,
    mutate: (manifest) => {
      manifest.producer.checkoutRef = alternateHeadSha;
    },
    expectedMessage: /checkoutRef must match actualArtifactBuildSha/,
  });
  assert.throws(
    () =>
      verifyManifest({
        artifact,
        manifest: manifestPath,
        privilegedAdmission: true,
        expectedSourceSha: currentHeadSha,
        expectedProducerRunId: '67890',
        expectedProducerDefinitionId: '24067',
        expectedCheckoutRef: alternateHeadSha,
      }),
    /Producer checkout ref mismatch/
  );
  assert.throws(
    () =>
      verifyManifest({
        artifact,
        manifest: manifestPath,
        privilegedAdmission: true,
        expectedSourceSha: currentHeadSha,
        expectedProducerRunId: '67890',
        expectedProducerDefinitionId: '24067',
        expectedRepositoryName: 'Wrong/Repo',
      }),
    /Producer repository name mismatch/
  );
  assert.throws(
    () =>
      verifyManifest({
        artifact,
        manifest: manifestPath,
        privilegedAdmission: true,
        expectedSourceSha: currentHeadSha,
        expectedProducerRunId: '67890',
        expectedProducerDefinitionId: '24067',
        expectedRepositoryUri: 'https://github.com/Wrong/Repo',
      }),
    /Producer repository URI mismatch/
  );
}

function testVerifyRejectsMissingRequiredMetadata() {
  const artifact = createArtifact('missing-metadata-artifact', {
    'apps/vs-code-designer/dist/package.json': '{}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'missing-metadata-manifest.json');
  setBuildEnv({ runId: '24680', definitionId: '24067', sourceVersion: currentHeadSha });
  const manifest = writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
    payloadRoots: ['apps/vs-code-designer/dist', 'apps/vs-code-designer/out'],
  });
  delete manifest.producer.runId;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.throws(() => verifyManifest({ artifact, manifest: manifestPath }), /producer\.runId/);
}

function testVerifyRejectsWrongSha() {
  const artifact = createArtifact('wrong-sha-artifact', {
    'apps/vs-code-designer/dist/package.json': '{}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'wrong-sha-manifest.json');
  const manifest = writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
  });

  assert.throws(
    () => verifyManifest({ artifact, manifest: manifestPath, expectedSourceSha: `${manifest.producer.actualArtifactBuildSha}bad` }),
    /Producer source SHA mismatch/
  );
}

function testVerifyRejectsAppendedByteTamperBySize() {
  const artifact = createArtifact('size-tampered-artifact', {
    'apps/vs-code-designer/dist/package.json': '{}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'size-tampered-manifest.json');
  writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
  });

  fs.appendFileSync(artifact, 'x');
  assert.throws(() => verifyManifest({ artifact, manifest: manifestPath }), /Artifact size mismatch/);
}

function testVerifyRejectsSameLengthTamperByHash() {
  const artifact = createArtifact('hash-tampered-artifact', {
    'apps/vs-code-designer/dist/package.json': '{}\n',
    'apps/vs-code-designer/out/test/e2e/createWorkspace.test.js': 'module.exports = {};\n',
  });
  const manifestPath = path.join(tempRoot, 'hash-tampered-manifest.json');
  writeManifest({
    artifact,
    manifest: manifestPath,
    artifactName: 'vscode-e2e-build',
  });

  const bytes = fs.readFileSync(artifact);
  bytes[Math.max(0, bytes.length - 8)] = bytes[Math.max(0, bytes.length - 8)] ^ 0xff;
  const expectedSize = fs.statSync(artifact).size;
  fs.writeFileSync(artifact, bytes);
  const tamperedSize = fs.statSync(artifact).size;
  assert.strictEqual(tamperedSize, expectedSize, 'same-length tamper fixture should reach hash validation');
  assert.throws(() => verifyManifest({ artifact, manifest: manifestPath }), /Artifact hash mismatch/);
}

function createArtifact(name, files) {
  const root = path.join(tempRoot, name);
  fs.mkdirSync(root, { recursive: true });
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  const artifact = path.join(tempRoot, `${name}.tar.gz`);
  execFileSync('tar', ['-czf', artifact, ...Object.keys(files)], { cwd: root });
  return artifact;
}

function assertPrivilegedAdmissionRejectsMutatedManifest({ artifact, manifestPath, mutate, expectedMessage }) {
  const original = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const mutated = JSON.parse(JSON.stringify(original));
  mutate(mutated);
  fs.writeFileSync(manifestPath, `${JSON.stringify(mutated, null, 2)}\n`);
  try {
    assert.throws(
      () =>
        verifyManifest({
          artifact,
          manifest: manifestPath,
          privilegedAdmission: true,
          expectedSourceSha: currentHeadSha,
          expectedProducerRunId: original.producer.runId,
          expectedProducerDefinitionId: original.producer.definitionId,
        }),
      expectedMessage
    );
  } finally {
    fs.writeFileSync(manifestPath, `${JSON.stringify(original, null, 2)}\n`);
  }
}

function getCurrentHeadSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function setBuildEnv(values) {
  process.env.BUILD_BUILDID = values.runId;
  process.env.BUILD_BUILDNUMBER = `unit-${values.runId}`;
  process.env.SYSTEM_DEFINITIONID = values.definitionId;
  process.env.BUILD_SOURCEVERSION = values.sourceVersion;
  process.env.BUILD_SOURCEBRANCH = 'refs/heads/unit';
  process.env.BUILD_REPOSITORY_NAME = 'Azure/LogicAppsUX';
  process.env.BUILD_REPOSITORY_URI = 'https://github.com/Azure/LogicAppsUX';
}
