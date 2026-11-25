const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const {
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
} = require('./ado-npm-publisher.cjs');

const tempDirs = [];

function createTempDir(prefix = 'ado-npm-publisher-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}${randomUUID()}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function git(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function createSampleRepo({ tag, annotated = false, packageManager } = {}) {
  const repoRoot = createTempDir('repo-');
  git(['init'], repoRoot);
  fs.writeFileSync(
    path.join(repoRoot, 'package.json'),
    `${JSON.stringify({ name: '@microsoft/logicappsux', version: '0.0.0', packageManager }, null, 2)}\n`
  );
  for (const pkg of PACKAGES) {
    const pkgDir = path.join(repoRoot, pkg.directory);
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), `${JSON.stringify({ name: pkg.name, version: '0.0.0' }, null, 2)}\n`);
  }
  git(['add', '.'], repoRoot);
  git(['commit', '-m', 'Initial commit'], repoRoot);
  const commitSha = git(['rev-parse', 'HEAD'], repoRoot);
  if (tag) {
    if (annotated) {
      git(['tag', '-a', tag, '-m', `Release ${tag}`], repoRoot);
    } else {
      git(['tag', tag], repoRoot);
    }
  }
  return { repoRoot, commitSha };
}

test('parseReleaseVersion accepts valid semver and rejects invalid inputs', () => {
  assert.equal(parseReleaseVersion('5.1024.0'), '5.1024.0');
  assert.equal(parseReleaseVersion(' 5.1024.1 '), '5.1024.1');
  for (const bad of ['', 'v5.1024.0', '5.1024', '5.1024.0-beta.1', '01.2.3', null, undefined]) {
    assert.throws(() => parseReleaseVersion(bad), /Invalid releaseVersion/);
  }
});

test('compareSemver compares X.Y.Z versions numerically and rejects invalid inputs', () => {
  assert.equal(compareSemver('5.1024.0', '5.1024.0'), 0);
  assert.equal(compareSemver('5.1024.0', '5.999.0'), 1);
  assert.equal(compareSemver('5.999.0', '5.1024.0'), -1);
  assert.equal(compareSemver('2.9999.0', '5.1024.0'), -1);
  assert.equal(compareSemver('5.1024.1', '5.1024.0'), 1);
  assert.equal(compareSemver('5.1024.0', '5.1024.1'), -1);
  assert.throws(() => compareSemver('5.1024.0', 'not-semver'), /Invalid releaseVersion/);
});

test('tarballName formats scoped package names as pnpm pack filenames', () => {
  assert.equal(tarballName('@microsoft/logic-apps-shared', '5.1024.0'), 'microsoft-logic-apps-shared-5.1024.0.tgz');
  assert.equal(tarballName('@microsoft/designer-ui-v2', '5.1024.0'), 'microsoft-designer-ui-v2-5.1024.0.tgz');
});

test('resolveReleaseTag resolves lightweight and annotated tags and fails clearly when missing', () => {
  const lightweight = createSampleRepo({ tag: 'v5.1024.0', annotated: false });
  assert.deepEqual(resolveReleaseTag(lightweight.repoRoot, '5.1024.0'), {
    tag: 'v5.1024.0',
    ref: 'refs/tags/v5.1024.0',
    commitSha: lightweight.commitSha,
  });

  const annotated = createSampleRepo({ tag: 'v5.1025.0', annotated: true });
  assert.deepEqual(resolveReleaseTag(annotated.repoRoot, '5.1025.0'), {
    tag: 'v5.1025.0',
    ref: 'refs/tags/v5.1025.0',
    commitSha: annotated.commitSha,
  });

  assert.throws(() => resolveReleaseTag(lightweight.repoRoot, '5.9999.0'), /Release tag 'v5\.9999\.0' was not found/);
});

test('bootstrapPnpm downloads pnpm from the 1ES mirror and verifies optional SHA-512 pin', () => {
  const archivePayload = Buffer.from('fake-pnpm-tarball');
  const sha512 = createHash('sha512').update(archivePayload).digest('hex');

  const sourceRoot = createTempDir('src-');
  const pnpmHome = createTempDir('pnpm-');
  fs.writeFileSync(path.join(sourceRoot, 'package.json'), JSON.stringify({ packageManager: `pnpm@9.1.3+sha512.${sha512}` }));

  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, args]);
    if (cmd === 'curl') {
      const outputIndex = args.indexOf('--output');
      fs.writeFileSync(args[outputIndex + 1], archivePayload);
    }
    return { status: 0 };
  };

  const { pnpmBin, binDir } = bootstrapPnpm(sourceRoot, pnpmHome, run);
  assert.equal(calls[0][0], 'curl');
  assert.equal(calls[0][1].at(-1), `${PNPM_MIRROR_BASE}/pnpm/-/pnpm-9.1.3.tgz`);
  assert.equal(calls[1][0], 'tar');
  assert.equal(pnpmBin, path.join(binDir, 'pnpm'));
  assert.equal(fs.readlinkSync(pnpmBin), path.join(pnpmHome, 'package', 'bin', 'pnpm.cjs'));

  // Reject mismatched SHA-512 pin
  const badHome = createTempDir('pnpm-bad-');
  fs.writeFileSync(path.join(sourceRoot, 'package.json'), JSON.stringify({ packageManager: `pnpm@9.1.3+sha512.${'0'.repeat(128)}` }));
  assert.throws(() => bootstrapPnpm(sourceRoot, badHome, run), /SHA-512 does not match/);

  // Accept version-only packageManager without a hash suffix
  const noHashHome = createTempDir('pnpm-nohash-');
  fs.writeFileSync(path.join(sourceRoot, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
  const result = bootstrapPnpm(sourceRoot, noHashHome, run);
  assert.equal(fs.readlinkSync(result.pnpmBin), path.join(noHashHome, 'package', 'bin', 'pnpm.cjs'));
});

test('buildRelease checks out release tag, builds, packs all 9 packages, and writes .npmrc', () => {
  const archivePayload = Buffer.from('fake-pnpm-archive');
  const sha512 = createHash('sha512').update(archivePayload).digest('hex');
  const { repoRoot, commitSha } = createSampleRepo({
    tag: 'v5.1024.0',
    annotated: true,
    packageManager: `pnpm@9.1.3+sha512.${sha512}`,
  });

  const agentTmp = createTempDir('tmp-');
  const scanRoot = createTempDir('scan-');
  const tarballDir = path.join(agentTmp, 'tarballs');
  const publishNpmrc = path.join(agentTmp, 'npm-publish', '.npmrc');
  const commands = [];
  const logs = [];

  const run = (cmd, args, options) => {
    commands.push({ cmd, args, cwd: options?.cwd });
    if (cmd === 'git') {
      return spawnSync(cmd, args, options);
    }
    if (cmd === 'curl') {
      fs.writeFileSync(args[args.indexOf('--output') + 1], archivePayload);
      return { status: 0 };
    }
    if (cmd === 'tar') {
      return { status: 0 };
    }
    if (cmd === process.execPath && args[0] === 'scripts/update-versions.js') {
      // Simulate version update in the detached worktree
      const pkgPath = path.join(options.cwd, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = args[1];
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      return { status: 0 };
    }
    if (cmd.endsWith(`${path.sep}pnpm`) && args[2] === 'pack') {
      const pkgDir = args[1];
      const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
      const dest = args[args.indexOf('--pack-destination') + 1];
      fs.writeFileSync(path.join(dest, tarballName(pkgJson.name, '5.1024.0')), 'tgz-bytes');
      return { status: 0 };
    }
    return { status: 0 };
  };

  const result = buildRelease(
    {
      RELEASE_VERSION: '5.1024.0',
      AGENT_TMP: agentTmp,
      RELEASE_SCAN_ROOT: scanRoot,
      TARBALL_DIR: tarballDir,
      NPM_REGISTRY: DEFAULT_REGISTRY,
      PUBLISH_NPMRC: publishNpmrc,
    },
    { run, log: msg => logs.push(msg), repoRoot }
  );

  assert.equal(result.version, '5.1024.0');
  assert.equal(result.commitSha, commitSha);

  // Verify build steps ran in order
  const pnpmCalls = commands.filter(c => c.cmd.endsWith(`${path.sep}pnpm`)).map(c => c.args);
  assert.deepEqual(pnpmCalls[0], ['install', '--recursive', '--frozen-lockfile', '--strict-peer-dependencies']);
  assert.deepEqual(pnpmCalls[1], ['run', 'build:lib']);
  assert.equal(pnpmCalls.filter(a => a[2] === 'pack').length, PACKAGES.length);

  assert.ok(commands.some(c => c.cmd === process.execPath && c.args[0] === 'scripts/update-versions.js' && c.args[1] === '5.1024.0'));

  // All 9 tarballs exist and .npmrc was prepared for npmAuthenticate
  for (const pkg of PACKAGES) {
    assert.ok(fs.existsSync(path.join(tarballDir, tarballName(pkg.name, '5.1024.0'))));
  }
  assert.equal(fs.readFileSync(publishNpmrc, 'utf8'), `registry=${DEFAULT_REGISTRY}\n`);

  // Retained release-source worktree for Component Governance has tracked files restored
  const retainedRoot = path.join(scanRoot, 'release-source');
  assert.ok(fs.existsSync(retainedRoot));
  assert.equal(JSON.parse(fs.readFileSync(path.join(retainedRoot, 'package.json'), 'utf8')).version, '0.0.0');
});

test('isVersionInFeed handles present, empty-stdout absent, 404 absent, and unexpected errors', () => {
  const baseOpts = { registry: DEFAULT_REGISTRY, npmrc: '/tmp/.npmrc', cwd: '/tmp' };

  assert.equal(
    isVersionInFeed('@microsoft/logic-apps-shared', '5.1024.0', {
      ...baseOpts,
      run: () => ({ status: 0, stdout: '5.1024.0\n', stderr: '' }),
    }),
    true
  );

  // Package exists in feed, target version does not -> npm view exits 0 with empty stdout
  assert.equal(
    isVersionInFeed('@microsoft/logic-apps-shared', '5.1024.0', {
      ...baseOpts,
      run: () => ({ status: 0, stdout: '', stderr: '' }),
    }),
    false
  );

  // Brand-new package not in feed -> npm view exits 1 with E404
  assert.equal(
    isVersionInFeed('@microsoft/logic-apps-shared', '5.1024.0', {
      ...baseOpts,
      run: () => ({ status: 1, stdout: '', stderr: 'npm error code E404\nnpm error 404 Not Found' }),
    }),
    false
  );

  // Auth failure must throw instead of falsely treating package as absent
  assert.throws(
    () =>
      isVersionInFeed('@microsoft/logic-apps-shared', '5.1024.0', {
        ...baseOpts,
        run: () => ({ status: 1, stdout: '', stderr: 'npm error code E401\nnpm error Unable to authenticate' }),
      }),
    /Failed to check @microsoft\/logic-apps-shared@5\.1024\.0 in feed/
  );
});

test('resolvePublishDistTag selects latest or hotfix and throws on unexpected feed errors', () => {
  const pkgName = '@microsoft/logic-apps-shared';
  const npmrc = '/tmp/.npmrc';

  // version > currentLatest -> latest
  const seenCalls = [];
  assert.equal(
    resolvePublishDistTag(pkgName, '5.1025.0', DEFAULT_REGISTRY, npmrc, (cmd, args) => {
      seenCalls.push({ cmd, args });
      return { status: 0, stdout: '5.1024.0\n', stderr: '' };
    }),
    'latest'
  );
  assert.equal(seenCalls[0].cmd, 'npm');
  assert.deepEqual(seenCalls[0].args, [
    'view',
    pkgName,
    'dist-tags.latest',
    '--registry',
    DEFAULT_REGISTRY,
    '--userconfig',
    npmrc,
    '--prefer-online',
    '--tag=latest',
    '--json=false',
  ]);

  // version === currentLatest -> latest
  assert.equal(
    resolvePublishDistTag(pkgName, '5.1024.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '5.1024.0\n',
      stderr: '',
    })),
    'latest'
  );

  // Prerelease tagged latest: same-base stable promotes latest, higher-base prerelease uses hotfix
  assert.equal(
    resolvePublishDistTag(pkgName, '5.1024.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '5.1024.0-rc.1\n',
      stderr: '',
    })),
    'latest'
  );
  assert.equal(
    resolvePublishDistTag(pkgName, '5.1024.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '5.1025.0-rc.1\n',
      stderr: '',
    })),
    'hotfix'
  );

  // version < currentLatest -> hotfix (never downgrade latest)
  assert.equal(
    resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '5.1024.0\n',
      stderr: '',
    })),
    'hotfix'
  );
  assert.equal(
    resolvePublishDistTag(pkgName, '5.1023.1', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '5.1024.0\n',
      stderr: '',
    })),
    'hotfix'
  );

  // Package not found (404) or missing dist-tags.latest (empty stdout) -> latest
  assert.equal(
    resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 1,
      stdout: '',
      stderr: 'npm error code E404\nnpm error 404 Not Found',
    })),
    'latest'
  );
  assert.equal(
    resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
      status: 0,
      stdout: '',
      stderr: '',
    })),
    'latest'
  );

  // Non-404 feed error must throw instead of silently downgrading latest (including E502 mentioning 404 in body)
  assert.throws(
    () =>
      resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
        status: 1,
        stdout: '',
        stderr: 'npm error code E401\nnpm error Unable to authenticate',
      })),
    /Failed to resolve dist-tags\.latest for @microsoft\/logic-apps-shared/
  );
  assert.throws(
    () =>
      resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
        status: 1,
        stdout: '',
        stderr: 'npm error code E502\nnpm error Upstream returned 404 Not Found',
      })),
    /Failed to resolve dist-tags\.latest for @microsoft\/logic-apps-shared/
  );
  assert.throws(
    () =>
      resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
        error: new Error('ETIMEDOUT'),
      })),
    /Failed to resolve dist-tags\.latest for @microsoft\/logic-apps-shared: ETIMEDOUT/
  );
  assert.throws(
    () =>
      resolvePublishDistTag(pkgName, '2.9999.0', DEFAULT_REGISTRY, npmrc, () => ({
        status: 0,
        stdout: '"5.1024.0"\n',
        stderr: '',
      })),
    /Unexpected dist-tags\.latest value/
  );
});

test('publishRelease skips packages already in feed and publishes missing packages without post-publish readback', () => {
  const version = '5.1024.0';
  const tarballDir = createTempDir('tarballs-');
  const npmrc = path.join(createTempDir('npmrc-'), '.npmrc');
  fs.writeFileSync(npmrc, `registry=${DEFAULT_REGISTRY}\n`);

  for (const pkg of PACKAGES) {
    fs.writeFileSync(path.join(tarballDir, tarballName(pkg.name, version)), 'tgz-bytes');
  }

  const alreadyInFeed = new Set([
    '@microsoft/logic-apps-shared',
    '@microsoft/designer-ui',
    '@microsoft/designer-ui-v2',
  ]);
  const calls = [];
  const logs = [];

  const run = (cmd, args, options) => {
    calls.push({ cmd, args, stdio: options?.stdio });
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'version') {
      const pkgName = args[1].slice(0, args[1].lastIndexOf('@'));
      return alreadyInFeed.has(pkgName)
        ? { status: 0, stdout: `${version}\n`, stderr: '' }
        : { status: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'dist-tags.latest') {
      return { status: 0, stdout: '5.1023.0\n', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'publish') {
      return { status: 0 };
    }
    throw new Error(`Unexpected command: ${cmd} ${args.join(' ')}`);
  };

  const result = publishRelease(
    {
      RELEASE_VERSION: version,
      TARBALL_DIR: tarballDir,
      PUBLISH_NPMRC: npmrc,
      NPM_REGISTRY: DEFAULT_REGISTRY,
    },
    { run, log: msg => logs.push(msg) }
  );

  assert.deepEqual(result, { version, published: 6, skipped: 3 });

  const versionViewCalls = calls.filter(c => c.args[0] === 'view' && c.args[2] === 'version');
  const distTagViewCalls = calls.filter(c => c.args[0] === 'view' && c.args[2] === 'dist-tags.latest');
  const publishCalls = calls.filter(c => c.args[0] === 'publish');

  // Exactly one pre-publish version view per package, one dist-tag lookup per published package, and no post-publish readback
  assert.equal(versionViewCalls.length, PACKAGES.length);
  assert.equal(distTagViewCalls.length, PACKAGES.length - alreadyInFeed.size);
  assert.equal(publishCalls.length, PACKAGES.length - alreadyInFeed.size);
  assert.equal(calls.filter(c => c.args[0] === 'pack').length, 0);

  // Every publish call uses --tag latest and normal visible stdout/stderr (stdio: 'inherit')
  for (const call of publishCalls) {
    assert.equal(call.stdio, 'inherit');
    assert.ok(call.args.includes('--tag'));
    assert.equal(call.args[call.args.indexOf('--tag') + 1], 'latest');
    assert.equal(call.args[call.args.indexOf('--registry') + 1], DEFAULT_REGISTRY);
    assert.equal(call.args[call.args.indexOf('--userconfig') + 1], npmrc);
  }
  assert.ok(logs.some(line => line.includes("dist-tag 'latest'")));
});

test('publishRelease uses --tag hotfix when version is older than feed latest and --tag latest on 404', () => {
  const version = '2.9999.0';
  const tarballDir = createTempDir('tarballs-hotfix-');
  const npmrc = path.join(createTempDir('npmrc-hotfix-'), '.npmrc');
  fs.writeFileSync(npmrc, `registry=${DEFAULT_REGISTRY}\n`);

  for (const pkg of PACKAGES) {
    fs.writeFileSync(path.join(tarballDir, tarballName(pkg.name, version)), 'tgz-bytes');
  }

  const brandNewPackage = '@microsoft/vscode-extension-logic-apps';
  const publishTagsByTarball = new Map();
  const logs = [];

  const run = (cmd, args) => {
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'version') {
      return { status: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'dist-tags.latest') {
      if (args[1] === brandNewPackage) {
        return { status: 1, stdout: '', stderr: 'npm error code E404\nnpm error 404 Not Found' };
      }
      return { status: 0, stdout: '5.1024.0\n', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'publish') {
      publishTagsByTarball.set(path.basename(args[1]), args[args.indexOf('--tag') + 1]);
      return { status: 0 };
    }
    throw new Error(`Unexpected command: ${cmd} ${args.join(' ')}`);
  };

  const result = publishRelease(
    {
      RELEASE_VERSION: version,
      TARBALL_DIR: tarballDir,
      PUBLISH_NPMRC: npmrc,
      NPM_REGISTRY: DEFAULT_REGISTRY,
    },
    { run, log: msg => logs.push(msg) }
  );

  assert.deepEqual(result, { version, published: PACKAGES.length, skipped: 0 });
  for (const pkg of PACKAGES) {
    const expectedTag = pkg.name === brandNewPackage ? 'latest' : 'hotfix';
    assert.equal(publishTagsByTarball.get(tarballName(pkg.name, version)), expectedTag);
  }
  assert.ok(logs.some(line => line.includes("dist-tag 'hotfix'")));
  assert.ok(logs.some(line => line.includes("dist-tag 'latest'")));
});

test('publishRelease aborts before publishing if dist-tags.latest lookup fails with a non-404 error', () => {
  const version = '2.9999.0';
  const tarballDir = createTempDir('tarballs-tag-err-');
  const npmrc = path.join(createTempDir('npmrc-tag-err-'), '.npmrc');
  fs.writeFileSync(npmrc, `registry=${DEFAULT_REGISTRY}\n`);

  for (const pkg of PACKAGES) {
    fs.writeFileSync(path.join(tarballDir, tarballName(pkg.name, version)), 'tgz-bytes');
  }

  let publishCalled = false;
  const run = (cmd, args) => {
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'version') {
      return { status: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'dist-tags.latest') {
      return { status: 1, stdout: '', stderr: 'npm error code E500\nnpm error Internal Server Error' };
    }
    if (cmd === 'npm' && args[0] === 'publish') {
      publishCalled = true;
      return { status: 0 };
    }
    throw new Error(`Unexpected command: ${cmd} ${args.join(' ')}`);
  };

  assert.throws(
    () =>
      publishRelease(
        {
          RELEASE_VERSION: version,
          TARBALL_DIR: tarballDir,
          PUBLISH_NPMRC: npmrc,
          NPM_REGISTRY: DEFAULT_REGISTRY,
        },
        { run, log: () => {} }
      ),
    /Failed to resolve dist-tags\.latest/
  );
  assert.equal(publishCalled, false);
});

test('publishRelease fails clearly when npm publish exits non-zero or files are missing', () => {
  const version = '5.1024.0';
  const tarballDir = createTempDir('tarballs-fail-');
  const npmrc = path.join(createTempDir('npmrc-fail-'), '.npmrc');
  fs.writeFileSync(npmrc, `registry=${DEFAULT_REGISTRY}\n`);

  // Missing tarball
  assert.throws(
    () => publishRelease({ RELEASE_VERSION: version, TARBALL_DIR: tarballDir, PUBLISH_NPMRC: npmrc }),
    /Missing tarball/
  );

  // Missing .npmrc
  assert.throws(
    () => publishRelease({ RELEASE_VERSION: version, TARBALL_DIR: tarballDir, PUBLISH_NPMRC: '/nonexistent/.npmrc' }),
    /Authenticated \.npmrc file does not exist/
  );

  // npm publish failure stops immediately
  for (const pkg of PACKAGES) {
    fs.writeFileSync(path.join(tarballDir, tarballName(pkg.name, version)), 'tgz-bytes');
  }
  const run = (cmd, args) => {
    if (cmd === 'npm' && args[0] === 'view') {
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1 };
  };
  assert.throws(
    () => publishRelease({ RELEASE_VERSION: version, TARBALL_DIR: tarballDir, PUBLISH_NPMRC: npmrc }, { run, log: () => {} }),
    /npm publish failed \(exit 1\)/
  );
});

test('main validates command arguments', () => {
  assert.throws(() => main(['unknown']), /Unknown command/);
  assert.throws(() => main(['build', 'extra']), /Unexpected arguments/);
});

test('npm-publish.yml keeps 1ES Official template, WIF auth, branch gate, and single Publish stage', () => {
  const yaml = fs.readFileSync(path.join(__dirname, '..', '.azure-pipelines', 'npm-publish.yml'), 'utf8');
  assert.match(yaml, /template:\s*v1\/1ES\.Official\.PipelineTemplate\.yml@1esPipelines/);
  assert.match(yaml, /ref:\s*refs\/tags\/release/);
  assert.match(yaml, /name:\s*Azure-Pipelines-1ESPT-ExDShared/);
  assert.match(yaml, /useAgentBuildDirectory:\s*true/);
  assert.match(yaml, /workloadIdentityServiceConnection:\s*21d5a1d8-11d3-425c-8d3a-e7f088725481/);
  assert.match(yaml, /feedUrl:\s*'https:\/\/pkgs\.dev\.azure\.com\/msazure\/One\/_packaging\/microsoft-logic-apps\/npm\/registry\/'/);
  assert.match(
    yaml,
    /and\(succeeded\(\),\s*or\(eq\(variables\['Build\.SourceBranch'\],\s*'refs\/heads\/main'\),\s*startsWith\(variables\['Build\.SourceBranch'\],\s*'refs\/heads\/hotfix\/v'\)\)\)/
  );
  assert.match(yaml, /- stage:\s*Publish/);
  assert.match(yaml, /- job:\s*BuildAndPublish/);
  assert.doesNotMatch(yaml, /VerifyRelease|ProductionPublishNotActivated|npm-verify-release/);
});

test('version-release.yml triggers Otto ADO npm publish, guards Azure login, and removes legacy npm steps', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'version-release.yml');
  const yaml = fs.readFileSync(workflowPath, 'utf8');

  // Legacy npm publishing steps must be removed from build-and-publish
  assert.doesNotMatch(yaml, /Generate NPMRC|Publish to NPM|productionNpmRCCreator\.js/);
  assert.doesNotMatch(yaml, /# NPM Publishing/);

  // No hardcoded SAS tokens or Otto Container Apps URLs anywhere in the workflow
  assert.doesNotMatch(yaml, /sig=/i);
  assert.doesNotMatch(yaml, /azurecontainerapps\.io/i);

  // Azure login in build-and-publish must be gated on enable_blob_upload == 'true'
  const azureLoginBlock = yaml.match(/- name:\s*'Azure login'[\s\S]*?(?=\n\s*- name:|\n  [a-z-]+:|$)/);
  assert.ok(azureLoginBlock, 'Expected Azure login step in version-release.yml');
  assert.match(azureLoginBlock[0], /if:\s*\$\{\{\s*github\.event\.inputs\.enable_blob_upload\s*==\s*'true'\s*\}\}/);

  // publish-npm job invariants
  const publishNpmIndex = yaml.indexOf('\n  publish-npm:\n');
  assert.notEqual(publishNpmIndex, -1, 'Expected publish-npm job in version-release.yml');
  const publishNpmSection = yaml.slice(publishNpmIndex);

  assert.match(publishNpmSection, /needs:\s*create-release/);
  assert.match(publishNpmSection, /runs-on:\s*ubuntu-latest/);
  assert.match(publishNpmSection, /environment:\s*E2ETesting/);
  assert.match(publishNpmSection, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(publishNpmSection, /OTTO_WORKFLOW_URL:\s*\$\{\{\s*secrets\.OTTO_NPM_PUBLISH_WORKFLOW_URL\s*\}\}/);
  assert.match(publishNpmSection, /dryRun:\s*false/);

  // All GitHub expressions in publish-npm must be bound via env:, never interpolated in run:
  assert.match(publishNpmSection, /RELEASE_VERSION:\s*\$\{\{\s*needs\.create-release\.outputs\.new_version\s*\}\}/);
  assert.match(publishNpmSection, /TAG_NAME:\s*\$\{\{\s*needs\.create-release\.outputs\.tag_name\s*\}\}/);
  assert.match(publishNpmSection, /SOURCE_BRANCH:\s*\$\{\{\s*github\.ref\s*\}\}/);
  assert.match(publishNpmSection, /REPOSITORY:\s*\$\{\{\s*github\.repository\s*\}\}/);
  assert.match(
    publishNpmSection,
    /GITHUB_RUN_URL:\s*\$\{\{\s*github\.server_url\s*\}\}\/\$\{\{\s*github\.repository\s*\}\}\/actions\/runs\/\$\{\{\s*github\.run_id\s*\}\}/
  );

  // Single step in publish-npm
  const publishNpmSteps = publishNpmSection.match(/\n      - name:/g) || [];
  assert.equal(publishNpmSteps.length, 1, 'Expected exactly one step in publish-npm job');
  assert.match(publishNpmSection, /- name:\s*'Trigger ADO npm publish via Otto'/);

  const runBlockIndex = publishNpmSection.indexOf('\n        run: |');
  assert.notEqual(runBlockIndex, -1, 'Expected run block in publish-npm job');
  const runBlock = publishNpmSection.slice(runBlockIndex);
  assert.doesNotMatch(runBlock, /\$\{\{/);
  assert.match(runBlock, /trap 'rm -f "\$RESP_FILE"' EXIT/);

  // curl must POST silently with retry/timeout flags and without -S/--show-error or -v/--verbose
  const curlInvocation = runBlock.match(/curl[\s\S]*?"\$OTTO_WORKFLOW_URL"/);
  assert.ok(curlInvocation, 'Expected curl invocation targeting "$OTTO_WORKFLOW_URL"');
  assert.match(curlInvocation[0], /(?:^|\s)-s(?:\s|$)/);
  assert.match(curlInvocation[0], /-X POST/);
  assert.match(curlInvocation[0], /--connect-timeout 15/);
  assert.match(curlInvocation[0], /--max-time 60/);
  assert.match(curlInvocation[0], /--retry 2/);
  assert.match(curlInvocation[0], /--retry-delay 5/);
  assert.match(curlInvocation[0], /--retry-connrefused/);
  assert.doesNotMatch(curlInvocation[0], /(?:^|\s)(?:-[A-Za-z]*[Sv]|--verbose|--show-error)(?:\s|$)/);
});
