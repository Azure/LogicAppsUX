const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_REGISTRY = 'https://pkgs.dev.azure.com/msazure/One/_packaging/microsoft-logic-apps/npm/registry/';
const PNPM_MIRROR_BASE = 'https://ms-feed-25.pkgs.visualstudio.com/1es-public/_packaging/npm-public/npm/registry';
const NPM_ERROR_CODE_PATTERN = /npm (?:ERR!|error) code ([A-Z0-9_]+)/i;
const NOT_FOUND_FALLBACK_PATTERN = /\bE404\b|404 Not Found|is not in this registry/i;
const FEED_SEMVER_PATTERN = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// Check npm's explicit error code first so non-404 errors (e.g. E502 with "404 Not Found" in upstream text) are never misclassified as missing packages.
function isNotFoundError(combinedOutput) {
  const codeMatch = NPM_ERROR_CODE_PATTERN.exec(combinedOutput);
  if (codeMatch) {
    return codeMatch[1].toUpperCase() === 'E404';
  }
  return NOT_FOUND_FALLBACK_PATTERN.test(combinedOutput);
}

// Publishable workspace libraries in dependency order (matches scripts/update-versions.js).
const PACKAGES = [
  { directory: 'libs/logic-apps-shared', name: '@microsoft/logic-apps-shared' },
  { directory: 'libs/designer-ui', name: '@microsoft/designer-ui' },
  { directory: 'libs/designer-ui-v2', name: '@microsoft/designer-ui-v2' },
  { directory: 'libs/chatbot', name: '@microsoft/logic-apps-chatbot' },
  { directory: 'libs/designer', name: '@microsoft/logic-apps-designer' },
  { directory: 'libs/designer-v2', name: '@microsoft/logic-apps-designer-v2' },
  { directory: 'libs/data-mapper', name: '@microsoft/logic-apps-data-mapper' },
  { directory: 'libs/data-mapper-v2', name: '@microsoft/logic-apps-data-mapper-v2' },
  { directory: 'libs/vscode-extension', name: '@microsoft/vscode-extension-logic-apps' },
];

function parseReleaseVersion(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`Invalid releaseVersion '${value}'. Expected a version like 5.1024.0 (without the 'v' prefix).`);
  }
  return value;
}

// Numeric X.Y.Z semver comparison used to prevent historical hotfix releases from downgrading dist-tags.latest.
function compareSemver(a, b) {
  const partsA = parseReleaseVersion(a).split('.').map(Number);
  const partsB = parseReleaseVersion(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (partsA[i] !== partsB[i]) {
      return partsA[i] < partsB[i] ? -1 : 1;
    }
  }
  return 0;
}

function tarballName(packageName, version) {
  return `${packageName.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
}

function runCommand(command, args, options, run = spawnSync) {
  const result = run(command, args, options);
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? `exit ${result.status ?? 'unknown'}`;
    const stderr = typeof result.stderr === 'string' && result.stderr.trim() ? `\n${result.stderr.trim()}` : '';
    throw new Error(`${command} ${args[0] ?? ''} failed (${detail}).${stderr}`.trim());
  }
  return result;
}

function resolveReleaseTag(repoRoot, version, run = spawnSync) {
  const tag = `v${version}`;
  const ref = `refs/tags/${tag}`;
  const gitOptions = { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };

  const showRef = run('git', ['show-ref', '--verify', '--hash', '--', ref], gitOptions);
  if (showRef.error || showRef.status !== 0) {
    throw new Error(`Release tag '${tag}' was not found in the local repository.`);
  }
  const tagSha = showRef.stdout.trim();

  const revParse = run('git', ['rev-parse', '--verify', `${tagSha}^{commit}`], gitOptions);
  if (revParse.error || revParse.status !== 0) {
    throw new Error(`Release tag '${tag}' does not resolve to a commit.`);
  }
  return { tag, ref, commitSha: revParse.stdout.trim() };
}

// 1ES Linux network isolation blocks Corepack from reaching registry.npmjs.org,
// so download the exact pnpm version declared in package.json from the 1ES mirror.
function bootstrapPnpm(sourceRoot, pnpmHome, run = spawnSync) {
  const { packageManager } = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
  const match = /^pnpm@(\d+\.\d+\.\d+)(?:\+sha512\.([a-f0-9]{128}))?$/.exec(packageManager ?? '');
  if (!match) {
    throw new Error(`Unsupported packageManager '${packageManager ?? ''}' in package.json.`);
  }
  const [, pnpmVersion, expectedSha512] = match;
  const archive = path.join(pnpmHome, `pnpm-${pnpmVersion}.tgz`);
  const url = `${PNPM_MIRROR_BASE}/pnpm/-/pnpm-${pnpmVersion}.tgz`;

  runCommand(
    'curl',
    ['--fail', '--silent', '--show-error', '--location', '--output', archive, url],
    { cwd: pnpmHome, stdio: 'inherit', timeout: 120_000 },
    run
  );

  if (expectedSha512) {
    const actualSha512 = createHash('sha512').update(fs.readFileSync(archive)).digest('hex');
    if (actualSha512 !== expectedSha512) {
      throw new Error(`Downloaded pnpm@${pnpmVersion} archive SHA-512 does not match packageManager pin.`);
    }
  }

  runCommand('tar', ['-xzf', archive, '-C', pnpmHome], { cwd: pnpmHome, stdio: 'inherit', timeout: 60_000 }, run);

  const binDir = path.join(pnpmHome, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const pnpmBin = path.join(binDir, 'pnpm');
  fs.symlinkSync(path.join(pnpmHome, 'package', 'bin', 'pnpm.cjs'), pnpmBin);
  return { pnpmBin, binDir };
}

function buildRelease(env, { run = spawnSync, log = console.log, repoRoot = process.cwd() } = {}) {
  const version = parseReleaseVersion(env.RELEASE_VERSION);
  const agentTmp = env.AGENT_TMP || os.tmpdir();
  const tarballDir = env.TARBALL_DIR || path.join(agentTmp, 'npm-tarballs');
  const registry = env.NPM_REGISTRY || DEFAULT_REGISTRY;
  const npmrcPath = env.PUBLISH_NPMRC;

  const { tag, commitSha } = resolveReleaseTag(repoRoot, version, run);
  log(`Resolved ${tag} to ${commitSha}.`);

  // Retain the release worktree under RELEASE_SCAN_ROOT (Agent.BuildDirectory) when set
  // so 1ES Component Governance scans the released tag's lockfile and node_modules.
  const scanRoot = env.RELEASE_SCAN_ROOT;
  const sourceRoot = path.join(scanRoot || agentTmp, 'release-source');
  fs.rmSync(sourceRoot, { recursive: true, force: true });
  run('git', ['worktree', 'prune'], { cwd: repoRoot, stdio: 'ignore' });
  runCommand('git', ['worktree', 'add', '--quiet', '--detach', sourceRoot, commitSha], { cwd: repoRoot, stdio: 'inherit' }, run);

  const pnpmHome = fs.mkdtempSync(path.join(agentTmp, 'pnpm-bootstrap-'));
  let retainForScan = false;

  try {
    const { pnpmBin, binDir } = bootstrapPnpm(sourceRoot, pnpmHome, run);
    const buildEnv = {
      ...env,
      PATH: `${binDir}${path.delimiter}${env.PATH ?? process.env.PATH ?? ''}`,
      HOME: pnpmHome,
      CI: 'true',
      HUSKY: '0',
      NPM_CONFIG_USERCONFIG: '/dev/null',
    };
    const execOptions = { cwd: sourceRoot, env: buildEnv, stdio: 'inherit', timeout: 1_800_000 };

    runCommand(pnpmBin, ['install', '--recursive', '--frozen-lockfile', '--strict-peer-dependencies'], execOptions, run);
    runCommand(process.execPath, ['scripts/update-versions.js', version], execOptions, run);
    runCommand(pnpmBin, ['run', 'build:lib'], execOptions, run);

    fs.rmSync(tarballDir, { recursive: true, force: true });
    fs.mkdirSync(tarballDir, { recursive: true });

    // Pack via pnpm so workspace:* references and publishConfig fields are rewritten into each tarball.
    for (const pkg of PACKAGES) {
      runCommand(pnpmBin, ['--dir', path.join(sourceRoot, pkg.directory), 'pack', '--pack-destination', tarballDir], execOptions, run);
      const expectedTarball = path.join(tarballDir, tarballName(pkg.name, version));
      if (!fs.existsSync(expectedTarball)) {
        throw new Error(`Expected packed tarball was not created: ${expectedTarball}`);
      }
    }

    if (npmrcPath) {
      fs.mkdirSync(path.dirname(npmrcPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(npmrcPath, `registry=${registry}\n`, { mode: 0o600 });
    }

    log(`Built and packed ${PACKAGES.length} packages for v${version} into ${tarballDir}.`);

    if (scanRoot) {
      runCommand('git', ['restore', '--source', commitSha, '--staged', '--worktree', '--', '.'], { cwd: sourceRoot, stdio: 'inherit' }, run);
      retainForScan = true;
    }

    return { version, tag, commitSha, tarballDir };
  } finally {
    fs.rmSync(pnpmHome, { recursive: true, force: true });
    if (!retainForScan) {
      run('git', ['worktree', 'remove', '--force', sourceRoot], { cwd: repoRoot, stdio: 'ignore' });
      fs.rmSync(sourceRoot, { recursive: true, force: true });
    }
  }
}

function isVersionInFeed(packageName, version, { registry, npmrc, cwd, run = spawnSync }) {
  const spec = `${packageName}@${version}`;
  const result = run(
    'npm',
    ['view', spec, 'version', '--registry', registry, '--userconfig', npmrc, '--prefer-online', '--json=false'],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }
  );

  if (result.error) {
    throw new Error(`Failed to check ${spec} in feed: ${result.error.message}`);
  }
  if (result.status === 0) {
    // When the package exists in the feed but the requested version does not, npm view exits 0 with empty stdout.
    return (result.stdout ?? '').trim() === version;
  }

  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (isNotFoundError(combined)) {
    return false;
  }
  throw new Error(`Failed to check ${spec} in feed (exit ${result.status}): ${combined.trim()}`);
}

// Determine which dist-tag to assign on publish so historical hotfix releases never downgrade `latest`.
function resolvePublishDistTag(pkgName, version, registry, npmrc, run = spawnSync, { cwd } = {}) {
  const targetVersion = parseReleaseVersion(version);
  const viewOptions = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 };
  if (cwd) {
    viewOptions.cwd = cwd;
  }
  const result = run(
    'npm',
    [
      'view',
      pkgName,
      'dist-tags.latest',
      '--registry',
      registry,
      '--userconfig',
      npmrc,
      '--prefer-online',
      '--tag=latest',
      '--json=false',
    ],
    viewOptions
  );

  if (result.error) {
    throw new Error(`Failed to resolve dist-tags.latest for ${pkgName}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    if (isNotFoundError(combined)) {
      return 'latest';
    }
    throw new Error(`Failed to resolve dist-tags.latest for ${pkgName} (exit ${result.status}): ${combined.trim()}`);
  }

  const currentLatest = (result.stdout ?? '').trim();
  if (!currentLatest) {
    return 'latest';
  }

  // Incoming release is always stable X.Y.Z; per SemVer 2.0.0, X.Y.Z >= X.Y.Z-prerelease and X.Y.Z < higherBase-prerelease.
  const latestMatch = FEED_SEMVER_PATTERN.exec(currentLatest);
  if (!latestMatch) {
    throw new Error(`Unexpected dist-tags.latest value '${currentLatest}' for ${pkgName}.`);
  }

  return compareSemver(targetVersion, latestMatch[1]) < 0 ? 'hotfix' : 'latest';
}

function publishRelease(env, { run = spawnSync, log = console.log } = {}) {
  const version = parseReleaseVersion(env.RELEASE_VERSION);
  const tarballDir = env.TARBALL_DIR;
  const npmrc = env.PUBLISH_NPMRC;
  const registry = env.NPM_REGISTRY || DEFAULT_REGISTRY;

  if (!tarballDir || !fs.existsSync(tarballDir)) {
    throw new Error(`Tarball directory does not exist: ${tarballDir ?? '(unset)'}`);
  }
  if (!npmrc || !fs.existsSync(npmrc)) {
    throw new Error(`Authenticated .npmrc file does not exist: ${npmrc ?? '(unset)'}`);
  }

  let published = 0;
  let skipped = 0;

  for (const pkg of PACKAGES) {
    const spec = `${pkg.name}@${version}`;
    const tarball = path.join(tarballDir, tarballName(pkg.name, version));
    if (!fs.existsSync(tarball)) {
      throw new Error(`Missing tarball for ${spec}: ${tarball}`);
    }

    if (isVersionInFeed(pkg.name, version, { registry, npmrc, cwd: tarballDir, run })) {
      log(`Skipping ${spec} (already exists in feed).`);
      skipped += 1;
      continue;
    }

    const distTag = resolvePublishDistTag(pkg.name, version, registry, npmrc, run, { cwd: tarballDir });
    log(`Publishing ${spec} with dist-tag '${distTag}'...`);
    runCommand(
      'npm',
      ['publish', tarball, '--tag', distTag, '--registry', registry, '--userconfig', npmrc],
      { cwd: tarballDir, stdio: 'inherit', timeout: 180_000 },
      run
    );
    log(`Published ${spec} with dist-tag '${distTag}'.`);
    published += 1;
  }

  log(`Publish complete for ${version}: ${published} published, ${skipped} skipped.`);
  return { version, published, skipped };
}

function main([command, ...rest] = process.argv.slice(2), env = process.env, options = {}) {
  if (rest.length > 0) {
    throw new Error('Unexpected arguments. Usage: node scripts/ado-npm-publisher.cjs <build|publish>');
  }
  if (command === 'build') {
    return buildRelease(env, options);
  }
  if (command === 'publish') {
    return publishRelease(env, options);
  }
  throw new Error(`Unknown command '${command ?? ''}'. Expected 'build' or 'publish'.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_REGISTRY,
  PACKAGES,
  PNPM_MIRROR_BASE,
  bootstrapPnpm,
  buildRelease,
  compareSemver,
  isVersionInFeed,
  main,
  parseReleaseVersion,
  publishRelease,
  resolvePublishDistTag,
  resolveReleaseTag,
  tarballName,
};
