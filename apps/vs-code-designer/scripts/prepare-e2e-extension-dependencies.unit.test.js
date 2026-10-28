/* global process, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
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

test('verification rejects tampered extension content', () => {
  const root = createTempRoot();
  try {
    const sourceManifestPath = writeSourceManifest(root);
    const extensionsDir = path.join(root, 'test-extensions');
    createInstalledFixture(extensionsDir);
    const options = createOptions(root, sourceManifestPath, extensionsDir);
    const manifest = createContentManifest(extensionsDir, readSourceContract(sourceManifestPath), options);
    fs.writeFileSync(path.join(extensionsDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
    fs.writeFileSync(path.join(extensionsDir, 'azurite.azurite-3.35.0', 'payload.txt'), 'tampered');
    assert.throws(() => verify(options), /does not match its signed content manifest/);
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
