/* global __dirname, console, process, require */
const assert = require('assert');
const { Buffer } = require('node:buffer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const test = require('node:test');
const { buildDirectoryIntegrityManifest, prepareSuiteExtensionsDirectory } = require('./e2e-cli-batch');
const {
  CONTENT_MANIFEST_NAME,
  CS_DEV_KIT_E2E_VERSION,
  createContentManifest,
  getTargetPlatform,
  installMarketplaceDependencies,
  orderDependencies,
  readSourceContract,
  rebuildExtensionsJson,
  verify,
} = require('./prepare-e2e-extension-dependencies');

const REQUIRED_DEPENDENCIES = [
  'azurite.azurite',
  'ms-azuretools.vscode-azureresourcegroups',
  'ms-dotnettools.csharp',
  'ms-dotnettools.csdevkit',
];

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'logicapps-e2e-extension-deps-'));
}

function writeSourceManifest(root) {
  const sourceManifestPath = path.join(root, 'src', 'package.json');
  fs.mkdirSync(path.dirname(sourceManifestPath), { recursive: true });
  fs.writeFileSync(
    sourceManifestPath,
    JSON.stringify({
      name: 'vscode-azurelogicapps',
      publisher: 'ms-azuretools',
      version: '1.0.0',
      extensionDependencies: REQUIRED_DEPENDENCIES,
    })
  );
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'package-management-manifest' }));
  return sourceManifestPath;
}

function writeExtension(extensionsDir, id, version, packageOverrides = {}) {
  const relativeLocation = `${id}-${version}`;
  const extensionRoot = path.join(extensionsDir, relativeLocation);
  const separator = id.indexOf('.');
  fs.mkdirSync(extensionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(extensionRoot, 'package.json'),
    JSON.stringify({
      publisher: id.slice(0, separator),
      name: id.slice(separator + 1),
      version,
      ...packageOverrides,
    })
  );
  fs.writeFileSync(path.join(extensionRoot, 'payload.txt'), `${id}@${version}`);
  return { extensionRoot, relativeLocation };
}

function createInstalledFixture(extensionsDir, platform = process.platform, arch = process.arch) {
  fs.mkdirSync(extensionsDir, { recursive: true });
  writeExtension(extensionsDir, 'azurite.azurite', '3.35.0');
  writeExtension(extensionsDir, 'ms-azuretools.vscode-azureresourcegroups', '0.10.11');
  writeExtension(extensionsDir, 'ms-dotnettools.vscode-dotnet-runtime', '2.3.8');
  writeExtension(extensionsDir, 'ms-dotnettools.csharp', '2.95.22', {
    extensionDependencies: ['ms-dotnettools.vscode-dotnet-runtime'],
  });
  const csDevKit = writeExtension(extensionsDir, 'ms-dotnettools.csdevkit', CS_DEV_KIT_E2E_VERSION, {
    extensionDependencies: ['ms-dotnettools.csharp'],
    __metadata: { targetPlatform: getTargetPlatform(platform, arch) },
  });
  if (platform === 'win32') {
    const nativeRoot = path.join(csDevKit.extensionRoot, 'dist', 'native', arch === 'arm64' ? 'win32-arm64' : 'win32-x64');
    fs.mkdirSync(nativeRoot, { recursive: true });
    fs.writeFileSync(path.join(nativeRoot, 'NodeAddon.node'), 'native');
  } else if (platform === 'linux') {
    const cpsRoot = path.join(csDevKit.extensionRoot, 'components', 'CPS', 'platforms', arch === 'arm64' ? 'linux-arm64' : 'linux-x64');
    fs.mkdirSync(cpsRoot, { recursive: true });
    fs.writeFileSync(path.join(cpsRoot, 'payload'), 'native');
  }
}

function createOptions(root, sourceManifestPath, extensionsDir) {
  return {
    platform: process.platform,
    arch: process.arch,
    vscodeVersion: '1.144.0',
    extensionsDir,
    userDataDir: path.join(root, 'user-data'),
    vscodeCachePath: path.join(root, 'vscode-cache'),
    vsixCachePath: path.join(root, 'vsix-cache'),
    sourceManifestPath,
  };
}

function runTar(args) {
  const result = spawnSync('tar', args, { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `tar ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
}

function createSuiteCopyFixture() {
  const root = createTempRoot();
  const seedDir = path.join(root, 'seed');
  const targetDir = path.join(root, 'installed');
  const options = { platform: process.platform, arch: process.arch, vscodeVersion: 'stable' };
  createInstalledFixture(seedDir);
  const manifest = createContentManifest(seedDir, readSourceContract(), options);
  fs.writeFileSync(path.join(seedDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  return { root, seedDir, targetDir, ...options };
}

test('isolated preparation hashes each ordinary payload once per trust boundary and retains exact manifest bytes', (context) => {
  const fixture = createSuiteCopyFixture();
  try {
    const relativePath = path.join('azurite.azurite-3.35.0', 'payload.txt');
    const payloadReads = [];
    const originalRead = fs.readFileSync;
    const read = context.mock.method(fs, 'readFileSync', function (file, ...args) {
      if (String(file).endsWith(relativePath)) {
        payloadReads.push(path.resolve(file));
      }
      return originalRead.call(this, file, ...args);
    });
    const manifestBytes = originalRead(path.join(fixture.seedDir, CONTENT_MANIFEST_NAME));
    prepareSuiteExtensionsDirectory(fixture);
    read.mock.restore();
    assert.deepStrictEqual(payloadReads.sort(), [fixture.seedDir, fixture.targetDir].map((root) => path.join(root, relativePath)).sort());
    assert.deepStrictEqual(fs.readFileSync(path.join(fixture.seedDir, CONTENT_MANIFEST_NAME)), manifestBytes);
    assert.deepStrictEqual(fs.readFileSync(path.join(fixture.targetDir, CONTENT_MANIFEST_NAME)), manifestBytes);
    const registry = JSON.parse(fs.readFileSync(path.join(fixture.targetDir, 'extensions.json'), 'utf8'));
    assert.ok(registry.length > 0);
    assert.ok(registry.every((entry) => entry.location.path.includes('/installed/')));
    assert.strictEqual(fs.readFileSync(path.join(fixture.seedDir, 'extensions.json'), 'utf8'), '[]');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

for (const mutation of ['changed', 'missing', 'extra', 'link']) {
  test(`invalid ${mutation} seed payload fails before copying`, (context) => {
    const fixture = createSuiteCopyFixture();
    try {
      const payload = path.join(fixture.seedDir, 'azurite.azurite-3.35.0', 'payload.txt');
      if (mutation === 'changed') {
        fs.writeFileSync(payload, 'x'.repeat(fs.statSync(payload).size));
      } else if (mutation === 'missing') {
        fs.rmSync(payload);
      } else if (mutation === 'extra') {
        fs.writeFileSync(path.join(fixture.seedDir, 'unexpected'), 'extra');
      } else {
        const extension = path.dirname(payload);
        const displaced = path.join(fixture.root, 'displaced');
        fs.renameSync(extension, displaced);
        fs.symlinkSync(displaced, extension, process.platform === 'win32' ? 'junction' : 'dir');
      }
      fs.mkdirSync(fixture.targetDir);
      fs.writeFileSync(path.join(fixture.targetDir, 'sentinel'), 'untouched');
      const copy = context.mock.method(fs, 'cpSync', () => assert.fail('Invalid seed must never be copied'));
      assert.throws(
        () => prepareSuiteExtensionsDirectory(fixture),
        /does not match|unexpected top-level|symbolic link|missing required ID/
      );
      copy.mock.restore();
      assert.strictEqual(fs.readFileSync(path.join(fixture.targetDir, 'sentinel'), 'utf8'), 'untouched');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
}

for (const mutation of ['changed', 'missing', 'extra', 'manifest-bytes', 'rebaselined', 'interrupted']) {
  test(`installed ${mutation} copy cannot pass verification or immutable comparison`, (context) => {
    const fixture = createSuiteCopyFixture();
    try {
      const originalCopy = fs.cpSync;
      const copy = context.mock.method(fs, 'cpSync', function (...args) {
        originalCopy.apply(this, args);
        const payload = path.join(fixture.targetDir, 'azurite.azurite-3.35.0', 'payload.txt');
        if (mutation === 'changed' || mutation === 'rebaselined') {
          fs.writeFileSync(payload, 'x'.repeat(fs.statSync(payload).size));
          if (mutation === 'rebaselined') {
            const manifest = createContentManifest(fixture.targetDir, readSourceContract(), fixture);
            fs.writeFileSync(path.join(fixture.targetDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
          }
        } else if (mutation === 'missing') {
          fs.rmSync(payload);
        } else if (mutation === 'extra') {
          fs.writeFileSync(path.join(fixture.targetDir, 'unexpected'), 'extra');
        } else if (mutation === 'manifest-bytes') {
          fs.appendFileSync(path.join(fixture.targetDir, CONTENT_MANIFEST_NAME), '\n');
        } else {
          throw new Error('injected interrupted copy');
        }
      });
      assert.throws(
        () => prepareSuiteExtensionsDirectory(fixture),
        /does not match|unexpected top-level|changed while copying|interrupted copy/
      );
      copy.mock.restore();
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
}

test('batch snapshot cannot be replaced by a newly valid but rebaselined seed', () => {
  const fixture = createSuiteCopyFixture();
  try {
    const expectedManifest = buildDirectoryIntegrityManifest(fixture.seedDir);
    fs.writeFileSync(path.join(fixture.seedDir, 'azurite.azurite-3.35.0', 'payload.txt'), 'new seed');
    const manifest = createContentManifest(fixture.seedDir, readSourceContract(), fixture);
    fs.writeFileSync(path.join(fixture.seedDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    assert.throws(() => prepareSuiteExtensionsDirectory({ ...fixture, expectedManifest }), /changed since the batch snapshot/);
    assert.ok(!fs.existsSync(fixture.targetDir));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a manifest byte change during semantic verification cannot become the copy baseline', (context) => {
  const fixture = createSuiteCopyFixture();
  try {
    const manifestPath = path.join(fixture.seedDir, CONTENT_MANIFEST_NAME);
    const originalRead = fs.readFileSync;
    let reads = 0;
    const read = context.mock.method(fs, 'readFileSync', function (file, ...args) {
      const bytes = originalRead.call(this, file, ...args);
      if (path.resolve(String(file)) === manifestPath && ++reads === 2) {
        fs.appendFileSync(manifestPath, '\n');
      }
      return bytes;
    });
    assert.throws(() => prepareSuiteExtensionsDirectory(fixture), /content manifest changed during verification/);
    read.mock.restore();
    assert.ok(!fs.existsSync(fixture.targetDir));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('phase timing records retain explicit failure and never report a later copy after seed rejection', (context) => {
  const fixture = createSuiteCopyFixture();
  try {
    const records = [];
    const output = context.mock.method(console, 'log', (line) => records.push(JSON.parse(line.replace('[extensions-preparation] ', ''))));
    fs.writeFileSync(path.join(fixture.seedDir, 'unexpected'), 'extra');
    assert.throws(() => prepareSuiteExtensionsDirectory(fixture), /unexpected top-level/);
    output.mock.restore();
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].phase, 'verify-seed');
    assert.strictEqual(records[0].outcome, 'failed');
    assert.ok(Number.isInteger(records[0].durationMs) && records[0].durationMs >= 0);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('suite copies remain physically independent and repeated preparation removes stale installed files', () => {
  const fixture = createSuiteCopyFixture();
  try {
    const expectedManifest = buildDirectoryIntegrityManifest(fixture.seedDir);
    prepareSuiteExtensionsDirectory({ ...fixture, expectedManifest });
    const relativePath = path.join('azurite.azurite-3.35.0', 'payload.txt');
    const seedBytes = fs.readFileSync(path.join(fixture.seedDir, relativePath));
    fs.writeFileSync(path.join(fixture.targetDir, relativePath), 'runtime mutation');
    fs.writeFileSync(path.join(fixture.targetDir, 'stale'), 'runtime addition');
    const otherTarget = path.join(fixture.root, 'other');
    prepareSuiteExtensionsDirectory({ ...fixture, targetDir: otherTarget, expectedManifest });
    assert.deepStrictEqual(fs.readFileSync(path.join(otherTarget, relativePath)), seedBytes);
    assert.deepStrictEqual(fs.readFileSync(path.join(fixture.seedDir, relativePath)), seedBytes);
    prepareSuiteExtensionsDirectory({ ...fixture, expectedManifest });
    assert.deepStrictEqual(fs.readFileSync(path.join(fixture.targetDir, relativePath)), seedBytes);
    assert.ok(!fs.existsSync(path.join(fixture.targetDir, 'stale')));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('reads extension dependencies only from the extension source manifest', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const contract = readSourceContract(sourceManifestPath);
    assert.deepStrictEqual(contract.directDependencies, REQUIRED_DEPENDENCIES);
    assert.ok(contract.requiredDependencies.includes('ms-dotnettools.vscode-dotnet-runtime'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('orders the runtime before C# and the pinned C# Dev Kit', () => {
  const ordered = orderDependencies([
    'ms-dotnettools.csdevkit',
    'azurite.azurite',
    'ms-dotnettools.csharp',
    'ms-dotnettools.vscode-dotnet-runtime',
  ]);
  assert.deepStrictEqual(ordered.slice(0, 3), ['ms-dotnettools.vscode-dotnet-runtime', 'ms-dotnettools.csharp', 'ms-dotnettools.csdevkit']);
});

test('uses the supported VS Code CLI sequentially and falls back to a local VSIX', async () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const sourceContract = readSourceContract(sourceManifestPath);
    const options = createOptions(root, sourceManifestPath, path.join(root, 'extensions'));
    fs.mkdirSync(options.extensionsDir, { recursive: true });
    const commands = [];
    let azuriteAttempts = 0;
    await installMarketplaceDependencies(sourceContract, options, {
      commandRunner: async (args) => {
        commands.push(args);
        if (args[0] === '--version') {
          return { stdout: `${options.vscodeVersion}\n`, stderr: '' };
        }
        if (args.includes('azurite.azurite')) {
          azuriteAttempts += 1;
          throw new Error('simulated Marketplace ID failure');
        }
        return { stdout: '', stderr: '' };
      },
      vsixDownloader: (extensionId) => path.join(root, `${extensionId}.vsix`),
    });

    const installs = commands.filter((args) => args.includes('--install-extension'));
    assert.deepStrictEqual(
      installs.slice(0, 3).map((args) => args[args.indexOf('--install-extension') + 1]),
      ['ms-dotnettools.vscode-dotnet-runtime', 'ms-dotnettools.csharp', `ms-dotnettools.csdevkit@${CS_DEV_KIT_E2E_VERSION}`]
    );
    assert.strictEqual(azuriteAttempts, 1);
    assert.ok(installs.some((args) => args.includes(path.join(root, 'azurite.azurite.vsix'))));
    assert.ok(installs.every((args) => args.some((arg) => arg.startsWith('--extensions-dir='))));
    assert.ok(installs.every((args) => args.some((arg) => arg.startsWith('--user-data-dir='))));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content manifest survives relocation and rebuilds consumer-local registry paths', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const producerExtensions = path.join(root, 'producer', 'test-extensions');
    createInstalledFixture(producerExtensions);
    const options = createOptions(root, sourceManifestPath, producerExtensions);
    const sourceContract = readSourceContract(sourceManifestPath);
    const manifest = createContentManifest(producerExtensions, sourceContract, options);
    fs.writeFileSync(path.join(producerExtensions, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    rebuildExtensionsJson(
      producerExtensions,
      manifest.extensions.map((entry) => ({
        ...entry,
        packageJson: JSON.parse(fs.readFileSync(path.join(producerExtensions, entry.relativeLocation, 'package.json'), 'utf8')),
      }))
    );

    const consumerExtensions = path.join(root, 'consumer', 'test-extensions');
    fs.cpSync(producerExtensions, consumerExtensions, { recursive: true });
    const verified = verify({ ...options, extensionsDir: consumerExtensions });
    assert.strictEqual(verified.contentDigestSHA256, manifest.contentDigestSHA256);
    const registry = JSON.parse(fs.readFileSync(path.join(consumerExtensions, 'extensions.json'), 'utf8'));
    assert.ok(registry.every((entry) => entry.location.path.includes('/consumer/test-extensions/')));
    assert.ok(registry.every((entry) => !entry.location.path.includes('/producer/')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Windows content manifests ignore archive-unstable read and write mode bits', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir, 'win32', 'x64');
    const options = {
      ...createOptions(root, sourceManifestPath, extensionsDir),
      platform: 'windows',
      arch: 'x64',
    };
    const payloadPath = path.join(extensionsDir, 'ms-dotnettools.vscode-dotnet-runtime-2.3.8', 'payload.txt');
    fs.chmodSync(payloadPath, 0o444);
    const readonlyManifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);
    fs.chmodSync(payloadPath, 0o666);
    const writableManifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);

    assert.strictEqual(readonlyManifest.schemaVersion, 2);
    assert.strictEqual(readonlyManifest.fileModePolicy, 'none');
    assert.strictEqual(readonlyManifest.contentDigestSHA256, writableManifest.contentDigestSHA256);
    assert.ok(readonlyManifest.extensions.every((extension) => extension.files.every((file) => file.mode === undefined)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content manifest survives the pipeline tar round trip', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const producerExtensions = path.join(root, 'producer', 'test-extensions');
    createInstalledFixture(producerExtensions);
    const options = createOptions(root, sourceManifestPath, producerExtensions);
    const sourceContract = readSourceContract(sourceManifestPath);
    const readonlyPath = path.join(
      producerExtensions,
      'ms-dotnettools.vscode-dotnet-runtime-2.3.8',
      'dist',
      'distro-data',
      'distro-support.json'
    );
    fs.mkdirSync(path.dirname(readonlyPath), { recursive: true });
    fs.writeFileSync(readonlyPath, '{"supported":true}');
    fs.chmodSync(readonlyPath, 0o444);
    const manifest = createContentManifest(producerExtensions, sourceContract, options);
    fs.writeFileSync(path.join(producerExtensions, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    rebuildExtensionsJson(
      producerExtensions,
      manifest.extensions.map((entry) => ({
        ...entry,
        packageJson: JSON.parse(fs.readFileSync(path.join(producerExtensions, entry.relativeLocation, 'package.json'), 'utf8')),
      }))
    );

    const archivePath = path.join(root, 'prepared-extensions.tar.gz');
    runTar(['-czf', archivePath, '-C', path.dirname(producerExtensions), path.basename(producerExtensions)]);
    const consumerParent = path.join(root, 'consumer');
    fs.mkdirSync(consumerParent, { recursive: true });
    runTar(['-xzf', archivePath, '-C', consumerParent]);
    const consumerExtensions = path.join(consumerParent, 'test-extensions');
    const restoredPath = path.join(
      consumerExtensions,
      'ms-dotnettools.vscode-dotnet-runtime-2.3.8',
      'dist',
      'distro-data',
      'distro-support.json'
    );

    assert.deepStrictEqual(fs.readFileSync(restoredPath), fs.readFileSync(readonlyPath));
    assert.strictEqual(fs.statSync(restoredPath).size, fs.statSync(readonlyPath).size);
    const verified = verify({ ...options, extensionsDir: consumerExtensions });
    assert.strictEqual(verified.contentDigestSHA256, manifest.contentDigestSHA256);
    const registry = JSON.parse(fs.readFileSync(path.join(consumerExtensions, 'extensions.json'), 'utf8'));
    assert.ok(registry.every((entry) => entry.location.path.includes('/consumer/test-extensions/')));
    assert.ok(registry.every((entry) => !entry.location.path.includes('/producer/')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verification rejects tampered extension content', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const options = createOptions(root, sourceManifestPath, extensionsDir);
    const manifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);
    fs.writeFileSync(path.join(extensionsDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    const payloadPath = path.join(extensionsDir, 'azurite.azurite-3.35.0', 'payload.txt');
    const original = fs.readFileSync(payloadPath);
    const tampered = Buffer.from(original);
    tampered[0] ^= 0xff;
    fs.writeFileSync(payloadPath, tampered);
    assert.strictEqual(fs.statSync(payloadPath).size, original.length);
    assert.throws(() => verify(options), /extension azurite\.azurite file payload\.txt sha256: expected="[a-f0-9]+" actual="[a-f0-9]+"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('POSIX content manifests preserve executable permission changes', { skip: process.platform === 'win32' }, () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir, 'linux', process.arch);
    const options = {
      ...createOptions(root, sourceManifestPath, extensionsDir),
      platform: 'linux',
    };
    const payloadPath = path.join(extensionsDir, 'azurite.azurite-3.35.0', 'payload.txt');
    fs.chmodSync(payloadPath, 0o644);
    const manifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);
    fs.writeFileSync(path.join(extensionsDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    fs.chmodSync(payloadPath, 0o755);

    assert.strictEqual(manifest.fileModePolicy, 'posix-0777');
    assert.throws(() => verify(options), /file payload\.txt mode: expected=420 actual=493/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verification rejects an older semantic manifest schema', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const options = createOptions(root, sourceManifestPath, extensionsDir);
    const manifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);
    manifest.schemaVersion = 1;
    fs.writeFileSync(path.join(extensionsDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));

    assert.throws(() => verify(options), /content manifest schema mismatch: 1/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('manifest creation rejects unrelated and duplicate installed extensions', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const options = createOptions(root, sourceManifestPath, extensionsDir);
    const sourceContract = readSourceContract(sourceManifestPath);

    writeExtension(extensionsDir, 'unrelated.extension', '1.0.0');
    assert.throws(() => createContentManifest(extensionsDir, sourceContract, options), /contains unrelated extension/);
    fs.rmSync(path.join(extensionsDir, 'unrelated.extension-1.0.0'), { recursive: true, force: true });

    writeExtension(extensionsDir, 'AZURITE.AZURITE', '4.0.0');
    assert.throws(() => createContentManifest(extensionsDir, sourceContract, options), /contains duplicate ID 'azurite.azurite'/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('manifest creation enforces complete declared dependency and extension-pack closure', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const options = createOptions(root, sourceManifestPath, extensionsDir);
    const sourceContract = readSourceContract(sourceManifestPath);
    const azuritePackagePath = path.join(extensionsDir, 'azurite.azurite-3.35.0', 'package.json');
    const azuritePackage = JSON.parse(fs.readFileSync(azuritePackagePath, 'utf8'));

    fs.writeFileSync(
      azuritePackagePath,
      JSON.stringify({
        ...azuritePackage,
        extensionDependencies: ['example.dependency'],
      })
    );
    assert.throws(
      () => createContentManifest(extensionsDir, sourceContract, options),
      /missing declared dependency\/pack member\(s\): example\.dependency/
    );

    writeExtension(extensionsDir, 'example.dependency', '1.0.0');
    assert.doesNotThrow(() => createContentManifest(extensionsDir, sourceContract, options));

    fs.writeFileSync(
      azuritePackagePath,
      JSON.stringify({
        ...azuritePackage,
        extensionPack: ['example.pack-member'],
      })
    );
    fs.rmSync(path.join(extensionsDir, 'example.dependency-1.0.0'), { recursive: true, force: true });
    assert.throws(
      () => createContentManifest(extensionsDir, sourceContract, options),
      /missing declared dependency\/pack member\(s\): example\.pack-member/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('manifest creation rejects non-universal extensions for a different target platform', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const packagePath = path.join(extensionsDir, 'azurite.azurite-3.35.0', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const wrongTargetPlatform = getTargetPlatform(process.platform === 'win32' ? 'linux' : 'win32', process.arch);
    fs.writeFileSync(
      packagePath,
      JSON.stringify({
        ...packageJson,
        __metadata: { targetPlatform: wrongTargetPlatform },
      })
    );
    assert.throws(
      () =>
        createContentManifest(
          extensionsDir,
          readSourceContract(sourceManifestPath),
          createOptions(root, sourceManifestPath, extensionsDir)
        ),
      /targets '.+', expected '.+' or 'universal'/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('target platform resolution rejects unsupported architectures', () => {
  assert.throws(() => getTargetPlatform(process.platform, 'ia32'), /Unsupported E2E dependency architecture: ia32/);
});

test('manifest creation rejects symbolic links inside installed dependencies', { skip: process.platform === 'win32' }, () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    fs.symlinkSync(
      path.join(extensionsDir, 'azurite.azurite-3.35.0', 'payload.txt'),
      path.join(extensionsDir, 'azurite.azurite-3.35.0', 'payload-link')
    );
    assert.throws(
      () =>
        createContentManifest(
          extensionsDir,
          readSourceContract(sourceManifestPath),
          createOptions(root, sourceManifestPath, extensionsDir)
        ),
      /must not contain symbolic links/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('actual CLI config import exposes private labels only for explicit process argv selectors', () => {
  const root = createTempRoot();
  try {
    for (const label of ['lifecycleStartupProof']) {
      for (const args of [[], ['--coverage'], [label], ['--label', label], [`--label=${label}`]]) {
        const profile = path.join(root, `profile-${Math.random()}`);
        const script = `process.argv = [process.execPath, 'config-control', ...${JSON.stringify(args)}];
          const config = (await import('./.vscode-test.mjs')).default;
          const assert = (await import('node:assert/strict')).default;
          for (const entry of config) {
            assert.equal(entry.env.LA_E2E_CLI_USER_DATA_DIR, process.env.LA_E2E_CLI_USER_DATA_DIR);
            const index = entry.launchArgs.indexOf('--user-data-dir');
            assert.equal(entry.launchArgs[index + 1], process.env.LA_E2E_CLI_USER_DATA_DIR);
          }
          console.log(JSON.stringify(config.map(entry => entry.label)));`;
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
          cwd: path.resolve(__dirname, '..'),
          env: {
            ...process.env,
            LA_E2E_CLI_USER_DATA_DIR: profile,
            LA_E2E_CLI_BATCH_MODE: '0',
            LA_E2E_LIFECYCLE_DIR: '',
            LA_E2E_LIFECYCLE_INVOCATION: '',
          },
          encoding: 'utf8',
          timeout: 30000,
        });

        assert.strictEqual(result.status, 0, result.stderr);
        const labels = JSON.parse(result.stdout.trim());
        assert.strictEqual(labels.includes(label), args[0] === '--label' || args[0] === `--label=${label}`);
        assert.ok(labels.includes('unitTests'));
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('normal dependency setup has no cache preparation mode or overlay-rejecting consumer wiring', () => {
  const { parseArguments } = require('./prepare-e2e-extension-dependencies');
  assert.throws(() => parseArguments(['warm-existing']), /prepare\|verify/);
  for (const file of ['run-e2e-cli.js', 'e2e-cli-batch.js', 'workspace-prompt-cancel.js', 'workspace-multi-root.js']) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.ok(!source.includes('vscode-dependency-preparation'), `${file} must retain normal dependency setup`);
    assert.ok(!source.includes('verifyConsumer'), `${file} must not reject product/recorder overlays`);
  }
});
