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
  isVersionInFeed,
  main,
  parseReleaseVersion,
  publishRelease,
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
    if (cmd === 'npm' && args[0] === 'view') {
      const pkgName = args[1].slice(0, args[1].lastIndexOf('@'));
      return alreadyInFeed.has(pkgName)
        ? { status: 0, stdout: `${version}\n`, stderr: '' }
        : { status: 0, stdout: '', stderr: '' };
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

  const viewCalls = calls.filter(c => c.args[0] === 'view');
  const publishCalls = calls.filter(c => c.args[0] === 'publish');

  // Exactly one pre-publish view per package (no post-publish view or pack readback)
  assert.equal(viewCalls.length, PACKAGES.length);
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
