/* global Buffer, console, module, process, require */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SCHEMA_VERSION = 1;
const DEFAULT_ALLOWED_PREFIXES = ['apps/vs-code-designer/dist/', 'apps/vs-code-designer/out/'];
const REQUIRED_PAYLOAD_ROOTS = ['apps/vs-code-designer/dist', 'apps/vs-code-designer/out'];
const PRIVILEGED_VERIFY_EXPECTED_OPTIONS = ['expectedSourceSha', 'expectedProducerRunId', 'expectedProducerDefinitionId'];
const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function parseArgs(argv) {
  const args = { payloadRoots: [], allowedPrefixes: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };

    switch (arg) {
      case 'generate':
      case 'verify':
        args.command = arg;
        break;
      case '--artifact':
        args.artifact = next();
        break;
      case '--manifest':
      case '--out':
        args.manifest = next();
        break;
      case '--artifact-name':
        args.artifactName = next();
        break;
      case '--artifact-version':
        args.artifactVersion = next();
        break;
      case '--checkout-ref':
        args.checkoutRef = next();
        break;
      case '--payload-root':
        args.payloadRoots.push(normalizeArchivePath(next()));
        break;
      case '--allow-prefix':
        args.allowedPrefixes.push(normalizeArchivePrefix(next()));
        break;
      case '--expected-source-sha':
        args.expectedSourceSha = next();
        break;
      case '--expected-producer-run-id':
        args.expectedProducerRunId = next();
        break;
      case '--expected-producer-definition-id':
        args.expectedProducerDefinitionId = next();
        break;
      case '--expected-repository-name':
        args.expectedRepositoryName = next();
        break;
      case '--expected-repository-uri':
        args.expectedRepositoryUri = next();
        break;
      case '--expected-checkout-ref':
        args.expectedCheckoutRef = next();
        break;
      case '--privileged-admission':
        args.privilegedAdmission = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const streamBuffer = Buffer.alloc(1024 * 1024);
  const file = fs.openSync(filePath, 'r');
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(file, streamBuffer, 0, streamBuffer.length, null);
      if (bytesRead > 0) {
        hash.update(streamBuffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(file);
  }
  return hash.digest('hex');
}

function getGitValue(args, options = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    if (options.required) {
      throw new Error(`Unable to read required git value: git ${args.join(' ')}`);
    }
    return '';
  }
}

function listTarEntries(artifactPath) {
  const output = execFileSync('tar', ['-tvzf', artifactPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return output.split(/\r?\n/).map(parseTarTableEntry).filter(Boolean);
}

function parseTarTableEntry(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = parseTarTableEntryParts(trimmed);
  if (!parsed) {
    throw new Error(`Unable to parse tar inventory entry: ${trimmed}`);
  }

  const { type, size, rawName } = parsed;
  const linkSeparator = type === 'l' ? rawName.match(/\s+->\s+/) : undefined;
  const name = linkSeparator ? rawName.slice(0, linkSeparator.index) : rawName;
  const linkTarget = linkSeparator ? rawName.slice(linkSeparator.index + linkSeparator[0].length) : undefined;
  return {
    type,
    size,
    path: normalizeArchivePath(name),
    linkTarget: linkTarget ? normalizeArchivePath(linkTarget) : undefined,
  };
}

function parseTarTableEntryParts(line) {
  const gnuMatch = line.match(/^([bcdlps-])[^\s]*\s+\S+\s+(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?(?:\s+[+-]\d{4})?\s+(.+)$/);
  if (gnuMatch) {
    return { type: gnuMatch[1], size: Number(gnuMatch[2]), rawName: gnuMatch[3] };
  }

  const bsdMatch = line.match(
    /^([bcdlps-])[^\s]*(?:\s+\d+)?\s+\S+\s+\S+\s+(\d+)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\S+\s+(.+)$/i
  );
  if (bsdMatch) {
    return { type: bsdMatch[1], size: Number(bsdMatch[2]), rawName: bsdMatch[3] };
  }

  return undefined;
}

function normalizeArchivePath(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/g, '');
}

function normalizeArchivePrefix(value) {
  const normalized = normalizeArchivePath(value);
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function validateSafeTarEntries(entries, allowedPrefixes = DEFAULT_ALLOWED_PREFIXES) {
  const normalizedAllowedPrefixes = allowedPrefixes.map(normalizeArchivePrefix);
  const allowedRoots = normalizedAllowedPrefixes.map((prefix) => prefix.slice(0, -1));
  const unsafe = [];
  const seen = new Set();
  const lowerSeen = new Map();
  const rootHits = new Set();
  for (const entry of entries) {
    const normalized = normalizeArchivePath(entry.path);
    const portabilityProblem = getArchivePathPortabilityProblem(entry.path, normalized);
    const lower = normalized.toLowerCase();
    if (seen.has(normalized)) {
      unsafe.push(`${entry.path} (duplicate archive member)`);
    }
    seen.add(normalized);
    if (lowerSeen.has(lower) && lowerSeen.get(lower) !== normalized) {
      unsafe.push(`${entry.path} (case-collides with ${lowerSeen.get(lower)})`);
    }
    lowerSeen.set(lower, normalized);

    if (
      !normalized ||
      normalized.startsWith('/') ||
      /^[A-Za-z]:\//.test(normalized) ||
      normalized.split('/').includes('..') ||
      portabilityProblem ||
      !['-', 'd'].includes(entry.type) ||
      entry.linkTarget ||
      !normalizedAllowedPrefixes.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))
    ) {
      unsafe.push(portabilityProblem ? `${entry.path} (${portabilityProblem})` : entry.path);
    }
    for (const root of allowedRoots) {
      if (normalized === root || normalized.startsWith(`${root}/`)) {
        rootHits.add(root);
      }
    }
  }

  const missingRoots = REQUIRED_PAYLOAD_ROOTS.filter((root) => !rootHits.has(root));
  if (missingRoots.length > 0) {
    unsafe.push(`missing required payload root(s): ${missingRoots.join(', ')}`);
  }
  if (unsafe.length > 0) {
    throw new Error(`Artifact contains unsafe or unexpected archive member(s): ${unsafe.slice(0, 20).join(', ')}`);
  }
}

function getArchivePathPortabilityProblem(rawPath, normalizedPath) {
  if (String(rawPath).includes('\\')) {
    return 'uses backslash separators';
  }
  if (String(rawPath).includes(':')) {
    return 'contains a colon or NTFS alternate-stream name';
  }
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
  for (const component of normalizedPath.split('/')) {
    if (!component || component === '.') {
      return 'contains an empty or current-directory path component';
    }
    if (component.endsWith('.') || component.endsWith(' ')) {
      return 'contains a path component with a trailing dot or space';
    }
    if (reservedNames.test(component)) {
      return 'contains a Windows reserved device name';
    }
  }
  return undefined;
}

function validateSafeTarMembers(members, allowedPrefixes = DEFAULT_ALLOWED_PREFIXES) {
  validateSafeTarEntries(
    members.map((member) => ({ type: '-', size: 0, path: member })),
    allowedPrefixes
  );
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required manifest field: ${name}`);
  }
  return value;
}

function validatePayloadRoots(roots) {
  const normalized = roots.map(normalizeArchivePath);
  for (const requiredRoot of REQUIRED_PAYLOAD_ROOTS) {
    if (!normalized.includes(requiredRoot)) {
      throw new Error(`Manifest payload roots must include ${requiredRoot}`);
    }
  }
  return normalized;
}

function createManifest(options) {
  if (!options.artifact) {
    throw new Error('--artifact is required');
  }
  if (!options.artifactName) {
    throw new Error('--artifact-name is required');
  }

  const artifactPath = path.resolve(options.artifact);
  const stat = fs.statSync(artifactPath);
  const entries = listTarEntries(artifactPath);
  validateSafeTarEntries(entries, options.allowedPrefixes?.length ? options.allowedPrefixes : DEFAULT_ALLOWED_PREFIXES);

  const actualArtifactBuildSha = getGitValue(['rev-parse', 'HEAD'], { required: true });
  const sourceBranch = process.env.BUILD_SOURCEBRANCH || getGitValue(['rev-parse', '--abbrev-ref', 'HEAD'], { required: true });
  const sourceVersion = process.env.BUILD_SOURCEVERSION || actualArtifactBuildSha;
  const repositoryName = requireString(process.env.BUILD_REPOSITORY_NAME, 'producer.repositoryName');
  const repositoryUri = requireString(process.env.BUILD_REPOSITORY_URI, 'producer.repositoryUri');
  const definitionId = requireString(process.env.SYSTEM_DEFINITIONID || process.env.BUILD_DEFINITIONID, 'producer.definitionId');
  const runId = requireString(process.env.BUILD_BUILDID, 'producer.runId');
  const buildNumber = requireString(process.env.BUILD_BUILDNUMBER, 'producer.buildNumber');
  const payloadRoots = validatePayloadRoots(options.payloadRoots?.length ? options.payloadRoots : DEFAULT_ALLOWED_PREFIXES);

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'logicappsux.vscodeE2E.producerArtifact',
    generatedAt: new Date().toISOString(),
    producer: {
      definitionId,
      definitionName: process.env.BUILD_DEFINITIONNAME || '',
      runId,
      buildNumber,
      repositoryName,
      repositoryUri,
      sourceBranch,
      sourceVersion,
      checkoutRef: options.checkoutRef || '',
      actualArtifactBuildSha,
    },
    artifact: {
      name: options.artifactName,
      version: options.artifactVersion || '',
      fileName: path.basename(artifactPath),
      sha256: sha256File(artifactPath),
      bytes: stat.size,
      entries,
      members: entries.map((entry) => entry.path),
    },
    payload: {
      roots: payloadRoots,
    },
  };
}

function writeManifest(options) {
  if (!options.manifest) {
    throw new Error('--out is required');
  }
  const manifest = createManifest(options);
  fs.mkdirSync(path.dirname(path.resolve(options.manifest)), { recursive: true });
  fs.writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function verifyManifest(options) {
  if (!options.manifest) {
    throw new Error('--manifest is required');
  }
  if (!options.artifact) {
    throw new Error('--artifact is required');
  }

  const manifest = readManifest(options.manifest);
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported manifest schemaVersion: ${manifest.schemaVersion}`);
  }
  if (manifest.kind !== 'logicappsux.vscodeE2E.producerArtifact') {
    throw new Error(`Unsupported manifest kind: ${manifest.kind}`);
  }

  validateManifestShape(manifest);
  if (options.privilegedAdmission) {
    for (const optionName of PRIVILEGED_VERIFY_EXPECTED_OPTIONS) {
      if (!options[optionName]) {
        throw new Error(`--privileged-admission requires ${camelToKebabExpectedOption(optionName)}`);
      }
    }
    validatePrivilegedSourceHeadProvenance(manifest, options);
  }

  const artifactPath = path.resolve(options.artifact);
  const stat = fs.statSync(artifactPath);
  if (path.basename(artifactPath) !== manifest.artifact.fileName) {
    throw new Error(`Artifact fileName mismatch. expected=${manifest.artifact.fileName} actual=${path.basename(artifactPath)}`);
  }
  if (stat.size !== manifest.artifact.bytes) {
    throw new Error(`Artifact size mismatch. expected=${manifest.artifact.bytes} actual=${stat.size}`);
  }
  const actualHash = sha256File(artifactPath);
  if (actualHash !== manifest.artifact?.sha256) {
    throw new Error(`Artifact hash mismatch. expected=${manifest.artifact?.sha256} actual=${actualHash}`);
  }

  const entries = listTarEntries(artifactPath);
  validateSafeTarEntries(entries, options.allowedPrefixes?.length ? options.allowedPrefixes : DEFAULT_ALLOWED_PREFIXES);
  const members = entries.map((entry) => entry.path);
  if (JSON.stringify(members) !== JSON.stringify(manifest.artifact.members)) {
    throw new Error('Artifact member inventory does not match the manifest');
  }
  if (JSON.stringify(entries) !== JSON.stringify(manifest.artifact.entries)) {
    throw new Error('Artifact entry inventory does not match the manifest');
  }

  if (options.expectedSourceSha) {
    const expected = options.expectedSourceSha.toLowerCase();
    const actual = String(manifest.producer?.actualArtifactBuildSha || '').toLowerCase();
    if (actual !== expected) {
      throw new Error(`Producer source SHA mismatch. expected=${expected} actual=${actual}`);
    }
  }
  if (options.expectedProducerRunId && String(manifest.producer?.runId || '') !== String(options.expectedProducerRunId)) {
    throw new Error(`Producer run ID mismatch. expected=${options.expectedProducerRunId} actual=${manifest.producer?.runId || ''}`);
  }
  if (
    options.expectedProducerDefinitionId &&
    String(manifest.producer?.definitionId || '') !== String(options.expectedProducerDefinitionId)
  ) {
    throw new Error(
      `Producer definition ID mismatch. expected=${options.expectedProducerDefinitionId} actual=${manifest.producer?.definitionId || ''}`
    );
  }
  if (options.expectedRepositoryName && String(manifest.producer?.repositoryName || '') !== String(options.expectedRepositoryName)) {
    throw new Error(
      `Producer repository name mismatch. expected=${options.expectedRepositoryName} actual=${manifest.producer?.repositoryName || ''}`
    );
  }
  if (options.expectedRepositoryUri && String(manifest.producer?.repositoryUri || '') !== String(options.expectedRepositoryUri)) {
    throw new Error(
      `Producer repository URI mismatch. expected=${options.expectedRepositoryUri} actual=${manifest.producer?.repositoryUri || ''}`
    );
  }
  if (options.expectedCheckoutRef && String(manifest.producer?.checkoutRef || '') !== String(options.expectedCheckoutRef)) {
    throw new Error(
      `Producer checkout ref mismatch. expected=${options.expectedCheckoutRef} actual=${manifest.producer?.checkoutRef || ''}`
    );
  }

  return manifest;
}

function validatePrivilegedSourceHeadProvenance(manifest, options) {
  const actualArtifactBuildSha = String(manifest.producer?.actualArtifactBuildSha || '');
  const sourceVersion = String(manifest.producer?.sourceVersion || '');
  const expectedSourceSha = String(options.expectedSourceSha || '');
  const checkoutRef = String(manifest.producer?.checkoutRef || '');

  for (const [name, value] of [
    ['producer.actualArtifactBuildSha', actualArtifactBuildSha],
    ['producer.sourceVersion', sourceVersion],
    ['--expected-source-sha', expectedSourceSha],
  ]) {
    if (!FULL_GIT_SHA_PATTERN.test(value)) {
      throw new Error(`Privileged admission requires a full 40-character git SHA for ${name}: ${value || '<missing>'}`);
    }
  }
  if (sourceVersion.toLowerCase() !== actualArtifactBuildSha.toLowerCase()) {
    throw new Error(
      `Producer sourceVersion must match actualArtifactBuildSha for source-head E2E artifacts. sourceVersion=${sourceVersion} actualArtifactBuildSha=${actualArtifactBuildSha}`
    );
  }
  if (expectedSourceSha.toLowerCase() !== actualArtifactBuildSha.toLowerCase()) {
    throw new Error(
      `Producer source SHA mismatch. expected=${expectedSourceSha.toLowerCase()} actual=${actualArtifactBuildSha.toLowerCase()}`
    );
  }
  if (checkoutRef && checkoutRef.toLowerCase() !== actualArtifactBuildSha.toLowerCase()) {
    throw new Error(
      `Producer checkoutRef must match actualArtifactBuildSha for source-head E2E artifacts. checkoutRef=${checkoutRef} actualArtifactBuildSha=${actualArtifactBuildSha}`
    );
  }
}

function validateManifestShape(manifest) {
  requireString(manifest.kind, 'kind');
  requireString(manifest.generatedAt, 'generatedAt');
  requireString(manifest.producer?.definitionId, 'producer.definitionId');
  requireString(manifest.producer?.runId, 'producer.runId');
  requireString(manifest.producer?.buildNumber, 'producer.buildNumber');
  requireString(manifest.producer?.repositoryName, 'producer.repositoryName');
  requireString(manifest.producer?.repositoryUri, 'producer.repositoryUri');
  requireString(manifest.producer?.sourceBranch, 'producer.sourceBranch');
  requireString(manifest.producer?.sourceVersion, 'producer.sourceVersion');
  requireString(manifest.producer?.actualArtifactBuildSha, 'producer.actualArtifactBuildSha');
  requireString(manifest.artifact?.name, 'artifact.name');
  requireString(manifest.artifact?.fileName, 'artifact.fileName');
  requireString(manifest.artifact?.sha256, 'artifact.sha256');
  if (!Number.isInteger(manifest.artifact?.bytes) || manifest.artifact.bytes <= 0) {
    throw new Error('Missing required manifest field: artifact.bytes');
  }
  if (!Array.isArray(manifest.artifact?.members) || manifest.artifact.members.length === 0) {
    throw new Error('Missing required manifest field: artifact.members');
  }
  if (!Array.isArray(manifest.artifact?.entries) || manifest.artifact.entries.length === 0) {
    throw new Error('Missing required manifest field: artifact.entries');
  }
  validatePayloadRoots(Array.isArray(manifest.payload?.roots) ? manifest.payload.roots : []);
}

function camelToKebabExpectedOption(optionName) {
  const names = {
    expectedSourceSha: '--expected-source-sha',
    expectedProducerRunId: '--expected-producer-run-id',
    expectedProducerDefinitionId: '--expected-producer-definition-id',
  };
  return names[optionName] || `--${optionName}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'generate') {
    const manifest = writeManifest(args);
    console.log(`Wrote ${args.manifest}`);
    console.log(`artifactSha256=${manifest.artifact.sha256}`);
    console.log(`actualArtifactBuildSha=${manifest.producer.actualArtifactBuildSha}`);
    return;
  }
  if (args.command === 'verify') {
    const manifest = verifyManifest(args);
    console.log(`Verified ${args.manifest}`);
    console.log(`artifactSha256=${manifest.artifact.sha256}`);
    console.log(`actualArtifactBuildSha=${manifest.producer.actualArtifactBuildSha}`);
    return;
  }
  throw new Error('Expected command: generate or verify');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  _test: {
    createManifest,
    getArchivePathPortabilityProblem,
    normalizeArchivePath,
    parseTarTableEntry,
    parseArgs,
    readManifest,
    sha256File,
    validateSafeTarMembers,
    validateSafeTarEntries,
    validatePrivilegedSourceHeadProvenance,
    verifyManifest,
    writeManifest,
  },
};
