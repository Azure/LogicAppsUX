/* global module, process, require */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verify, CONTENT_MANIFEST_NAME } = require('./prepare-e2e-extension-dependencies');
const { validOriginalIdentity, sameOriginalIdentity, originalProcessReleased } = require('./vscode-lifecycle-identity');
const { currentRuntimeProof, currentLogScope, loggedResources } = require('./vscode-lifecycle-observer');

const launches = [];
const normalizedPath = (file, platform = process.platform) =>
  platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
const read = (file) => {
  assert.ok(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink(), 'Lifecycle producer receipt must be a real file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

function resolveTestUserDataDir(projectDirectory, env = process.env, { temporaryDirectory = os.tmpdir(), pid = process.pid } = {}) {
  if (env.LA_E2E_CLI_USER_DATA_DIR?.trim()) return path.resolve(env.LA_E2E_CLI_USER_DATA_DIR);
  const suffix = env.LA_E2E_CLI_USER_DATA_SUFFIX?.trim() || String(pid);
  if (env.LA_E2E_CLI_USER_DATA_PARENT?.trim()) return path.resolve(env.LA_E2E_CLI_USER_DATA_PARENT, `user-data-${suffix}`);
  const checkoutHash = crypto.createHash('sha1').update(path.resolve(projectDirectory)).digest('hex').slice(0, 8);
  // Code's native output logger cannot create long Windows paths even when
  // Node's fs can. Keep default profiles outside the long checkout, without
  // changing explicit owner-provided paths or fabricating a logger receipt.
  return path.join(temporaryDirectory, `la-vscode-test-${checkoutHash}-${suffix}`);
}

function assertLaunchProfile(env, args) {
  const profiles = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--user-data-dir') profiles.push(args[++index]);
    else if (args[index].startsWith('--user-data-dir=')) profiles.push(args[index].slice('--user-data-dir='.length));
  }
  if (!profiles.length) return;
  assert.equal(profiles.length, 1, 'Actual launch has ambiguous user-data profiles');
  assert.ok(profiles[0] && path.isAbsolute(profiles[0]), 'Actual launch profile must be absolute');
  assert.ok(env.LA_E2E_CLI_USER_DATA_DIR && path.isAbsolute(env.LA_E2E_CLI_USER_DATA_DIR), 'Actual launch observer profile is missing');
  assert.equal(normalizedPath(profiles[0]), normalizedPath(env.LA_E2E_CLI_USER_DATA_DIR), 'Actual launch argv/observer profiles differ');
}

function bindLifecycleProfile(env, args) {
  assertLaunchProfile(env, args);
  if (!env.LA_E2E_LIFECYCLE_DIR) return env;
  const binding = read(path.join(env.LA_E2E_LIFECYCLE_DIR, 'binding.json'));
  assert.equal(binding.invocation, env.LA_E2E_LIFECYCLE_INVOCATION);
  const receipt = path.join(env.LA_E2E_LIFECYCLE_DIR, `${crypto.randomUUID()}.profile.launch.json`);
  fs.writeFileSync(
    receipt,
    JSON.stringify({
      invocation: binding.invocation,
      profile: env.LA_E2E_CLI_USER_DATA_DIR || '',
      requiredWorkspace: env.LA_E2E_LIFECYCLE_STARTUP_WORKSPACE || '',
    }),
    { flag: 'wx' }
  );
  return { ...env, LA_E2E_LIFECYCLE_PRODUCER_BINDING: receipt };
}

function prepareLifecycleLaunch(reportsRoot, env = process.env) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(reportsRoot, '.lifecycle-')));
  const invocation = crypto.randomUUID();
  const launch = { directory, invocation, env, nextStartupLink: path.join(directory, 'next-startup.json') };
  fs.writeFileSync(
    path.join(directory, 'producer-binding.json'),
    JSON.stringify({
      invocation,
      profile: env.LA_E2E_CLI_USER_DATA_DIR || '',
      requiredWorkspace: env.LA_E2E_LIFECYCLE_STARTUP_WORKSPACE || '',
    }),
    { flag: 'wx' }
  );
  let parent;
  if (env.LA_E2E_LIFECYCLE_DIR) {
    const binding = read(path.join(env.LA_E2E_LIFECYCLE_DIR, 'binding.json'));
    assert.equal(binding.invocation, env.LA_E2E_LIFECYCLE_INVOCATION, 'Nested native parent invocation differs');
    parent = { directory: env.LA_E2E_LIFECYCLE_DIR, ...binding };
    fs.writeFileSync(
      path.join(parent.directory, `child-${invocation}.launch.json`),
      JSON.stringify({
        directory,
        invocation,
        parentInvocation: parent.invocation,
        parentRootPid: parent.rootPid,
      }),
      { flag: 'wx' }
    );
  }
  // Link only the immediately subsequent real launch, not a success flag.
  for (const previous of launches.filter((candidate) => candidate.closed && candidate.requiresStartup && !candidate.linked)) {
    fs.writeFileSync(previous.nextStartupLink, JSON.stringify({ directory, invocation }), { flag: 'wx' });
    previous.linked = true;
  }
  launches.push(launch);
  launch.environment = {
    ...env,
    LA_E2E_LIFECYCLE_DIR: directory,
    LA_E2E_LIFECYCLE_INVOCATION: invocation,
    LA_E2E_LIFECYCLE_PRODUCER_BINDING: path.join(directory, 'producer-binding.json'),
    LA_E2E_LIFECYCLE_PARENT_DIR: parent?.directory || '',
    LA_E2E_LIFECYCLE_PARENT_INVOCATION: parent?.invocation || '',
  };
  return launch;
}

function observerRecords(directory, binding) {
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.observer.jsonl'))
    .flatMap((file) => {
      const full = path.join(directory, file);
      assert.ok(fs.lstatSync(full).isFile() && !fs.lstatSync(full).isSymbolicLink());
      return fs
        .readFileSync(full, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const record = JSON.parse(line);
          assert.equal(record.schemaVersion, 1);
          assert.equal(record.invocation, binding.invocation);
          assert.equal(record.rootPid, binding.rootPid);
          return record;
        });
    });
}

function physicalInstalledPath(file, platform) {
  assert.ok(path.isAbsolute(file), 'Installed payload path must be absolute');
  let current = path.resolve(file);
  while (true) {
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Installed payload path must not traverse a link');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  assert.equal(normalizedPath(fs.realpathSync(file), platform), normalizedPath(file, platform), 'Installed payload path is foreign');
  return fs.lstatSync(file, { bigint: true });
}

function installedPayloadOwners(closure, launch, platform = process.platform) {
  const seed = launch.env.LA_E2E_CLI_PREPARED_EXTENSIONS_DIR || launch.env.LA_E2E_CLI_EXTENSIONS_DIR;
  assert.ok(seed && path.isAbsolute(seed), 'Validated prepared extension seed is required for dependency ownership');
  assert.ok(fs.lstatSync(seed).isDirectory() && !fs.lstatSync(seed).isSymbolicLink(), 'Prepared seed must be a real directory');
  assert.equal(fs.realpathSync(seed), path.resolve(seed), 'Prepared seed path must not traverse a link');
  const manifestPath = path.join(seed, CONTENT_MANIFEST_NAME);
  const seedManifest = read(manifestPath);
  const manifest = verify({
    extensionsDir: seed,
    vscodeVersion: launch.env.LA_E2E_CLI_VSCODE_VERSION || seedManifest.vscodeVersion,
    platform,
    arch: process.arch,
    rebuildRegistry: false,
  });
  const csharp = manifest.extensions.filter((extension) => extension.id === 'ms-dotnettools.csharp');
  assert.equal(csharp.length, 1, 'Exactly one validated C# installation is required');
  const installation = csharp[0];
  const installed = launch.env.LA_E2E_CLI_EXTENSIONS_DIR;
  assert.ok(installed && path.isAbsolute(installed), 'Physical installed extensions root is required');
  assert.ok(physicalInstalledPath(installed, platform).isDirectory(), 'Installed extensions root must be a directory');
  const root = path.join(installed, installation.relativeLocation);
  assert.ok(physicalInstalledPath(root, platform).isDirectory(), 'Installed C# root must be a directory');
  return closure.activeContainedProcesses.map((process) => {
    assert.equal(process.metadataStatus, 'captured', 'Survivor metadata was not captured');
    assert.ok(
      validOriginalIdentity(process, platform) && /^[a-f0-9]{64}$/.test(process.commandSummary?.sha256),
      'Original native survivor identity incomplete'
    );
    if (platform === 'linux')
      assert.equal(process.commandSummary.hashEncoding, 'linux-proc-cmdline-nul-bytes', 'Linux full raw command hash unavailable');
    assert.ok(
      typeof process.executablePath === 'string' && path.isAbsolute(process.executablePath),
      'Survivor installed executable path unavailable'
    );
    const relative = path.relative(root, process.executablePath).replace(/\\/g, '/');
    // Only the C# Roslyn payload, not every program installed under C#, has an
    // independent role. A shared Func host cannot be admitted by extension name.
    const payload = installation.files.find((file) => file.path === relative);
    assert.ok(
      payload && relative === `.roslyn/Microsoft.CodeAnalysis.LanguageServer${platform === 'win32' ? '.exe' : ''}`,
      'Survivor is not the validated installed Roslyn payload'
    );
    // Prove the exact known executable at its physical installed path. Runtime
    // cache additions do not change executable identity or rebaseline the seed.
    const executable = path.join(root, payload.path);
    const before = physicalInstalledPath(executable, platform);
    assert.ok(before.isFile(), 'Installed executable must be a real file');
    const unchanged = (actual, expected, reason) => {
      for (const field of ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs', 'birthtimeNs']) {
        assert.equal(actual[field], expected[field], reason);
      }
    };
    const fd = fs.openSync(executable, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const opened = fs.fstatSync(fd, { bigint: true });
      unchanged(opened, before, 'Installed executable changed while opening');
      const hash = crypto.createHash('sha256').update(fs.readFileSync(fd)).digest('hex');
      assert.equal(hash, payload.sha256, 'Installed executable hash differs from the validated prepared seed');
      assert.equal(opened.size, BigInt(payload.size), 'Installed executable size differs');
      if (manifest.fileModePolicy === 'posix-0777') assert.equal(Number(opened.mode & 0o777n), payload.mode);
      const after = physicalInstalledPath(executable, platform);
      unchanged(fs.fstatSync(fd, { bigint: true }), opened, 'Installed executable changed during hashing');
      unchanged(after, opened, 'Installed executable path changed during hashing');
    } finally {
      fs.closeSync(fd);
    }
    assert.ok(
      process.commandSummary.payloadPaths?.some(
        (file) => normalizedPath(file, platform) === normalizedPath(process.executablePath, platform)
      ),
      'Native full command is not bound to the installed payload'
    );
    return {
      pid: process.pid,
      startTimeTicks: process.startTimeTicks,
      ...(process.identity ? { identity: process.identity } : {}),
      commandSha256: process.commandSummary.sha256,
      source: 'validated-installed-payload',
      invocation: launch.invocation,
      receipt: manifestPath,
      extensionId: installation.id,
      installationRoot: root,
      executable: process.executablePath,
      installationSHA256: installation.contentSHA256,
      payloadSHA256: payload.sha256,
      productRole: 'independent-dependency',
      processClass: 'csharp-roslyn-language-server',
    };
  });
}

function retainedBoundaryRecords(directory, binding, visited = new Set()) {
  assert.ok(!visited.has(directory), 'Nested lifecycle owner cycle');
  visited.add(directory);
  const records = observerRecords(directory, binding).map((record) => ({
    ...record,
    nativeOwnerDirectory: directory,
    nativeOwnerInvocation: binding.invocation,
  }));
  for (const file of fs.readdirSync(directory).filter((entry) => /^child-.+\.launch\.json$/.test(entry))) {
    const child = read(path.join(directory, file));
    assert.equal(child.parentInvocation, binding.invocation);
    assert.equal(child.parentRootPid, binding.rootPid);
    const childBinding = read(path.join(child.directory, 'binding.json'));
    assert.equal(childBinding.invocation, child.invocation);
    const nested = retainedBoundaryRecords(child.directory, childBinding, visited);
    const startups = nested.filter((record) => record.kind === 'startup' && record.nativeOwnerDirectory === child.directory);
    assert.ok(startups.length > 0, 'Nested native launch has no product host observation');
    for (const startup of startups) {
      const identity = startup.parentIdentity;
      assert.deepEqual(identity?.binding, binding, 'Nested startup is not bound to this outer native owner');
      const relative = path.relative(directory, identity.receipt);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Outer membership receipt escaped its owner');
      const native = read(identity.receipt);
      assert.notEqual(native.ownershipComplete, false, 'Outer native ancestry capture incomplete');
      assert.deepEqual(native.processes, identity.processes, 'Nested outer membership differs from native receipt');
      const original = startup.nativeIdentity?.processes.find((record) => record.pid === startup.extensionHostPid);
      assert.ok(
        original?.metadataStatus === 'captured' &&
          native.processes.some(
            (record) =>
              sameOriginalIdentity(record, original) &&
              record.commandSummary?.sha256 === original.commandSummary?.sha256 &&
              record.metadataStatus === 'captured'
          ),
        'Nested original host identity was not captured by both native Jobs'
      );
      assert.ok(
        native.processes.some((record) => record.pid === childBinding.rootPid && record.metadataStatus === 'captured'),
        'Nested root lacks actual outer Job membership'
      );
    }
    records.push(...nested);
  }
  return records;
}

function produceLifecycleEvidence(closure, launch) {
  try {
    const binding = read(path.join(launch.directory, 'binding.json'));
    assert.equal(binding.rootPid, closure.rootPid, 'Native lifecycle binding root differs from containment receipt');
    assert.equal(binding.invocation, launch.invocation);
    const records = retainedBoundaryRecords(launch.directory, binding);
    const errors = records.filter((record) => record.kind === 'error');
    assert.equal(errors.length, 0, `Lifecycle observer errors: ${errors.map((record) => record.reason).join(', ')}`);
    const shutdowns = records.filter((record) => record.kind === 'shutdown');
    assert.ok(shutdowns.length > 0, 'Awaited native Logic Apps deactivation/resource receipt unavailable');
    // Multiple extension hosts (reload/multi-root) all have to finish; selecting
    // one successful host must not hide a missing or failed sibling shutdown.
    const startups = records.filter((record) => record.kind === 'startup');
    assert.ok(
      startups.every((startup) =>
        shutdowns.some(
          (record) =>
            record.nativeOwnerInvocation === startup.nativeOwnerInvocation &&
            record.extensionHostPid === startup.extensionHostPid &&
            startup.nativeIdentity?.processes.some(
              (original) =>
                original.pid === startup.extensionHostPid &&
                record.nativeIdentity?.processes.some((released) => sameOriginalIdentity(released, original))
            )
        )
      ),
      'A started extension host lacks shutdown proof'
    );
    for (const record of shutdowns) {
      assert.equal(record.shutdown.invocation, record.nativeOwnerInvocation);
      assert.equal(record.resources.invocation, record.nativeOwnerInvocation);
      const scopedReceipt = (file) => {
        const relative = path.relative(record.nativeOwnerDirectory, file);
        assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Resource receipt escaped the native owner');
        return read(file);
      };
      const before = scopedReceipt(record.shutdown.processCaptureReceipt);
      const after = scopedReceipt(record.resources.receipt);
      assert.ok(before.ownershipComplete !== false && after.ownershipComplete !== false, 'Incomplete retained ancestry capture');
      assert.ok(Date.parse(before.observedAtUtc) <= record.shutdown.observedAt, 'Original resource capture followed shutdown');
      assert.ok(
        Date.parse(after.observedAtUtc) >= record.shutdown.observedAt && Date.parse(after.observedAtUtc) <= record.resources.observedAt,
        'Release probe is not ordered after actual deactivation'
      );
      for (const original of record.shutdown.ownedProcesses) {
        if (process.platform === 'linux')
          assert.match(original.commandSha256 ?? '', /^[a-f0-9]{64}$/, 'Linux original product command hash unavailable');
        assert.ok(
          before.processes.some(
            (process) =>
              sameOriginalIdentity(process, original) &&
              process.metadataStatus === 'captured' &&
              (original.commandSha256 === undefined || process.commandSummary?.sha256 === original.commandSha256)
          ),
          'Product identity lacks original native capture'
        );
        assert.ok(
          after.processes.some((process) => originalProcessReleased(original, process)),
          'Original product process exit was not observed'
        );
      }
      assert.ok(
        record.resources.ports.every((port) =>
          record.resources.portProbes.some(
            (probe) =>
              probe.port === port && probe.observedAt >= record.shutdown.observedAt && probe.observedAt <= record.resources.observedAt
          )
        ),
        'Original product port lacks a real pre-recovery release probe'
      );
    }
    const last = shutdowns.reduce((a, b) => (a.resources.observedAt > b.resources.observedAt ? a : b));
    const ownedProcesses = shutdowns.flatMap((record) => record.shutdown.ownedProcesses);
    const survivorOwners = installedPayloadOwners(closure, launch);
    return {
      schemaVersion: 1,
      invocation: launch.invocation,
      rootPid: closure.rootPid,
      beforeRecoveryAt: Date.parse(closure.metadataCapturedAtUtc),
      shutdown: {
        ...last.shutdown,
        invocation: launch.invocation,
        ownedProcesses,
        componentReceipts: shutdowns.map((record) => ({
          nativeOwnerInvocation: record.nativeOwnerInvocation,
          nativeOwnerDirectory: record.nativeOwnerDirectory,
          shutdown: record.shutdown,
          resources: record.resources,
        })),
      },
      resources: {
        ...last.resources,
        invocation: launch.invocation,
        ports: [...new Set(shutdowns.flatMap((record) => record.resources.ports))],
        portProbes: shutdowns.flatMap((record) => record.resources.portProbes),
        workspaceResources: [...new Set(shutdowns.flatMap((record) => record.resources.workspaceResources ?? []))],
      },
      survivorOwners,
      nextStartupLink: launch.nextStartupLink,
      requiredStartupDomain: shutdowns.some(
        (record) =>
          record.shutdown.ownedProcesses.length > 0 || record.resources.ports.length > 0 || record.resources.taskRecords?.length > 0
      )
        ? 'design-time'
        : 'extension-host',
    };
  } catch (error) {
    closure.lifecycleProducerError = error instanceof Error ? error.message : String(error);
    return undefined;
  }
}

function validateEmbeddedRuntimeStartup(startup, evidence) {
  const actualInvocation = startup.actualInvocation || startup.invocation;
  assert.ok(actualInvocation && actualInvocation !== evidence.invocation, 'Subsequent startup must have a separate invocation');
  assert.ok(Number.isSafeInteger(startup.extensionHostPid) && startup.extensionHostPid > 0);
  const identity = startup.nativeIdentity;
  const platform = identity?.processes?.find((record) => record.pid === startup.extensionHostPid)?.identity?.platform || process.platform;
  assert.ok(
    platform === 'linux' ? identity?.ownershipComplete === true : identity && identity.ownershipComplete !== false,
    'Startup retained ancestry capture incomplete'
  );
  assert.ok(
    identity.processes?.some(
      (record) =>
        record.pid === startup.extensionHostPid &&
        record.metadataStatus === 'captured' &&
        validOriginalIdentity(record, platform) &&
        (platform !== 'linux' || record.commandSummary?.hashEncoding === 'linux-proc-cmdline-nul-bytes') &&
        /^[a-f0-9]{64}$/.test(record.commandSummary?.sha256)
    ),
    'Startup extension host was not captured by its native Job'
  );
  assert.ok(
    Number.isFinite(Date.parse(identity.observedAtUtc)) && Date.parse(identity.observedAtUtc) <= startup.observedAt,
    'Native startup identity was recorded after startup'
  );
  // Extension-host-only observations have no product log scope. If a scope is
  // supplied, it must obey the same profile/current-host contract in either domain.
  if (startup.domain !== 'design-time' && !startup.logScope) return;
  const binding = startup.producerBinding;
  assert.equal(binding?.invocation, startup.actualInvocation || startup.invocation, 'Embedded current startup invocation differs');
  assert.ok(binding.profile && binding.requiredWorkspace, 'Embedded current startup profile/workspace unavailable');
  assert.ok(
    evidence.resources?.workspaceResources?.some((workspace) => normalizedPath(workspace) === normalizedPath(binding.requiredWorkspace)),
    'Embedded current startup required workspace differs'
  );
  assert.equal(startup.logScope?.extensionHostPid, startup.extensionHostPid);
  assert.equal(normalizedPath(startup.logScope?.profile || ''), normalizedPath(binding.profile));
  const scope = startup.logScope;
  assert.ok(path.isAbsolute(binding.profile) && path.isAbsolute(scope.directory), 'Current startup log paths must be absolute');
  const relative = path.relative(normalizedPath(path.join(binding.profile, 'logs')), normalizedPath(scope.directory));
  assert.ok(
    relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(scope.directory) === 'exthost',
    'Startup current host logs differ from the actual profile'
  );
  assert.equal(normalizedPath(scope.hostLog || ''), normalizedPath(path.join(scope.directory, 'exthost.log')));
  if (startup.domain !== 'design-time') return;
  const runtime = startup.runtime;
  assert.equal(normalizedPath(runtime?.launch?.project || ''), normalizedPath(binding.requiredWorkspace));
  assert.equal(runtime.launch.extensionHostPid, startup.extensionHostPid);
  const launchLog = runtime.launch.receipt;
  assert.ok(launchLog && path.isAbsolute(launchLog), 'Startup current product log receipt unavailable');
  const launchRelative = path.relative(normalizedPath(scope.directory), normalizedPath(launchLog));
  assert.ok(
    launchRelative && !launchRelative.startsWith('..') && !path.isAbsolute(launchRelative),
    'Startup product log differs from the current host scope'
  );
  assert.equal(runtime.health.statusCode, 200);
  assert.equal(runtime.health.port, runtime.launch.port);
  assert.deepEqual(runtime.health, startup.health);
  for (const observation of [runtime.before, runtime.after]) {
    assert.deepEqual(observation.requestedPorts, [runtime.launch.port]);
    assert.notEqual(observation.ownershipComplete, false);
    assert.equal(currentRuntimeProof({ launches: [runtime.launch] }, runtime.launch, observation).pid, runtime.runtimePid);
    const host = observation.processes.find((record) => record.pid === startup.extensionHostPid);
    const original = startup.nativeIdentity.processes.find((record) => record.pid === startup.extensionHostPid);
    assert.ok(sameOriginalIdentity(host, original), 'Embedded runtime current host identity differs');
    assert.equal(host.commandSummary.sha256, original.commandSummary.sha256);
  }
  assert.deepEqual(runtime.before.listeners, runtime.after.listeners, 'Embedded runtime changed around response');
  assert.ok(
    Date.parse(runtime.before.observedAtUtc) <= runtime.health.observedAt &&
      runtime.health.observedAt <= Date.parse(runtime.after.observedAtUtc) &&
      Date.parse(runtime.after.observedAtUtc) <= startup.observedAt,
    'Embedded runtime ownership does not bracket response'
  );
}

function resolveSubsequentStartup(evidence) {
  if (evidence?.startupResolutionError) return evidence;
  if (evidence?.startup) {
    try {
      // Durable embedded evidence need not reopen an old link/native directory,
      // but an old HTTP-only success must not bypass current runtime proof.
      validateEmbeddedRuntimeStartup(evidence.startup, evidence);
      return evidence;
    } catch (error) {
      return { ...evidence, startupResolutionError: error instanceof Error ? error.message : String(error) };
    }
  }
  if (!evidence?.nextStartupLink || !fs.existsSync(evidence.nextStartupLink)) return evidence;
  try {
    const link = read(evidence.nextStartupLink);
    assert.notEqual(link.invocation, evidence.invocation, 'Subsequent startup must have a separate invocation');
    const binding = read(path.join(link.directory, 'binding.json'));
    assert.equal(binding.invocation, link.invocation);
    const records = observerRecords(link.directory, binding);
    const startup = records.find((record) => record.kind === 'startup' && record.domain === evidence.requiredStartupDomain);
    if (!startup) return evidence;
    assert.equal(startup.source, 'logicapps-subsequent-startup');
    assert.equal(startup.verified, true);
    assert.ok(
      !startup.actualInvocation || startup.actualInvocation === link.invocation,
      'Startup actual invocation differs from native owner'
    );
    assert.ok(Number.isSafeInteger(startup.extensionHostPid) && startup.extensionHostPid > 0);
    const identity = startup.nativeIdentity;
    assert.ok(identity?.receipt, 'Actual startup lacks native extension-host identity capture');
    const relative = path.relative(link.directory, identity.receipt);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Startup identity receipt escaped its native owner');
    const native = read(identity.receipt);
    assert.equal(native.ownershipComplete, identity.ownershipComplete, 'Startup retained ancestry completeness differs');
    assert.deepEqual(native.processes, identity.processes, 'Startup identity differs from original native observation');
    assert.equal(native.observedAtUtc, identity.observedAtUtc);
    assert.ok(
      native.processes.some(
        (record) =>
          record.pid === startup.extensionHostPid &&
          record.metadataStatus === 'captured' &&
          validOriginalIdentity(record) &&
          (process.platform !== 'linux' || record.commandSummary?.hashEncoding === 'linux-proc-cmdline-nul-bytes') &&
          /^[a-f0-9]{64}$/.test(record.commandSummary?.sha256)
      ),
      'Startup extension host was not captured by its native Job'
    );
    assert.ok(Date.parse(native.observedAtUtc) <= startup.observedAt, 'Native startup identity was recorded after startup');
    if (startup.domain === 'design-time') {
      const bindingRelative = path.relative(link.directory, startup.producerBindingReceipt);
      assert.ok(
        bindingRelative && !bindingRelative.startsWith('..') && !path.isAbsolute(bindingRelative),
        'Startup producer binding escaped native owner'
      );
      const producerBinding = read(startup.producerBindingReceipt);
      assert.deepEqual(startup.producerBinding, producerBinding, 'Current startup producer binding differs');
      assert.equal(producerBinding.invocation, binding.invocation);
      assert.ok(producerBinding.profile && producerBinding.requiredWorkspace, 'Current startup profile/workspace binding unavailable');
      assert.ok(
        evidence.resources?.workspaceResources?.some(
          (workspace) => normalizedPath(workspace) === normalizedPath(producerBinding.requiredWorkspace)
        ),
        'Current startup required workspace differs from the previous product workspace'
      );
      assert.equal(normalizedPath(startup.runtime?.launch?.project || ''), normalizedPath(producerBinding.requiredWorkspace));
      const scope = currentLogScope(
        { logUri: { scheme: 'file', fsPath: startup.logScope?.directory } },
        { LA_E2E_CLI_USER_DATA_DIR: producerBinding.profile },
        startup.extensionHostPid
      );
      assert.deepEqual(scope, startup.logScope, 'Startup current host log scope differs');
      const resources = loggedResources(scope.directory, [producerBinding.requiredWorkspace], startup.extensionHostPid);
      const runtime = startup.runtime;
      assert.equal(runtime.health.statusCode, 200);
      assert.deepEqual(runtime.health, startup.health);
      assert.equal(runtime.health.port, runtime.launch.port);
      for (const observation of [runtime.before, runtime.after]) {
        const relative = path.relative(link.directory, observation.receipt);
        assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Runtime listener receipt escaped native owner');
        const receipt = read(observation.receipt);
        const inline = { ...observation };
        delete inline.receipt;
        assert.deepEqual(receipt, inline, 'Current runtime differs from native listener receipt');
        assert.deepEqual(receipt.requestedPorts, [runtime.launch.port]);
        assert.notEqual(receipt.ownershipComplete, false);
        assert.equal(currentRuntimeProof(resources, runtime.launch, receipt).pid, runtime.runtimePid);
        const currentHost = receipt.processes.find((record) => record.pid === startup.extensionHostPid);
        const originalHost = native.processes.find((record) => record.pid === startup.extensionHostPid);
        assert.ok(sameOriginalIdentity(currentHost, originalHost), 'Runtime belongs to a different current extension-host identity');
        assert.equal(currentHost.commandSummary.sha256, originalHost.commandSummary.sha256);
      }
      assert.deepEqual(runtime.before.listeners, runtime.after.listeners, 'Current runtime changed around response');
      assert.ok(
        Date.parse(runtime.before.observedAtUtc) <= runtime.health.observedAt &&
          runtime.health.observedAt <= Date.parse(runtime.after.observedAtUtc) &&
          Date.parse(runtime.after.observedAtUtc) <= startup.observedAt,
        'Current runtime ownership does not bracket its health response'
      );
    }
    const resolved = { ...startup, actualInvocation: startup.invocation, invocation: evidence.invocation };
    validateEmbeddedRuntimeStartup(resolved, evidence);
    return { ...evidence, startup: resolved };
  } catch (error) {
    return { ...evidence, startupResolutionError: error instanceof Error ? error.message : String(error) };
  }
}

module.exports = {
  resolveTestUserDataDir,
  assertLaunchProfile,
  bindLifecycleProfile,
  prepareLifecycleLaunch,
  produceLifecycleEvidence,
  resolveSubsequentStartup,
  installedPayloadOwners,
  observerRecords,
  retainedBoundaryRecords,
};
