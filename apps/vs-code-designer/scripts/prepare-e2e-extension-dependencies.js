/* global Buffer, __dirname, console, module, process, require */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CONTENT_MANIFEST_NAME = 'prepared-extensions-content-manifest.json';
const CONTENT_MANIFEST_SCHEMA_VERSION = 2;
const CS_DEV_KIT_E2E_VERSION = '3.40.210';
const DOTNET_RUNTIME_EXTENSION = 'ms-dotnettools.vscode-dotnet-runtime';
const FORBIDDEN_EXTENSION = 'ms-vscode-remote.remote-containers';
const SOURCE_MANIFEST_PATH = path.resolve(__dirname, '..', 'src', 'package.json');

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function normalizeExtensionId(value) {
  return String(value).trim().toLowerCase();
}

function normalizeTargetPlatform(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return !normalized || normalized === 'undefined' || normalized === 'null' ? 'universal' : normalized;
}

function getTargetPlatform(platform = process.platform, arch = process.arch) {
  if (!['x64', 'arm64'].includes(arch)) {
    throw new Error(`Unsupported E2E dependency architecture: ${arch}`);
  }
  if (platform === 'win32' || platform === 'windows') {
    return arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
  }
  if (platform === 'linux') {
    return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  }
  throw new Error(`Unsupported E2E dependency platform: ${platform}-${arch}`);
}

function getDownloadPlatform(platform = process.platform, arch = process.arch) {
  const targetPlatform = getTargetPlatform(platform, arch);
  if (targetPlatform.startsWith('win32-')) {
    return `${targetPlatform}-archive`;
  }
  return targetPlatform;
}

function readSourceContract(sourceManifestPath = SOURCE_MANIFEST_PATH) {
  const raw = fs.readFileSync(sourceManifestPath);
  const manifest = JSON.parse(raw.toString('utf8'));
  const directDependencies = Array.isArray(manifest.extensionDependencies) ? manifest.extensionDependencies.map(normalizeExtensionId) : [];

  if (directDependencies.includes(FORBIDDEN_EXTENSION)) {
    throw new Error(`${FORBIDDEN_EXTENSION} must not be listed in extensionDependencies.`);
  }
  if (!directDependencies.includes('ms-dotnettools.csdevkit')) {
    throw new Error('ms-dotnettools.csdevkit must be listed in src/package.json extensionDependencies.');
  }

  const requiredDependencies = [...new Set([DOTNET_RUNTIME_EXTENSION, ...directDependencies])];
  return {
    directDependencies,
    requiredDependencies,
    sourceManifestPath,
    sourceManifestSHA256: sha256Buffer(raw),
  };
}

function orderDependencies(requiredDependencies) {
  const priority = new Map([
    [DOTNET_RUNTIME_EXTENSION, 0],
    ['ms-dotnettools.csharp', 1],
    ['ms-dotnettools.csdevkit', 2],
  ]);
  return [...requiredDependencies].sort((left, right) => {
    const leftPriority = priority.get(left) ?? 10;
    const rightPriority = priority.get(right) ?? 10;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
}

function getMarketplaceReference(extensionId) {
  return extensionId === 'ms-dotnettools.csdevkit' ? `${extensionId}@${CS_DEV_KIT_E2E_VERSION}` : extensionId;
}

function isZipFile(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 4) {
    return false;
  }
  const header = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return header[0] === 0x50 && header[1] === 0x4b;
}

function downloadExtensionVsix(extensionId, options) {
  const [publisher, ...nameParts] = extensionId.split('.');
  const extensionName = nameParts.join('.');
  if (!publisher || !extensionName) {
    throw new Error(`Cannot derive Marketplace VSIX URL for '${extensionId}'.`);
  }

  const version = extensionId === 'ms-dotnettools.csdevkit' ? CS_DEV_KIT_E2E_VERSION : 'latest';
  const targetPlatform = getTargetPlatform(options.platform, options.arch);
  const candidates = [
    {
      fileName: `${extensionId}-${version}-${targetPlatform}.vsix`,
      url: `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage?targetPlatform=${targetPlatform}`,
    },
    {
      fileName: `${extensionId}-${version}-universal.vsix`,
      url: `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage`,
    },
  ];

  fs.mkdirSync(options.vsixCachePath, { recursive: true });
  let lastError;
  for (const candidate of candidates) {
    const destination = path.join(options.vsixCachePath, candidate.fileName);
    fs.rmSync(destination, { force: true });
    const result = spawnSync(
      'curl',
      [
        '--fail',
        '--location',
        '--compressed',
        '--retry',
        '5',
        '--retry-delay',
        '5',
        '--retry-all-errors',
        '--connect-timeout',
        '30',
        '--output',
        destination,
        candidate.url,
      ],
      {
        encoding: 'utf8',
        env: process.env,
        timeout: 300_000,
        windowsHide: true,
      }
    );
    if (result.status === 0 && isZipFile(destination)) {
      return destination;
    }
    fs.rmSync(destination, { force: true });
    lastError = new Error(
      `Marketplace download failed for ${extensionId}: ${String(result.stderr || result.error?.message || 'invalid VSIX').trim()}`
    );
  }
  throw lastError ?? new Error(`Unable to download Marketplace package for '${extensionId}'.`);
}

function getExtensionDirectories(extensionsDir) {
  if (!fs.existsSync(extensionsDir)) {
    return [];
  }
  return fs
    .readdirSync(extensionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function readInstalledExtension(extensionsDir, relativeLocation) {
  const extensionRoot = path.join(extensionsDir, relativeLocation);
  const rootStat = fs.lstatSync(extensionRoot);
  if (rootStat.isSymbolicLink()) {
    throw new Error(`Installed extension root must not be a symbolic link: ${relativeLocation}`);
  }
  const packagePath = path.join(extensionRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Installed extension is missing package.json: ${relativeLocation}`);
  }
  const packageRaw = fs.readFileSync(packagePath);
  const packageJson = JSON.parse(packageRaw.toString('utf8'));
  const id = normalizeExtensionId(`${packageJson.publisher}.${packageJson.name}`);
  if (!packageJson.publisher || !packageJson.name || !packageJson.version) {
    throw new Error(`Installed extension has invalid identity metadata: ${relativeLocation}`);
  }
  return {
    id,
    version: String(packageJson.version),
    relativeLocation,
    packageJson,
    packageJsonSHA256: sha256Buffer(packageRaw),
  };
}

function removeMatchingExtensions(extensionsDir, extensionId) {
  for (const relativeLocation of getExtensionDirectories(extensionsDir)) {
    try {
      if (readInstalledExtension(extensionsDir, relativeLocation).id === extensionId) {
        fs.rmSync(path.join(extensionsDir, relativeLocation), { recursive: true, force: true });
      }
    } catch {
      if (relativeLocation.toLowerCase().startsWith(`${extensionId}-`)) {
        fs.rmSync(path.join(extensionsDir, relativeLocation), { recursive: true, force: true });
      }
    }
  }
}

function getFileModePolicy(platform) {
  return platform === 'windows' || platform === 'win32' ? 'none' : 'posix-0777';
}

function walkFiles(root, platform, current = root, files = []) {
  const fileModePolicy = getFileModePolicy(platform);
  for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(current, entry.name);
    const stat = fs.lstatSync(absolutePath);
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');
    if (stat.isSymbolicLink()) {
      throw new Error(`Prepared extension content must not contain symbolic links: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      walkFiles(root, platform, absolutePath, files);
    } else if (stat.isFile()) {
      const file = {
        path: relativePath,
        size: stat.size,
        sha256: sha256File(absolutePath),
      };
      if (fileModePolicy === 'posix-0777') {
        file.mode = stat.mode & 0o777;
      }
      files.push(file);
    } else {
      throw new Error(`Prepared extension content contains an unsupported entry: ${relativePath}`);
    }
  }
  return files;
}

function createContentHash(extensionRoot, platform) {
  const files = walkFiles(extensionRoot, platform);
  return {
    contentSHA256: sha256Buffer(Buffer.from(JSON.stringify(files))),
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.size, 0),
    files,
  };
}

function hasExpectedCsDevKitPlatformPayload(extensionsDir, entry, platform, arch) {
  const extensionPath = path.join(extensionsDir, entry.relativeLocation);
  if (platform === 'win32' || platform === 'windows') {
    const architecture = arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
    return fs.existsSync(path.join(extensionPath, 'dist', 'native', architecture, 'NodeAddon.node'));
  }
  if (platform === 'linux') {
    const architecture = arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    return fs.existsSync(path.join(extensionPath, 'components', 'CPS', 'platforms', architecture));
  }
  return true;
}

function repairLinuxCsDevKitShim(extensionsDir, installedById, platform) {
  if (platform !== 'linux') {
    return;
  }
  const csDevKit = installedById.get('ms-dotnettools.csdevkit');
  if (!csDevKit) {
    return;
  }
  const serverDir = path.join(extensionsDir, csDevKit.relativeLocation, 'components', 'server');
  const serverShim = path.join(serverDir, 'CSDevKit');
  const serverExe = path.join(serverDir, 'CSDevKit.exe');
  if (!fs.existsSync(serverShim) && fs.existsSync(serverExe)) {
    fs.writeFileSync(serverShim, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(serverShim, 0o755);
  }
}

function collectInstalledExtensions(extensionsDir) {
  const installed = getExtensionDirectories(extensionsDir).map((relativeLocation) =>
    readInstalledExtension(extensionsDir, relativeLocation)
  );
  const installedById = new Map();
  for (const entry of installed) {
    if (installedById.has(entry.id)) {
      throw new Error(`Prepared extension dependency set contains duplicate ID '${entry.id}'.`);
    }
    installedById.set(entry.id, entry);
  }
  return { installed, installedById };
}

function getAllowedInstalledIds(installedById, requiredDependencies) {
  const allowed = new Set(requiredDependencies);
  const queue = [...requiredDependencies];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const entry = installedById.get(currentId);
    if (!entry) {
      continue;
    }
    const related = [
      ...(Array.isArray(entry.packageJson.extensionDependencies) ? entry.packageJson.extensionDependencies : []),
      ...(Array.isArray(entry.packageJson.extensionPack) ? entry.packageJson.extensionPack : []),
    ].map(normalizeExtensionId);
    for (const dependencyId of related) {
      if (installedById.has(dependencyId) && !allowed.has(dependencyId)) {
        allowed.add(dependencyId);
        queue.push(dependencyId);
      }
    }
  }
  return allowed;
}

function validateInstalledSet(extensionsDir, sourceContract, options) {
  const { installed, installedById } = collectInstalledExtensions(extensionsDir);
  const expectedTargetPlatform = getTargetPlatform(options.platform, options.arch);
  for (const extensionId of sourceContract.requiredDependencies) {
    if (!installedById.has(extensionId)) {
      throw new Error(`Prepared extension dependency is missing required ID '${extensionId}'.`);
    }
  }

  const csDevKit = installedById.get('ms-dotnettools.csdevkit');
  if (csDevKit.version !== CS_DEV_KIT_E2E_VERSION) {
    throw new Error(`C# Dev Kit version mismatch. expected=${CS_DEV_KIT_E2E_VERSION} actual=${csDevKit.version}`);
  }
  if (!hasExpectedCsDevKitPlatformPayload(extensionsDir, csDevKit, options.platform, options.arch)) {
    throw new Error(`C# Dev Kit is missing its ${expectedTargetPlatform} payload.`);
  }

  for (const entry of installed) {
    const targetPlatform = normalizeTargetPlatform(entry.packageJson.__metadata?.targetPlatform);
    if (targetPlatform !== 'universal' && targetPlatform !== expectedTargetPlatform) {
      throw new Error(`Prepared extension '${entry.id}' targets '${targetPlatform}', expected '${expectedTargetPlatform}' or 'universal'.`);
    }
    const requiredRelatedIds = [
      ...(Array.isArray(entry.packageJson.extensionDependencies) ? entry.packageJson.extensionDependencies : []),
      ...(Array.isArray(entry.packageJson.extensionPack) ? entry.packageJson.extensionPack : []),
    ].map(normalizeExtensionId);
    const missingRelatedIds = requiredRelatedIds.filter(
      (dependencyId) => !dependencyId.startsWith('vscode.') && !installedById.has(dependencyId)
    );
    if (missingRelatedIds.length > 0) {
      throw new Error(`Prepared extension '${entry.id}' is missing declared dependency/pack member(s): ${missingRelatedIds.join(', ')}`);
    }
  }

  const allowedIds = getAllowedInstalledIds(installedById, sourceContract.requiredDependencies);
  const unexpected = installed.map((entry) => entry.id).filter((id) => !allowedIds.has(id));
  if (unexpected.length > 0) {
    throw new Error(`Prepared extension dependency set contains unrelated extension(s): ${unexpected.join(', ')}`);
  }
  return { installed, installedById };
}

function rebuildExtensionsJson(extensionsDir, installed) {
  const entries = installed
    .map((entry) => {
      const extensionPath = path.join(extensionsDir, entry.relativeLocation).replace(/\\/g, '/');
      return {
        identifier: { id: `${entry.packageJson.publisher}.${entry.packageJson.name}` },
        version: entry.version,
        location: {
          $mid: 1,
          path: `/${extensionPath}`.replace(/^\/([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}:`),
          scheme: 'file',
        },
        relativeLocation: entry.relativeLocation,
        metadata: {
          installedTimestamp: 0,
          source: 'gallery',
          ...(normalizeTargetPlatform(entry.packageJson.__metadata?.targetPlatform) !== 'universal'
            ? { targetPlatform: normalizeTargetPlatform(entry.packageJson.__metadata.targetPlatform) }
            : {}),
        },
      };
    })
    .sort((left, right) => normalizeExtensionId(left.identifier.id).localeCompare(normalizeExtensionId(right.identifier.id)));
  fs.writeFileSync(path.join(extensionsDir, 'extensions.json'), JSON.stringify(entries));
}

function createContentManifest(extensionsDir, sourceContract, options) {
  const { installed } = validateInstalledSet(extensionsDir, sourceContract, options);
  const extensions = installed
    .map((entry) => {
      const content = createContentHash(path.join(extensionsDir, entry.relativeLocation), options.platform);
      return {
        id: entry.id,
        version: entry.version,
        relativeLocation: entry.relativeLocation,
        targetPlatform: normalizeTargetPlatform(entry.packageJson.__metadata?.targetPlatform),
        packageJsonSHA256: entry.packageJsonSHA256,
        extensionDependencies: Array.isArray(entry.packageJson.extensionDependencies)
          ? entry.packageJson.extensionDependencies.map(normalizeExtensionId).sort()
          : [],
        extensionPack: Array.isArray(entry.packageJson.extensionPack)
          ? entry.packageJson.extensionPack.map(normalizeExtensionId).sort()
          : [],
        ...content,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const manifest = {
    schemaVersion: CONTENT_MANIFEST_SCHEMA_VERSION,
    tool: 'prepare-e2e-extension-dependencies',
    vscodeVersion: options.vscodeVersion,
    platform: options.platform === 'windows' ? 'win32' : options.platform,
    architecture: options.arch,
    targetPlatform: getTargetPlatform(options.platform, options.arch),
    fileModePolicy: getFileModePolicy(options.platform),
    sourceManifestSHA256: sourceContract.sourceManifestSHA256,
    requiredExtensionIds: [...sourceContract.requiredDependencies].sort(),
    extensions,
  };
  manifest.contentDigestSHA256 = sha256Buffer(Buffer.from(JSON.stringify(extensions)));
  return manifest;
}

function formatManifestDifferences(expected, actual, limit = 20) {
  const differences = [];
  const addDifference = (message) => {
    if (differences.length < limit) {
      differences.push(message);
    }
  };
  const identityFields = [
    'schemaVersion',
    'tool',
    'vscodeVersion',
    'platform',
    'architecture',
    'targetPlatform',
    'fileModePolicy',
    'sourceManifestSHA256',
  ];
  for (const field of identityFields) {
    if (expected[field] !== actual[field]) {
      addDifference(`${field}: expected=${JSON.stringify(expected[field])} actual=${JSON.stringify(actual[field])}`);
    }
  }
  if (JSON.stringify(expected.requiredExtensionIds) !== JSON.stringify(actual.requiredExtensionIds)) {
    addDifference(
      `requiredExtensionIds: expected=${JSON.stringify(expected.requiredExtensionIds)} actual=${JSON.stringify(actual.requiredExtensionIds)}`
    );
  }

  const expectedExtensions = new Map((expected.extensions ?? []).map((entry) => [entry.id, entry]));
  const actualExtensions = new Map((actual.extensions ?? []).map((entry) => [entry.id, entry]));
  for (const extensionId of new Set([...expectedExtensions.keys(), ...actualExtensions.keys()])) {
    const expectedExtension = expectedExtensions.get(extensionId);
    const actualExtension = actualExtensions.get(extensionId);
    if (!expectedExtension) {
      addDifference(`extension ${extensionId}: unexpected`);
      continue;
    }
    if (!actualExtension) {
      addDifference(`extension ${extensionId}: missing`);
      continue;
    }

    const extensionFields = [
      'version',
      'relativeLocation',
      'targetPlatform',
      'packageJsonSHA256',
      'extensionDependencies',
      'extensionPack',
      'contentSHA256',
      'fileCount',
      'totalBytes',
    ];
    for (const field of extensionFields) {
      if (JSON.stringify(expectedExtension[field]) !== JSON.stringify(actualExtension[field])) {
        addDifference(
          `extension ${extensionId} ${field}: expected=${JSON.stringify(expectedExtension[field])} actual=${JSON.stringify(actualExtension[field])}`
        );
      }
    }

    const expectedFiles = new Map((expectedExtension.files ?? []).map((file) => [file.path, file]));
    const actualFiles = new Map((actualExtension.files ?? []).map((file) => [file.path, file]));
    for (const filePath of new Set([...expectedFiles.keys(), ...actualFiles.keys()])) {
      const expectedFile = expectedFiles.get(filePath);
      const actualFile = actualFiles.get(filePath);
      if (!expectedFile) {
        addDifference(`extension ${extensionId} file ${filePath}: unexpected`);
        continue;
      }
      if (!actualFile) {
        addDifference(`extension ${extensionId} file ${filePath}: missing`);
        continue;
      }
      for (const field of ['mode', 'size', 'sha256']) {
        if (expectedFile[field] !== actualFile[field]) {
          addDifference(
            `extension ${extensionId} file ${filePath} ${field}: expected=${JSON.stringify(expectedFile[field])} actual=${JSON.stringify(actualFile[field])}`
          );
        }
      }
    }
  }

  if (expected.contentDigestSHA256 !== actual.contentDigestSHA256) {
    addDifference(
      `contentDigestSHA256: expected=${JSON.stringify(expected.contentDigestSHA256)} actual=${JSON.stringify(actual.contentDigestSHA256)}`
    );
  }
  return differences;
}

function assertNoUnexpectedTopLevelEntries(extensionsDir) {
  const allowedFiles = new Set(['extensions.json', CONTENT_MANIFEST_NAME]);
  for (const entry of fs.readdirSync(extensionsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      continue;
    }
    if (!entry.isFile() || !allowedFiles.has(entry.name)) {
      throw new Error(`Prepared extension dependency set contains unexpected top-level entry '${entry.name}'.`);
    }
  }
}

function writeContentManifest(extensionsDir, manifest) {
  fs.writeFileSync(path.join(extensionsDir, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
}

async function installMarketplaceDependencies(sourceContract, options, dependencies = {}) {
  const commandRunner = dependencies.commandRunner ?? require('@vscode/test-electron').runVSCodeCommand;
  const vsixDownloader = dependencies.vsixDownloader ?? downloadExtensionVsix;
  const commonArguments = [`--extensions-dir=${options.extensionsDir}`, `--user-data-dir=${options.userDataDir}`];
  const commandOptions = {
    version: options.vscodeVersion,
    platform: getDownloadPlatform(options.platform, options.arch),
    cachePath: options.vscodeCachePath,
    spawn: {
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
    },
  };

  const versionResult = await commandRunner(['--version', ...commonArguments], commandOptions);
  const actualVersion = String(versionResult.stdout ?? '')
    .split(/\r?\n/)[0]
    ?.trim();
  if (/^\d+\.\d+\.\d+/.test(options.vscodeVersion) && actualVersion !== options.vscodeVersion) {
    throw new Error(`VS Code CLI version mismatch. expected=${options.vscodeVersion} actual=${actualVersion || '<empty>'}`);
  }

  for (const extensionId of orderDependencies(sourceContract.requiredDependencies)) {
    const reference = getMarketplaceReference(extensionId);
    const installArguments = ['--force', '--install-extension', reference, ...commonArguments];
    try {
      await commandRunner(installArguments, commandOptions);
    } catch {
      removeMatchingExtensions(options.extensionsDir, extensionId);
      const vsixPath = vsixDownloader(extensionId, options);
      await commandRunner(['--force', '--install-extension', vsixPath, ...commonArguments], commandOptions);
    }
  }
}

async function prepare(options, dependencies) {
  const sourceContract = readSourceContract(options.sourceManifestPath);
  fs.rmSync(options.extensionsDir, { recursive: true, force: true });
  fs.rmSync(options.userDataDir, { recursive: true, force: true });
  fs.rmSync(options.vsixCachePath, { recursive: true, force: true });
  fs.mkdirSync(options.extensionsDir, { recursive: true });
  fs.mkdirSync(options.userDataDir, { recursive: true });

  await installMarketplaceDependencies(sourceContract, options, dependencies);
  fs.rmSync(path.join(options.extensionsDir, '.obsolete'), { force: true });
  const initial = collectInstalledExtensions(options.extensionsDir);
  repairLinuxCsDevKitShim(options.extensionsDir, initial.installedById, options.platform);
  const manifest = createContentManifest(options.extensionsDir, sourceContract, options);
  writeContentManifest(options.extensionsDir, manifest);
  rebuildExtensionsJson(options.extensionsDir, collectInstalledExtensions(options.extensionsDir).installed);
  assertNoUnexpectedTopLevelEntries(options.extensionsDir);
  return manifest;
}

function verify(options) {
  const sourceContract = readSourceContract(options.sourceManifestPath);
  const manifestPath = options.contentManifestPath ?? path.join(options.extensionsDir, CONTENT_MANIFEST_NAME);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const normalizedPlatform = options.platform === 'windows' ? 'win32' : options.platform;
  if (manifest.schemaVersion !== CONTENT_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Prepared extension content manifest schema mismatch: ${manifest.schemaVersion}`);
  }
  if (
    manifest.vscodeVersion !== options.vscodeVersion ||
    manifest.platform !== normalizedPlatform ||
    manifest.architecture !== options.arch ||
    manifest.targetPlatform !== getTargetPlatform(options.platform, options.arch) ||
    manifest.fileModePolicy !== getFileModePolicy(options.platform) ||
    manifest.sourceManifestSHA256 !== sourceContract.sourceManifestSHA256
  ) {
    throw new Error('Prepared extension content manifest identity does not match the current consumer.');
  }

  const actualManifest = createContentManifest(options.extensionsDir, sourceContract, options);
  if (JSON.stringify(actualManifest) !== JSON.stringify(manifest)) {
    const differences = formatManifestDifferences(manifest, actualManifest);
    throw new Error(
      `Prepared extension dependency content does not match its signed content manifest.${
        differences.length > 0 ? `\n${differences.map((difference) => `- ${difference}`).join('\n')}` : ''
      }`
    );
  }
  assertNoUnexpectedTopLevelEntries(options.extensionsDir);
  if (options.rebuildRegistry !== false) {
    const installed = collectInstalledExtensions(options.extensionsDir).installed;
    rebuildExtensionsJson(options.extensionsDir, installed);
  }
  return manifest;
}

function parseArguments(argv, env = process.env) {
  const args = [...argv];
  const mode = args.shift();
  if (mode !== 'prepare' && mode !== 'verify') {
    throw new Error('Usage: prepare-e2e-extension-dependencies.js <prepare|verify> [--extensions-dir PATH] [--platform PLATFORM]');
  }
  const values = {};
  while (args.length > 0) {
    const key = args.shift();
    const value = args.shift();
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument: ${key ?? '<missing>'}`);
    }
    values[key.slice(2)] = value;
  }

  const tempRoot = env.TEMP || env.TMPDIR || os.tmpdir();
  const testResourcesRoot = path.join(tempRoot, 'test-resources');
  const platform = values.platform ?? (process.platform === 'win32' ? 'win32' : process.platform);
  return {
    mode,
    platform,
    arch: values.arch ?? process.arch,
    vscodeVersion: values['vscode-version'] ?? env.E2E_VSCODE_VERSION ?? env.CODE_VERSION ?? 'stable',
    extensionsDir: path.resolve(values['extensions-dir'] ?? path.join(testResourcesRoot, 'test-extensions')),
    userDataDir: path.resolve(values['user-data-dir'] ?? path.join(testResourcesRoot, 'dependency-producer-user-data')),
    vscodeCachePath: path.resolve(values['vscode-cache'] ?? path.join(testResourcesRoot, 'vscode-download')),
    vsixCachePath: path.resolve(values['vsix-cache'] ?? path.join(testResourcesRoot, 'vsix-cache')),
    sourceManifestPath: path.resolve(values['source-manifest'] ?? SOURCE_MANIFEST_PATH),
    contentManifestPath: values['content-manifest'] ? path.resolve(values['content-manifest']) : undefined,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = options.mode === 'prepare' ? await prepare(options) : verify(options);
  console.log(
    `${options.mode === 'prepare' ? 'Prepared' : 'Verified'} ${result.extensions.length} VS Code extension dependencies for ${result.targetPlatform} at ${options.extensionsDir}.`
  );
  console.log(`Dependency content digest: ${result.contentDigestSHA256}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  CONTENT_MANIFEST_NAME,
  CS_DEV_KIT_E2E_VERSION,
  DOTNET_RUNTIME_EXTENSION,
  createContentManifest,
  getDownloadPlatform,
  getMarketplaceReference,
  getTargetPlatform,
  installMarketplaceDependencies,
  orderDependencies,
  parseArguments,
  prepare,
  readSourceContract,
  rebuildExtensionsJson,
  verify,
};
