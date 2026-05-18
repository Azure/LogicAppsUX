/**
 * Launcher script for ExTester UI E2E tests.
 *
 * Copies the built extension (dist/) into the isolated test-extensions
 * directory so VS Code loads it like any installed extension via
 * --extensions-dir. This avoids all EXTENSION_DEV_PATH / --extensionDevelopmentPath
 * issues with ExTester.
 *
 * Uses an isolated extensions directory so no other user extensions
 * (Claude Code, etc.) interfere.
 *
 * Installs extensionDependencies from the marketplace into the same
 * isolated directory.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const projectDir = path.resolve(__dirname, '..', '..', '..');
const distDir = path.join(projectDir, 'dist');

/**
 * Pinned VS Code version for test stability.
 * ExTester's page-objects use CSS selectors (e.g., '.editor-instance') that
 * change between VS Code versions. Pinning ensures the same version is used
 * locally and in CI. Update this when ExTester releases support for newer versions.
 */
const VSCODE_VERSION = '1.108.0';

// Store test-extensions in test-resources/ (alongside VS Code download) rather
// than dist/ — tsup's `clean: true` wipes dist/ on every build:extension, which
// would destroy cached marketplace extension installs.
const extDir = path.join(os.tmpdir(), 'test-resources', 'test-extensions');
const testGlob = path.resolve(projectDir, 'out', 'test', '*.js').replace(/\\/g, '/');

/**
 * Recursively copy a directory, skipping test-extensions itself to avoid infinite recursion.
 */
function copyDirSync(src, dest, skipDir) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    // Skip the test-extensions directory itself to avoid infinite recursion
    if (skipDir && path.resolve(srcPath) === path.resolve(skipDir)) continue;
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Rebuild extensions.json by scanning all extension directories.
 * This is needed after parallel marketplace installs, which may race on
 * concurrent writes to extensions.json, corrupting or losing entries.
 */
function rebuildExtensionsJson(extensionsDir) {
  const entries = [];
  for (const entry of fs.readdirSync(extensionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const id = `${pkg.publisher}.${pkg.name}`;
      const extPath = path.join(extensionsDir, entry.name).replace(/\\/g, '/');
      entries.push({
        identifier: { id },
        version: pkg.version,
        location: {
          $mid: 1,
          path: `/${extPath}`.replace(/^\/([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}:`),
          scheme: 'file',
        },
        relativeLocation: entry.name,
        metadata: {
          installedTimestamp: Date.now(),
          source: 'gallery',
        },
      });
    } catch {
      // Skip directories without valid package.json
    }
  }
  fs.writeFileSync(path.join(extensionsDir, 'extensions.json'), JSON.stringify(entries));
  console.log(`  ✓ Rebuilt extensions.json with ${entries.length} entries`);
}

/**
 * Install the bundled codeful task recorder extension into the test
 * extensions directory. Returns the install location.
 *
 * The recorder is a plain-JS extension at
 * `src/test/ui/codefulTaskRecorderExtension/`. It subscribes to
 * `vscode.tasks.*` events and appends them to a JSONL file pointed to by
 * `process.env.LA_E2E_TASK_EVENTS_JSONL`. It also contributes the
 * `la-e2e.startDebug`, `la-e2e.stopDebug`, and `la-e2e.recorderPing`
 * commands used by Phase 4.10.
 */
function installCodefulTaskRecorderExtension(extDir) {
  const recorderSrc = path.join(__dirname, 'codefulTaskRecorderExtension');
  if (!fs.existsSync(path.join(recorderSrc, 'package.json'))) {
    throw new Error(`Recorder extension source missing at ${recorderSrc}`);
  }
  const recorderPkg = JSON.parse(fs.readFileSync(path.join(recorderSrc, 'package.json'), 'utf8'));
  const target = path.join(extDir, `${recorderPkg.publisher}.${recorderPkg.name}-${recorderPkg.version}`);

  // Remove stale copies of the recorder before reinstalling.
  if (fs.existsSync(extDir)) {
    for (const entry of fs.readdirSync(extDir)) {
      if (entry.toLowerCase().startsWith(`${recorderPkg.publisher}.${recorderPkg.name}`.toLowerCase())) {
        fs.rmSync(path.join(extDir, entry), { recursive: true, force: true });
      }
    }
  }

  fs.mkdirSync(target, { recursive: true });
  // Plain JS extension — just copy the source as-is.
  for (const entry of fs.readdirSync(recorderSrc, { withFileTypes: true })) {
    const src = path.join(recorderSrc, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  console.log(`  ✓ Installed codeful task recorder at ${target}`);
  return target;
}

/**
 * DEPRECATED-AS-PRECEDENT. Do not copy this pattern for new VS Code E2E tests.
 *
 * Synthetic fixtures violate `.squad/decisions.md` D-001 ("No synthetic Logic
 * App fixtures for VS Code E2E tests"). This helper exists only because it
 * predates the rule. New tests must create workspaces through the real Create
 * Workspace webview and reopen the generated `.code-workspace` in a fresh
 * `run-e2e.js` phase. See also `.squad/knowledge/vscode-e2e-testing.md` and
 * `apps/vs-code-designer/src/test/ui/SKILL.md` § 1.5 Rule 1.
 *
 * Build a synthetic "legacy" project fixture for the legacy/standard
 * non-Logic-App regression tests.
 */
function createLegacyProjectFixture(label) {
  const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), `la-e2e-${label}-`));
  const legacyDir = path.join(legacyRoot, 'legacy-project');
  const legacyWfDir = path.join(legacyDir, 'testworkflow');
  fs.mkdirSync(legacyWfDir, { recursive: true });
  fs.writeFileSync(
    path.join(legacyDir, 'host.json'),
    JSON.stringify(
      { version: '2.0', extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows', version: '[1.*, 2.0.0)' } },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(legacyDir, 'local.settings.json'),
    JSON.stringify(
      {
        IsEncrypted: false,
        Values: { AzureWebJobsStorage: 'UseDevelopmentStorage=true', FUNCTIONS_WORKER_RUNTIME: 'dotnet', APP_KIND: 'workflowApp' },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(legacyWfDir, 'workflow.json'),
    JSON.stringify(
      {
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          actions: {},
          triggers: {},
          outputs: {},
        },
        kind: 'Stateful',
      },
      null,
      2
    )
  );
  console.log(`  Created legacy project at: ${legacyDir}`);
  return legacyDir;
}

/**
 * Run async tasks with a concurrency limit.
 * Returns results in the same order as the input tasks.
 */
async function parallelLimit(taskFns, limit) {
  const results = new Array(taskFns.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < taskFns.length) {
      const i = nextIndex++;
      results[i] = await taskFns[i]();
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(limit, taskFns.length); w++) {
    workers.push(runNext());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const { ExTester } = require('vscode-extension-tester');

  // ------------------------------------------------------------------
  // D-001 pre-flight: enforce that *.fixtures.test.ts files do not write
  // workspace files directly. Fixture data must come from the wizard.
  // This guard is a cheap grep — it runs before any build/test work so
  // a violating PR fails fast on its very first CI run.
  // ------------------------------------------------------------------
  const uiTestDir = path.resolve(__dirname);
  const fixturesGuardPattern = /fs\s*\.\s*writeFile|outputJson/;
  const fixturesGuardViolations = [];
  for (const fname of fs.readdirSync(uiTestDir)) {
    if (!fname.endsWith('.fixtures.test.ts')) continue;
    const filePath = path.join(uiTestDir, fname);
    const contents = fs.readFileSync(filePath, 'utf8');
    if (fixturesGuardPattern.test(contents)) {
      fixturesGuardViolations.push(fname);
    }
  }
  if (fixturesGuardViolations.length > 0) {
    console.error(
      '\n✖ D-001 lint guard FAILED: *.fixtures.test.ts files must not call fs.writeFile* or outputJson*.\n' +
        '  Fixture workspaces must be produced by the Create Workspace wizard, not synthesized on disk.\n' +
        `  Violating files: ${fixturesGuardViolations.join(', ')}`
    );
    process.exit(2);
  }
  console.log('✓ D-001 lint guard passed (no fs.writeFile/outputJson in *.fixtures.test.ts).');

  // Read extension metadata from dist/package.json
  const pkgJson = JSON.parse(fs.readFileSync(path.join(distDir, 'package.json'), 'utf8'));
  const extDeps = pkgJson.extensionDependencies || [];
  const devContainersDependency = 'ms-vscode-remote.remote-containers';
  if (extDeps.some((dep) => dep.toLowerCase() === devContainersDependency)) {
    throw new Error(
      `${devContainersDependency} must not be listed in extensionDependencies. ` +
        'It causes VS Code to install/start Dev Containers for users who only installed Azure Logic Apps.'
    );
  }
  const requiredE2ePrereqs = ['ms-dotnettools.csdevkit'];
  for (const prereq of requiredE2ePrereqs) {
    if (!extDeps.some((dep) => dep.toLowerCase() === prereq)) {
      throw new Error(`${prereq} must be listed in extensionDependencies because the E2E extension activation requires it.`);
    }
  }
  const extDirName = `${pkgJson.publisher}.${pkgJson.name}-${pkgJson.version}`;
  const ourExtTarget = path.join(extDir, extDirName);

  console.log(`\nExtension identity: ${extDirName}`);
  console.log(`dist/ source: ${distDir}`);
  console.log(`Extensions dir: ${extDir}`);

  // Create ExTester WITHOUT coverage — we don't need --extensionDevelopmentPath
  // because we're copying our extension directly into --extensions-dir
  const extest = new ExTester(
    undefined, // storageFolder — use default (os.tmpdir()/test-resources)
    undefined, // releaseType — Stable
    extDir // extensionsDir — isolated dir, passed as --extensions-dir
  );

  // Step 1: Download VS Code + ChromeDriver (skips if already cached)
  console.log('\n=== Step 1: Download VS Code + ChromeDriver ===');
  await extest.downloadCode(VSCODE_VERSION);
  await extest.downloadChromeDriver(VSCODE_VERSION);

  // Step 2: Install extension dependencies from the marketplace (PARALLEL)
  // Skip deps already present in test-extensions/. For uncached deps,
  // run VS Code CLI --install-extension in parallel instead of sequentially
  // to cut install time from ~60-90s to ~30-40s (limited by the largest dep).
  const getExtensionEntries = (extensionId) => {
    if (!fs.existsSync(extDir)) {
      return [];
    }
    const depLower = extensionId.toLowerCase();
    return fs.readdirSync(extDir).filter((entry) => {
      if (entry === 'extensions.json' || entry === '.obsolete') {
        return false;
      }
      return entry.toLowerCase().startsWith(`${depLower}-`) || entry.toLowerCase() === depLower;
    });
  };

  const readExtensionId = (entry) => {
    const pkgPath = path.join(extDir, entry, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return undefined;
    }
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return `${pkg.publisher}.${pkg.name}`.toLowerCase();
    } catch {
      return undefined;
    }
  };

  const findValidInstalledExtension = (extensionId) => {
    const depLower = extensionId.toLowerCase();
    return getExtensionEntries(extensionId).find((entry) => readExtensionId(entry) === depLower);
  };

  const removeInvalidExtensionEntries = (extensionId) => {
    for (const entry of getExtensionEntries(extensionId)) {
      if (readExtensionId(entry) !== extensionId.toLowerCase()) {
        console.log(`  Removing invalid cached dependency: ${entry}`);
        fs.rmSync(path.join(extDir, entry), { recursive: true, force: true });
      }
    }
  };

  if (extDeps.length > 0) {
    console.log(`\n=== Step 2: Install ${extDeps.length} extension dependencies ===`);

    const depsToInstall = [];
    for (const dep of extDeps) {
      removeInvalidExtensionEntries(dep);
      const alreadyInstalled = !!findValidInstalledExtension(dep);

      if (alreadyInstalled) {
        console.log(`  ✓ ${dep} already installed, skipping`);
      } else {
        depsToInstall.push(dep);
      }
    }

    if (depsToInstall.length > 0) {
      // Get the VS Code CLI base command from ExTester's internal CodeUtil.
      // This gives us the same command that installFromMarketplace() uses,
      // but we can run it with async exec instead of execSync.
      const cliBase = extest.code.getCliInitCommand();

      // Concurrency limit of 3 to avoid EPERM/ENOENT race conditions.
      // Multiple CLI processes that install the same transitive dependency
      // (e.g., both csharp and csdevkit pull in dotnet-runtime) corrupt
      // the shared CachedExtensionVSIXs directory when run simultaneously.
      // With 3 slots, smaller deps finish first and free a slot before
      // the larger dotnet deps start, reducing overlap.
      const CONCURRENCY = 3;
      console.log(`  Installing ${depsToInstall.length} deps (concurrency=${CONCURRENCY})...`);

      const taskFns = depsToInstall.map((dep) => () => {
        return new Promise((resolve) => {
          const command = `${cliBase} --force --install-extension "${dep}" --extensions-dir="${extDir}"`;
          const startTime = Date.now();
          console.log(`  ⏳ ${dep}`);
          exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            if (error) {
              console.warn(`  ⚠ ${dep} failed (${elapsed}s)`);
              resolve({ dep, success: false });
            } else {
              console.log(`  ✓ ${dep} installed (${elapsed}s)`);
              resolve({ dep, success: true });
            }
          });
        });
      });

      const results = await parallelLimit(taskFns, CONCURRENCY);
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);
      console.log(`  ${succeeded}/${depsToInstall.length} installed successfully`);

      // Retry any failed deps sequentially. Parallel installs may report EPERM
      // when two CLI processes install the same transitive dependency (e.g.,
      // both csdevkit and csharp pull in dotnet-runtime). The extension often
      // still ends up on disk, so only retry if the directory is truly missing.
      if (failed.length > 0) {
        for (const { dep } of failed) {
          removeInvalidExtensionEntries(dep);
          const onDisk = !!findValidInstalledExtension(dep);
          if (onDisk) {
            console.log(`  ✓ ${dep} present on disk despite CLI error, OK`);
          } else {
            console.log(`  ↻ Retrying ${dep} sequentially...`);
            try {
              await extest.installFromMarketplace(dep);
              console.log(`  ✓ ${dep} installed on retry`);
            } catch (err) {
              console.warn(`  ⚠ ${dep} retry failed — tests may still work without it`);
            }
          }
        }
      }

      // Rebuild extensions.json after parallel installs.
      // Concurrent CLI processes may race on writing this file, so we
      // reconstruct it from the actual directories on disk.
      rebuildExtensionsJson(extDir);
    }

    const missingDeps = extDeps.filter((dep) => !findValidInstalledExtension(dep));
    if (missingDeps.length > 0) {
      throw new Error(`Missing E2E extension prerequisite(s): ${missingDeps.join(', ')}. Install/retry before running UI E2E tests.`);
    }
  } else {
    console.log('\n=== Step 2: No extension dependencies to install ===');
  }

  // Step 3: Copy our built extension into test-extensions as an "installed" extension
  // Skip the copy if dist/main.js hasn't changed (compare mtime for a fast-path).
  console.log(`\n=== Step 3: Install our extension from dist/ ===`);
  const pkgId = `${pkgJson.publisher}.${pkgJson.name}`.toLowerCase();

  const srcMainJs = path.join(distDir, 'main.js');
  const destMainJs = path.join(ourExtTarget, 'main.js');
  let needsCopy = true;

  if (fs.existsSync(destMainJs) && fs.existsSync(srcMainJs)) {
    const srcMtime = fs.statSync(srcMainJs).mtimeMs;
    const destMtime = fs.statSync(destMainJs).mtimeMs;
    if (srcMtime === destMtime) {
      console.log(`  ✓ dist/main.js unchanged (mtime match), skipping copy`);
      needsCopy = false;
    } else {
      console.log(`  dist/main.js changed (src=${new Date(srcMtime).toISOString()}, dest=${new Date(destMtime).toISOString()})`);
    }
  }

  if (needsCopy) {
    // Remove old copies of our extension
    if (fs.existsSync(extDir)) {
      for (const entry of fs.readdirSync(extDir)) {
        if (entry.toLowerCase().startsWith(pkgId)) {
          const fullPath = path.join(extDir, entry);
          console.log(`  Removing old copy: ${entry}`);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    }

    // Copy dist/ → test-extensions/<publisher>.<name>-<version>/
    // Skip the test-extensions dir itself to avoid infinite recursion
    console.log(`  Copying dist/ → ${extDirName}/`);
    copyDirSync(distDir, ourExtTarget, extDir);

    // Preserve source mtime on main.js so subsequent runs can detect changes
    if (fs.existsSync(srcMainJs) && fs.existsSync(destMainJs)) {
      const srcStat = fs.statSync(srcMainJs);
      fs.utimesSync(destMainJs, srcStat.atime, srcStat.mtime);
    }

    console.log(`  ✓ Extension installed in test-extensions`);
  }

  // Verify the copied extension has the necessary files
  const copiedPkg = path.join(ourExtTarget, 'package.json');
  const copiedMain = path.join(ourExtTarget, 'main.js');
  if (!fs.existsSync(copiedPkg)) {
    console.error(`  ✗ ERROR: package.json not found at ${copiedPkg}`);
    process.exit(1);
  }
  if (!fs.existsSync(copiedMain)) {
    console.error(`  ✗ ERROR: main.js not found at ${copiedMain}`);
    process.exit(1);
  }
  console.log(`  ✓ Verified: package.json and main.js present`);

  // CRITICAL: Remove .obsolete file — VS Code uses this to skip loading extensions.
  // Previous test runs or ExTester's cleanup step may have marked our extension
  // as obsolete, causing VS Code to refuse to load it even though the directory exists.
  const obsoleteFile = path.join(extDir, '.obsolete');
  if (fs.existsSync(obsoleteFile)) {
    console.log(`  Removing .obsolete file (was blocking extension loading)`);
    fs.rmSync(obsoleteFile);
  }

  // CRITICAL: Register our extension in extensions.json so VS Code recognizes it.
  // Marketplace-installed extensions get entries automatically, but our manually
  // copied extension needs to be added explicitly.
  const extensionsJsonPath = path.join(extDir, 'extensions.json');
  let extensionsJson = [];
  if (fs.existsSync(extensionsJsonPath)) {
    try {
      extensionsJson = JSON.parse(fs.readFileSync(extensionsJsonPath, 'utf8'));
    } catch (e) {
      extensionsJson = [];
    }
  }
  // Remove any existing entry for our extension
  extensionsJson = extensionsJson.filter(
    (entry) => entry.identifier?.id?.toLowerCase() !== `${pkgJson.publisher}.${pkgJson.name}`.toLowerCase()
  );
  // Add our extension entry
  const ourExtPath = ourExtTarget.replace(/\\/g, '/');
  extensionsJson.push({
    identifier: { id: `${pkgJson.publisher}.${pkgJson.name}` },
    version: pkgJson.version,
    location: {
      $mid: 1,
      path: `/${ourExtPath}`.replace(/^\/([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}:`),
      scheme: 'file',
    },
    relativeLocation: extDirName,
    metadata: {
      installedTimestamp: Date.now(),
      source: 'gallery',
    },
  });
  fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensionsJson));
  console.log(`  ✓ Registered in extensions.json`);

  // List all extensions that will be loaded
  console.log('\n=== Extensions in test-extensions/ ===');
  for (const entry of fs.readdirSync(extDir)) {
    if (entry === 'extensions.json') continue;
    if (entry === '.obsolete') continue;
    console.log(`  ${entry}`);
  }

  // Remove any OTHER versions of our extension that VS Code may have
  // auto-downloaded from the marketplace in a previous run.
  // Only keep our exact version. Also clean up duplicate dependency versions.
  for (const entry of fs.readdirSync(extDir)) {
    if (entry === 'extensions.json' || entry === '.obsolete') continue;
    if (entry.toLowerCase().startsWith(pkgId) && entry !== extDirName) {
      const fullPath = path.join(extDir, entry);
      console.log(`  Removing stale auto-updated version: ${entry}`);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  // Clean up duplicate versions of dependency extensions (keep newest)
  const depVersions = {};
  for (const entry of fs.readdirSync(extDir)) {
    if (entry === 'extensions.json' || entry === '.obsolete') continue;
    const match = entry.match(/^(.+?)-(\d+\.\d+\.\d+.*)$/);
    if (match) {
      const baseName = match[1].toLowerCase();
      if (!depVersions[baseName]) depVersions[baseName] = [];
      depVersions[baseName].push(entry);
    }
  }
  for (const [baseName, versions] of Object.entries(depVersions)) {
    if (versions.length > 1) {
      // Sort by version descending, keep the newest
      versions.sort().reverse();
      for (let i = 1; i < versions.length; i++) {
        const fullPath = path.join(extDir, versions[i]);
        console.log(`  Removing duplicate dependency: ${versions[i]} (keeping ${versions[0]})`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }

  if (fs.existsSync(extDir)) {
    for (const entry of fs.readdirSync(extDir)) {
      if (entry !== 'extensions.json' && entry !== '.obsolete' && entry.toLowerCase().startsWith(devContainersDependency)) {
        console.log(`  Removing stale Dev Containers extension: ${entry}`);
        fs.rmSync(path.join(extDir, entry), { recursive: true, force: true });
      }
    }
  }

  // Final extensions.json rebuild right before running tests.
  // Parallel CLI --install-extension calls may race on writing extensions.json,
  // leaving only a subset of entries. Rebuild from actual directories on disk.
  rebuildExtensionsJson(extDir);

  // Step 4: Run the tests
  console.log('\n=== Step 4: Run tests ===');
  console.log(`Test glob: ${testGlob}`);

  // Kill leftover VS Code test processes from previous runs.
  // These hold locks on files in test-resources/settings/ and cause EBUSY errors.
  // We kill ALL language server processes since we can't distinguish test ones
  // from user ones. VS Code will auto-restart the user's language servers.
  try {
    const { execSync } = require('child_process');

    // Kill processes that commonly hold locks on test-resources/settings log files
    const processesToKill = [
      'Microsoft.CodeAnalysis.LanguageServer.exe',
      'Microsoft.Azure.Deployment.Express.LanguageServer.exe',
      'Microsoft.VisualStudio.Code.Server.exe',
      'Microsoft.VisualStudio.Code.ServiceHost.exe',
      'Microsoft.VisualStudio.Code.ServiceController.exe',
      'escape-node-job.exe',
    ];

    let killed = 0;
    for (const procName of processesToKill) {
      try {
        execSync(`taskkill /F /IM "${procName}"`, { timeout: 5000, stdio: 'pipe' });
        killed++;
      } catch {
        // Process not running, that's fine
      }
    }

    // Also try WMIC to find ANY process with test-resources in command line
    try {
      const wmicOut = execSync('wmic process get ProcessId,Name,CommandLine /format:csv', { encoding: 'utf8', timeout: 15000 }).trim();
      const lines = wmicOut.split('\n').filter((l) => l.includes('test-resources'));
      for (const line of lines) {
        const match = line.match(/,(\d+)\s*$/);
        if (match) {
          const pid = parseInt(match[1], 10);
          if (pid === process.pid) continue;
          console.log(`  Killing leftover test process PID ${pid}`);
          try {
            execSync(`taskkill /F /T /PID ${pid}`, { timeout: 5000, stdio: 'pipe' });
            killed++;
          } catch {}
        }
      }
    } catch {}

    if (killed > 0) {
      console.log(`  Killed ${killed} processes, waiting for handles to release...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (e) {
    console.warn(`  Warning: Could not check for leftover processes: ${e.message}`);
  }

  // Clean stale settings/cache from previous test runs to avoid EPERM/EBUSY errors.
  // ExTester's browser.start() calls fs.removeSync on the settings dir, which
  // fails on Windows if VS Code cache files are still locked from a prior run.
  const settingsDir = path.join(require('os').tmpdir(), 'test-resources', 'settings');
  if (fs.existsSync(settingsDir)) {
    console.log(`  Cleaning stale settings dir: ${settingsDir}`);

    // Retry loop: sometimes handles take a moment to release after killing processes
    let cleaned = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.rmSync(settingsDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
        cleaned = true;
        console.log(`  ✓ Settings dir cleaned (attempt ${attempt + 1})`);
        break;
      } catch (e) {
        console.warn(`  Cleanup attempt ${attempt + 1}/5 failed: ${e.message}`);
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    if (!cleaned) {
      // ExTester only calls removeSync when settings/User exists.
      // If we can delete settings/User, ExTester will skip its cleanup.
      const userDir = path.join(settingsDir, 'User');
      if (fs.existsSync(userDir)) {
        try {
          fs.rmSync(userDir, { recursive: true, force: true });
          console.log(`  ✓ Deleted settings/User — ExTester will skip cleanup of locked log files`);
          cleaned = true;
        } catch (e3) {
          console.warn(`  Could not delete settings/User: ${e3.message}`);
        }
      } else {
        console.log(`  settings/User does not exist — ExTester will skip cleanup (OK)`);
        cleaned = true;
      }
    }

    if (!cleaned) {
      // Last resort: try renaming
      const staleDir = settingsDir + '-stale-' + Date.now();
      try {
        fs.renameSync(settingsDir, staleDir);
        console.log(`  Renamed stale settings dir to: ${path.basename(staleDir)}`);
      } catch (e2) {
        console.warn(`  Warning: Could not rename settings dir either: ${e2.message}`);
        console.warn(`  ExTester may fail with EBUSY — consider restarting VS Code and trying again`);
      }
    }
  }

  // Resolve the auto-downloaded runtime dependency paths so the extension can
  // find func, dotnet, and node without relying on PATH or re-downloading.
  const resolveNodeBinDir = (depsRoot) => {
    const nodeJsRoot = path.join(depsRoot, 'NodeJs');
    if (process.platform === 'win32') {
      return nodeJsRoot;
    }

    try {
      const nodeSubfolder = fs
        .readdirSync(nodeJsRoot, { withFileTypes: true })
        .find((entry) => entry.isDirectory() && entry.name.includes('node'))?.name;
      if (nodeSubfolder) {
        return path.join(nodeJsRoot, nodeSubfolder, 'bin');
      }
    } catch {
      // Dependencies may not be downloaded yet. Fall back to the root-level path
      // so dependency validation still runs when binaries are missing.
    }

    return nodeJsRoot;
  };

  const getRuntimeDependencyPaths = () => {
    const depsRoot = path.join(os.homedir(), '.azurelogicapps', 'dependencies');
    const nodeJsDir = resolveNodeBinDir(depsRoot);
    return {
      depsRoot,
      funcToolsDir: path.join(depsRoot, 'FuncCoreTools'),
      dotnetSdkDir: path.join(depsRoot, 'DotNetSDK'),
      nodeJsDir,
      funcBinary: path.join(depsRoot, 'FuncCoreTools', 'func'),
      dotnetBinary: path.join(depsRoot, 'DotNetSDK', 'dotnet'),
      nodeBinary: path.join(nodeJsDir, 'node'),
    };
  };

  const runtimeDependenciesReady = () => {
    const { funcBinary, dotnetBinary, nodeBinary } = getRuntimeDependencyPaths();
    return [funcBinary, dotnetBinary, nodeBinary].every((binaryPath) => fs.existsSync(binaryPath));
  };
  const shouldValidateRuntimeDependencies = () => !runtimeDependenciesReady();

  // Create a VS Code settings file. Called before each phase group so we can
  // enable dependency validation for Phase 4.1 (first run) and disable it
  // for all subsequent phases (saves 30-60s per session startup).
  const settingsFile = path.join(projectDir, 'out', 'test', 'vscode-settings.json');
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });

  const writeTestSettings = ({ validateDependencies = false, autoStartDesignTime = true, includeRuntimeDependencyPaths = true } = {}) => {
    const settings = {
      'extensions.autoUpdate': false,
      'extensions.autoCheckUpdates': false,
      'update.mode': 'none',
      'update.showReleaseNotes': false,
      'telemetry.telemetryLevel': 'off',
      // Disable workspace trust to prevent the modal trust dialog from blocking
      // keyboard shortcuts (F1 / Ctrl+Shift+P) when opening new workspace folders.
      'security.workspace.trust.enabled': false,
      // Disable the startup editor (Welcome tab / Getting Started) to avoid
      // an extra tab that may steal focus from our workflow.json file.
      'workbench.startupEditor': 'none',
      // Disable authentication modal dialogs — the extension tries to sign in
      // to Azure when it detects WORKFLOWS_SUBSCRIPTION_ID in local.settings.json.
      'microsoft-sovereign-cloud.environment': '',
      // Suppress "wants to sign in" authentication popups
      'azure.authenticationLibrary': 'MSAL',
      'azure.cloud': 'AzureCloud',
      // Disable Git auto-repository detection to reduce dialogs
      'git.openRepositoryInParentFolders': 'never',
      'git.enabled': false,
      // Dependency validation: Phase 4.1 needs this ON (first run downloads/validates
      // binaries). All subsequent phases set it OFF since paths are already resolved.
      'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': validateDependencies,
      // Design-time auto-start: ON for tests that need the runtime (designer, run),
      // OFF for tests that only check UI/conversion to save startup time.
      'azureLogicAppsStandard.autoStartDesignTime': autoStartDesignTime,
      // Suppress the "Start design time?" prompt dialog on project load.
      'azureLogicAppsStandard.showStartDesignTimeMessage': false,
      // Suppress "wants to sign in" auth dialog — uses silent auth that
      // returns undefined instead of prompting when no cached token exists.
      'azureLogicAppsStandard.silentAuth': true,
      // Short pick-process timeout for Phase 4.10. The codeful-debug
      // recorder test asserts task dispatch, so bound process picking after
      // the generated task chain has started instead of waiting the default
      // 60 s. Other phases never reach pickProcess so this is harmless.
      'azureLogicAppsStandard.pickProcessTimeout': 15,
    };
    if (includeRuntimeDependencyPaths) {
      const { depsRoot, funcBinary, dotnetBinary, nodeBinary } = getRuntimeDependencyPaths();
      Object.assign(settings, {
        // Point to auto-downloaded runtime binaries so the extension can start
        // the design-time API process (func host start) without relying on PATH.
        'azureLogicAppsStandard.autoRuntimeDependenciesPath': depsRoot,
        'azureLogicAppsStandard.funcCoreToolsBinaryPath': funcBinary,
        'azureLogicAppsStandard.dotnetBinaryPath': dotnetBinary,
        'azureLogicAppsStandard.nodeJsBinaryPath': nodeBinary,
      });
    }
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log(
      `  Settings: validateDependencies=${validateDependencies}, autoStartDesignTime=${autoStartDesignTime}, includeRuntimeDependencyPaths=${includeRuntimeDependencyPaths}`
    );
  };

  // Write initial settings — keep dependency validation ON for all phases.
  // It adds ~30-60s per session but prevents the Azure connector wizard
  // from blocking designer operations (the validation flow handles the
  // timing so the wizard completes before the user opens the designer).
  writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
  const { depsRoot, funcBinary, dotnetBinary, nodeBinary, dotnetSdkDir, nodeJsDir, funcToolsDir } = getRuntimeDependencyPaths();
  console.log(`  Created test settings file: ${settingsFile}`);
  console.log(`  funcCoreToolsBinaryPath: ${funcBinary}`);
  console.log(`  autoRuntimeDependenciesPath: ${depsRoot}`);

  // Ensure DOTNET_ROOT and PATH include the extension's downloaded DotNetSDK
  // and NodeJs directories. Without this, `func host start` (both the debug
  // task and the design-time API process) cannot find dotnet on CI runners
  // where only the extension-managed copy exists.
  // Also include the system dotnet if actions/setup-dotnet installed one.
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const extraPaths = [funcToolsDir, dotnetSdkDir, nodeJsDir].filter((d) => fs.existsSync(d));
  if (extraPaths.length > 0) {
    process.env.PATH = extraPaths.join(pathSep) + pathSep + (process.env.PATH || '');
    console.log(`  Prepended to PATH: ${extraPaths.join(', ')}`);
  }
  if (fs.existsSync(dotnetSdkDir)) {
    process.env.DOTNET_ROOT = dotnetSdkDir;
    console.log(`  DOTNET_ROOT: ${dotnetSdkDir}`);
  }

  // R4 (workspaceConversionYes hardening): lock VS Code's host locale to
  // en-US so localized button labels (DialogResponses.yes.title === 'Yes',
  // 'No', 'Cancel', etc.) stay stable across CI runners. Without this,
  // Linux runners can default to C.UTF-8 / German / Japanese and the
  // ExTester ModalDialog.pushButton('Yes') call mis-matches.
  if (!process.env.LANG) {
    process.env.LANG = 'en_US.UTF-8';
  }
  if (!process.env.LC_ALL) {
    process.env.LC_ALL = 'en_US.UTF-8';
  }
  if (!process.env.VSCODE_NLS_CONFIG) {
    process.env.VSCODE_NLS_CONFIG = JSON.stringify({ locale: 'en-us', availableLanguages: {} });
  }
  console.log(`  Locale lock: LANG=${process.env.LANG} LC_ALL=${process.env.LC_ALL}`);

  const outTestDir = path.resolve(projectDir, 'out', 'test');
  const testFile = (name) => path.join(outTestDir, name).replace(/\\/g, '/');

  const phase0Files = [testFile('nonLogicAppStartup.test.js')];

  const phase1Files = [testFile('basic.test.js'), testFile('commands.test.js'), testFile('createWorkspace.behavior.test.js')];
  // Phase 4.1a (NEW Step 2): fast fixtures-only wizard run that writes the manifest
  // consumed by downstream shape-specific scenarios. Drives the wizard only for
  // Standard/Stateful, Standard/Stateless, CustomCode/Stateful, and RulesEngine/Stateful.
  const phase1aFiles = [testFile('createWorkspace.fixtures.test.js')];

  const phase2Files = [testFile('designerActions.test.js')];

  // Each new test gets its own phase (fresh VS Code session) to avoid
  // workspace-switch contention with the previous test's debug processes.
  const phase3Files = [testFile('inlineJavascript.test.js')];
  const phase4Files = [testFile('statelessVariables.test.js')];
  const phase5Files = [testFile('designerViewExtended.test.js')];
  const phase6Files = [testFile('keyboardNavigation.test.js')];

  const phase7Files = [testFile('demo.test.js'), testFile('smoke.test.js'), testFile('standalone.test.js'), testFile('dataMapper.test.js')];

  // Conversion tests (ADO #31054994, Steps 5-15)
  // Each gets its own session because they need different startup folders.
  const phase8aFiles = [testFile('workspaceConversionNo.test.js')];
  const phase8bFiles = [testFile('workspaceConversionCreate.test.js')];
  // Phase 4.8c combines: add workflow via right-click + open multiple designers
  const phase8cFiles = [testFile('multipleDesigners.test.js')];
  // Wave 2: Tests that involve window reload or different folder open scenarios
  const phase8dFiles = [testFile('workspaceConversionYes.test.js')];
  const phase8eFiles = [testFile('workspaceConversionSubfolder.test.js')];

  const phase10ModernFiles = [testFile('codefulDebugTasksModern.test.js')];
  const phase10LegacyFiles = [testFile('codefulDebugTasksLegacy.test.js')];

  // ------------------------------------------------------------------
  // Per-scenario inventory (Phase A scaffold).
  //
  // Declarative table mapping each E2E test file to its workspace spec
  // and per-session settings. Consumed by runScenarioPhases() via
  // E2E_MODE=scenarios. Existing E2E_MODE handlers (full, designeronly,
  // createplusdesigner, etc.) do NOT use this table — they remain
  // unchanged. Phase B will start migrating individual phases through
  // this bootstrapper one at a time.
  //
  // Field reference:
  //   id            — scenario label passed to prepareFreshSession()
  //                   and used in logs; also the manifest-listing key.
  //   testFile      — absolute path to the compiled test JS, or an
  //                   array of paths when monolithic === true.
  //   workspaceSpec — see selectWorkspaceForSpec() below for the
  //                   supported shapes ('plain-folder', 'self-creates',
  //                   'self-contained', 'manifest-multi', or an object
  //                   with { appType, wfType, use? }).
  //   settings      — passed to writeTestSettings(); 'auto' for
  //                   validateDependencies resolves to
  //                   shouldValidateRuntimeDependencies() at runtime.
  //   monolithic    — true when the scenario runs multiple test files
  //                   in a single VS Code session (currently 4.1, 4.7).
  // ------------------------------------------------------------------
  const scenarios = [
    // Independent / no-workspace scenarios
    {
      id: 'p40-nonlogicapp',
      testFile: phase0Files[0],
      workspaceSpec: 'plain-folder',
      settings: { validateDependencies: false, autoStartDesignTime: false, includeRuntimeDependencyPaths: false },
    },
    {
      id: 'p48b-conversioncreate',
      testFile: phase8bFiles[0],
      workspaceSpec: 'self-contained',
      settings: { validateDependencies: true, autoStartDesignTime: false },
    },

    // Phase 4.1a (NEW Step 2) — fast fixtures-only wizard run. Writes the manifest
    // consumed by Phase 4.2 / 4.3 shape-specific scenarios. This is the critical
    // path; the full 12-shape behavior validation runs independently as p41b.
    {
      id: 'p41a-fixtures',
      testFile: phase1aFiles[0],
      workspaceSpec: 'self-creates',
      settings: { validateDependencies: true, autoStartDesignTime: true },
    },
    // Phase 4.1b (NEW Step 2) — full 12-shape wizard validation + 75 form/validation
    // assertions. Runs on its own parallel shard OFF the critical path. No downstream
    // scenarios depend on the manifest this writes.
    {
      id: 'p41b-createworkspace-behavior',
      testFile: phase1Files,
      workspaceSpec: 'self-creates',
      settings: { validateDependencies: true, autoStartDesignTime: true },
      monolithic: true,
    },

    // Phase 4.2 — designer lifecycle (Standard / CustomCode / RulesEngine sharded).
    {
      id: 'p42-standard',
      testFile: phase2Files[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'standard' },
    },
    {
      id: 'p42-customcode',
      testFile: phase2Files[0],
      workspaceSpec: { appType: 'customCode', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'customCode' },
    },
    {
      id: 'p42-rulesengine',
      testFile: phase2Files[0],
      workspaceSpec: { appType: 'rulesEngine', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'rulesEngine' },
    },

    // Phases 4.3-4.6 — runtime-touching consumer tests
    {
      id: 'p43-inlinejavascript',
      testFile: phase3Files[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'standard' },
    },
    {
      id: 'p43-customcode',
      testFile: phase3Files[0],
      workspaceSpec: { appType: 'customCode', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'customCode' },
    },
    {
      id: 'p43-rulesengine',
      testFile: phase3Files[0],
      workspaceSpec: { appType: 'rulesEngine', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      env: { LA_E2E_SHAPE: 'rulesEngine' },
    },
    {
      id: 'p44-statelessvariables',
      testFile: phase4Files[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateless' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
    },
    {
      id: 'p45-designerviewextended',
      testFile: phase5Files[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful' },
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
    },
    {
      id: 'p46-keyboardnav',
      testFile: phase6Files[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful', use: 'p41a-fixtures' },
      settings: { validateDependencies: false, autoStartDesignTime: true },
    },

    // Phase 4.7 — designer-shell smoke + dataMapper. dataMapper.test.ts
    // reads the manifest in its own `before` hook, so the bootstrapper
    // passes the preferred standard workspace as a startup resource.
    {
      id: 'p47-suite',
      testFile: phase7Files,
      workspaceSpec: 'manifest-multi',
      settings: { validateDependencies: 'auto', autoStartDesignTime: true },
      monolithic: true,
    },

    // Phases 4.8a/c/d/e — conversion tests
    {
      id: 'p48a-conversionno',
      testFile: phase8aFiles[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful', use: 'wsDir' },
      settings: { validateDependencies: true, autoStartDesignTime: false },
    },
    {
      id: 'p48c-multipledesigners',
      testFile: phase8cFiles[0],
      workspaceSpec: 'manifest-multi',
      settings: { validateDependencies: true, autoStartDesignTime: true },
    },
    {
      id: 'p48d-conversionyes',
      testFile: phase8dFiles[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful', use: 'wsDir' },
      settings: { validateDependencies: true, autoStartDesignTime: false },
    },
    {
      id: 'p48e-conversionsubfolder',
      testFile: phase8eFiles[0],
      workspaceSpec: { appType: 'standard', wfType: 'Stateful', use: 'appDir' },
      settings: { validateDependencies: true, autoStartDesignTime: false },
    },
  ];

  const e2eMode = (process.env.E2E_MODE || 'full').toLowerCase();
  console.log(`\nE2E mode: ${e2eMode}`);
  // Note: shard reliability is gated by helpers in runHelpers.ts (waitForRuntimeReady,
  // clickRunTrigger, assertRunTriggerable) and helpers.ts (selectCreateWorkspaceCommand,
  // switchToWebviewFrame, openFolderInSession, waitForWorkbenchReady). All CI-dependent
  // runtime-gated waits use a 90s minimum deadline per the VS Code E2E reliability playbook.

  const runOptions = {
    vscodeVersion: VSCODE_VERSION,
    settings: settingsFile,
    cleanup: false,
    offline: false,
    resources: [],
  };

  const prepareFreshSession = async (label) => {
    const settingsDir = path.join(require('os').tmpdir(), 'test-resources', 'settings');
    const userDir = path.join(settingsDir, 'User');

    // Kill any lingering VS Code processes from previous phases.
    // Without this, the old VS Code window stays open and `code -r` from
    // ExTester's openResources sends the workspace-open command to the OLD
    // window instead of the new one. The new window stays bare (no folder),
    // which is why screenshots show empty VS Code on CI.
    try {
      const { execSync } = require('child_process');
      const isLinux = process.platform === 'linux';
      const isMac = process.platform === 'darwin';

      if (isLinux || isMac) {
        // Kill all VS Code processes from test-resources directory
        // Use pkill with full process matching, or fall back to killall
        try {
          execSync('pkill -f "test-resources.*[Cc]ode"', { stdio: 'ignore', timeout: 10000 });
        } catch {
          // pkill returns exit code 1 if no processes matched — that's OK
        }
        // Also kill any chromedriver processes from previous sessions
        try {
          execSync('pkill -f chromedriver', { stdio: 'ignore', timeout: 5000 });
        } catch {
          /* no chromedriver running — fine */
        }
        // Kill orphan Functions runtime / dotnet / vsdbg processes left behind
        // by failed debug sessions (Phase 4.3 retries can leave these alive,
        // which then bind :7071 in a zombie state and break Phase 4.4's host
        // detection — toolbarSeen=702ms but hostRunningSeen=never).
        try {
          execSync('pkill -f "func.*host.*start"', { stdio: 'ignore', timeout: 5000 });
        } catch {
          /* pkill returns 1 if no processes matched — OK */
        }
        try {
          execSync('pkill -f "[Ff]unc.*Microsoft.Azure.WebJobs.Script"', { stdio: 'ignore', timeout: 5000 });
        } catch {
          /* OK */
        }
        try {
          execSync('pkill -f vsdbg-ui', { stdio: 'ignore', timeout: 5000 });
        } catch {
          /* OK */
        }
        // Don't pkill dotnet broadly — it may kill the runner's other dotnet
        // processes. Only kill dotnet processes that are children of func (covered
        // by the "func.*host.*start" pkill above which terminates the process group).
      } else {
        // Windows: use PowerShell
        execSync(
          'powershell -NoProfile -Command "Get-Process -Name Code -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*test-resources*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"',
          { stdio: 'ignore', timeout: 10000 }
        );
        // Kill orphan Functions runtime / vsdbg processes on Windows
        try {
          execSync(
            'powershell -NoProfile -Command "Get-Process -Name func,vsdbg-ui -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"',
            { stdio: 'ignore', timeout: 10000 }
          );
        } catch {
          /* OK */
        }
      }
      console.log(`  [${label}] ✓ Killed lingering VS Code/chromedriver/func/vsdbg processes`);
      // Wait for processes to fully exit and release IPC sockets.
      // On Linux, VS Code writes an IPC socket to the user-data-dir for
      // the CLI `code -r` command to connect. If the old socket persists,
      // the new VS Code can't bind, and `code -r` either connects to a
      // dead socket (silent failure) or opens in the wrong window.
      await new Promise((r) => setTimeout(r, 5000));

      // Clean up stale IPC socket files so new VS Code gets a fresh socket
      if (isLinux || isMac) {
        try {
          const sockFiles = fs.readdirSync(settingsDir).filter((f) => f.endsWith('.sock'));
          for (const sock of sockFiles) {
            fs.unlinkSync(path.join(settingsDir, sock));
            console.log(`  [${label}] ✓ Removed stale socket: ${sock}`);
          }
        } catch {
          /* settingsDir may not exist yet */
        }
      }
    } catch {
      console.log(`  [${label}] No lingering processes to kill (or kill failed — continuing)`);
    }

    // Only delete settings/User/ — NOT the entire settings/ dir.
    // Locked log/cache files live in settings/logs/ and settings/Cache/
    // which we don't need to touch. ExTester's VSBrowser.start() calls
    // fs.removeSync(settings) ONLY if settings/User exists, so by
    // deleting User/ ourselves, we prevent ExTester from hitting the
    // locked files at all. ExTester then creates a fresh User/ dir.
    if (fs.existsSync(userDir)) {
      try {
        fs.rmSync(userDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
        console.log(`  [${label}] ✓ Deleted settings/User`);
      } catch (e) {
        console.warn(`  [${label}] Could not delete settings/User: ${e.message}`);
        console.warn(`  [${label}] Proceeding anyway — ExTester will create fresh settings`);
      }
    } else {
      console.log(`  [${label}] settings/User does not exist, nothing to clean`);
    }

    // Fix execute permissions on downloaded runtime binaries.
    // The extension's download/extract process doesn't set chmod +x on Linux,
    // causing "/bin/sh: 1: .../func: Permission denied" when the extension
    // tries to run `func host start` to start the design-time API.
    if (process.platform === 'linux' || process.platform === 'darwin') {
      const { execSync } = require('child_process');
      const { funcBinary, dotnetBinary, nodeBinary, funcToolsDir } = getRuntimeDependencyPaths();
      for (const bin of [funcBinary, dotnetBinary, nodeBinary]) {
        if (fs.existsSync(bin)) {
          try {
            execSync(`chmod +x "${bin}"`, { stdio: 'ignore' });
          } catch {
            /* ignore */
          }
        }
      }
      // Also chmod the entire FuncCoreTools directory — it contains sub-binaries
      // (e.g., gozip, func) that all need execute permission.
      if (fs.existsSync(funcToolsDir)) {
        try {
          execSync(`chmod -R +x "${funcToolsDir}"`, { stdio: 'ignore' });
          console.log(`  [${label}] ✓ Fixed execute permissions on runtime binaries`);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const runPhase = async (phaseName, files, optionsOverride = {}) => {
    const phaseRunOptions = {
      ...runOptions,
      ...optionsOverride,
    };
    console.log(`\n=== ${phaseName} ===`);
    console.log(`  Files: ${files.join(', ')}`);
    if (phaseRunOptions.resources?.length) {
      console.log(`  Startup resources: ${phaseRunOptions.resources.join(', ')}`);
      // Diagnostic: verify startup resource files exist
      for (const r of phaseRunOptions.resources) {
        const exists = fs.existsSync(r);
        const isDir = exists && fs.statSync(r).isDirectory();
        console.log(`  Resource "${path.basename(r)}": exists=${exists}, isDir=${isDir}`);
      }
    }
    // Diagnostic: list files in settings dir to check for IPC sockets
    try {
      const settingsDir = path.join(require('os').tmpdir(), 'test-resources', 'settings');
      if (fs.existsSync(settingsDir)) {
        const contents = fs.readdirSync(settingsDir);
        console.log(`  Settings dir (${contents.length} items): ${contents.slice(0, 15).join(', ')}`);
      }
    } catch {
      /* ignore */
    }
    // ExTester runs Mocha in this Node process. Some phases intentionally reuse
    // the same compiled test file with different env gates (for example
    // createWorkspace.behavior.test.js in Phase 4.1b and Phase 4.10A), so clear cached
    // test modules before adding them to a new Mocha instance.
    for (const file of files) {
      try {
        delete require.cache[require.resolve(file)];
      } catch {
        /* ignore */
      }
    }
    const phaseTester = new ExTester(undefined, undefined, extDir);
    const code = await phaseTester.runTests(files, phaseRunOptions);
    console.log(`  ${phaseName} exit code: ${code}`);
    return code;
  };

  const configureCodefulRecorderEnvironment = () => {
    const eventsFile = path.join(os.tmpdir(), 'la-e2e-test', 'codeful-events.jsonl');
    const triggerDir = path.join(os.tmpdir(), 'la-e2e-test', 'triggers');
    fs.mkdirSync(path.dirname(eventsFile), { recursive: true });
    fs.mkdirSync(triggerDir, { recursive: true });
    try {
      for (const entry of fs.readdirSync(triggerDir)) {
        fs.unlinkSync(path.join(triggerDir, entry));
      }
    } catch {
      /* ignore */
    }
    try {
      fs.writeFileSync(eventsFile, '');
    } catch {
      /* ignore */
    }
    process.env.LA_E2E_TASK_EVENTS_JSONL = eventsFile;
    process.env.CODEFUL_TASK_EVENTS_JSONL = eventsFile;
    process.env.LA_E2E_TRIGGER_DIR = triggerDir;
    console.log(`  Events file: ${eventsFile}`);
    console.log(`  Trigger dir:  ${triggerDir}`);
  };

  const loadCodefulDebugWorkspaces = () => {
    const manifestPath = path.join(os.tmpdir(), 'la-e2e-test', 'created-workspaces.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Codeful debug manifest not found: ${manifestPath}`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const codefulEntries = manifest.filter((entry) => entry.appType === 'codeful');
    const modern = codefulEntries.find((entry) => /modern/i.test(entry.label)) || codefulEntries[0];
    const legacy = codefulEntries.find((entry) => /legacy/i.test(entry.label)) || codefulEntries[1];
    for (const [variant, entry] of [
      ['modern', modern],
      ['legacy', legacy],
    ]) {
      if (!entry) {
        throw new Error(`Missing ${variant} codeful workspace entry in ${manifestPath}`);
      }
      for (const requiredPath of [entry.wsFilePath, entry.appDir]) {
        if (!requiredPath || !fs.existsSync(requiredPath)) {
          throw new Error(`Missing ${variant} codeful generated path: ${requiredPath}`);
        }
      }
    }
    return { modern, legacy };
  };

  const patchLegacyCodefulCsproj = (entry) => {
    const csprojFiles = fs.readdirSync(entry.appDir).filter((name) => name.endsWith('.csproj'));
    if (csprojFiles.length !== 1) {
      throw new Error(`Expected exactly one codeful .csproj in ${entry.appDir}, found ${csprojFiles.length}: ${csprojFiles.join(', ')}`);
    }
    const csprojPath = path.join(entry.appDir, csprojFiles[0]);
    let updated = fs.readFileSync(csprojPath, 'utf8');
    for (const targetName of ['CopyToCodefulFolder', 'ReplaceLanguageNetCore']) {
      const targetMatch = updated.match(new RegExp(`<Target\\b[^>]*Name=["']${targetName}["'][^>]*>`));
      if (!targetMatch) {
        throw new Error(`Could not find ${targetName} target in ${csprojPath}`);
      }
      const targetTag = targetMatch[0];
      const updatedTag = targetTag.replace(/(AfterTargets=["'])Build;Publish(["'])/, '$1Publish$2');
      if (updatedTag === targetTag) {
        throw new Error(`Could not patch ${targetName} AfterTargets from Build;Publish to Publish in ${csprojPath}`);
      }
      updated = updated.replace(targetTag, updatedTag);
    }
    fs.writeFileSync(csprojPath, updated, 'utf8');
    console.log(`  Patched legacy codeful targets AfterTargets=Publish in ${csprojPath}`);
  };

  const patchGeneratedCodefulProjectForDebugGuard = (entry, variant) => {
    const workflowFile = path.join(entry.appDir, `${entry.wfName}.cs`);
    const programFile = path.join(entry.appDir, 'Program.cs');

    for (const requiredPath of [workflowFile, programFile]) {
      if (!fs.existsSync(requiredPath)) {
        throw new Error(`Missing generated ${variant} codeful file required for debug-guard patch: ${requiredPath}`);
      }
    }

    const originalWorkflow = fs.readFileSync(workflowFile, 'utf8');
    const namespaceName = originalWorkflow.match(/namespace\s+([A-Za-z_][A-Za-z0-9_.]*)/)?.[1];
    const className = originalWorkflow.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
    if (!namespaceName || !className) {
      throw new Error(`Could not read namespace/class from generated codeful workflow: ${workflowFile}`);
    }

    // Phase 4.10 validates the VS Code debug task chain, not connector
    // execution. The current generated template uses an MSN Weather managed
    // connector and the preview SDK package no longer exposes the generated
    // IWorkflowProvider/AddWorkflowProviders surface. Keep the project
    // D-001-compliant by patching only the generated files after the real
    // Create Workspace webview completes: use built-in HTTP trigger/Response
    // APIs that compile with the package currently referenced by the template,
    // and remove the stale provider-registration call.
    const patchedWorkflow = `// -----------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// -----------------------------------------------------------

namespace ${namespaceName}
{
    using Microsoft.Azure.Workflows.Sdk;

    /// <summary>
    /// "${entry.wfName}" connector-free Stateful workflow for the Phase 4.10 debug task guard.
    /// </summary>
    public class ${className}
    {
        /// <summary>
        /// Gets a built-in HTTP request/response workflow definition.
        /// </summary>
        public IWorkflowTrigger GetWorkflow()
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var response = WorkflowActions.BuiltIn.Response(responseBody: () => "ok");
            var workflow = trigger.Then(response);

            return WorkflowFactory.CreateStatefulWorkflow("${entry.wfName}", workflow);
        }
    }
}
`;

    fs.writeFileSync(workflowFile, patchedWorkflow, 'utf8');

    const originalProgram = fs.readFileSync(programFile, 'utf8');
    const patchedProgram = originalProgram.replace(/^\s*services\.AddWorkflowProviders\(typeof\(Program\)\.Assembly\);\r?\n/m, '');
    if (patchedProgram === originalProgram && originalProgram.includes('AddWorkflowProviders')) {
      throw new Error(`Could not remove stale AddWorkflowProviders call from ${programFile}`);
    }
    fs.writeFileSync(programFile, patchedProgram, 'utf8');

    for (const connectionArtifact of ['connections.json', 'parameters.json']) {
      const artifactPath = path.join(entry.appDir, connectionArtifact);
      if (fs.existsSync(artifactPath)) {
        fs.rmSync(artifactPath, { force: true });
        console.log(`  Removed ${variant} connector artifact: ${artifactPath}`);
      }
    }

    console.log(`  Patched ${variant} generated codeful workflow to built-in HTTP trigger + Response: ${workflowFile}`);
  };

  const removeDesignTimeEvidence = async (entry, variant) => {
    const designTimeDir = path.join(entry.appDir, 'workflow-designtime');
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        fs.rmSync(designTimeDir, { recursive: true, force: true });
        console.log(`  Removed stale ${variant} design-time evidence: ${designTimeDir}`);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === 6 && !/EBUSY|EPERM|resource busy|locked/i.test(message)) {
          throw err;
        }
        if (attempt === 6) {
          console.log(
            `  Could not remove stale ${variant} design-time evidence because it is locked; continuing so the fresh phase must update it: ${message}`
          );
          return;
        }
        console.log(`  Waiting to remove stale ${variant} design-time evidence (attempt ${attempt}): ${message}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  };

  const runCodefulDebugPhases = async (labelPrefix) => {
    writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
    process.env.LA_E2E_CODEFUL_CREATE_ONLY = '1';
    await prepareFreshSession(`${labelPrefix}-phase10a-create`);
    const createExit = await runPhase('Phase 4.10A: create codeful workspaces', [testFile('createWorkspace.behavior.test.js')]);
    delete process.env.LA_E2E_CODEFUL_CREATE_ONLY;
    if (createExit !== 0) {
      console.log(`\n⚠ Phase 4.10A exited with code ${createExit}; skipping Phase 4.10B`);
      return createExit;
    }

    const { modern, legacy } = loadCodefulDebugWorkspaces();
    patchGeneratedCodefulProjectForDebugGuard(modern, 'modern');
    patchGeneratedCodefulProjectForDebugGuard(legacy, 'legacy');
    patchLegacyCodefulCsproj(legacy);

    installCodefulTaskRecorderExtension(extDir);
    rebuildExtensionsJson(extDir);
    configureCodefulRecorderEnvironment();

    process.env.LA_E2E_CODEFUL_MODERN_DIR = modern.appDir;
    process.env.LA_E2E_CODEFUL_LEGACY_DIR = legacy.appDir;
    process.env.LA_E2E_CODEFUL_MODERN_WORKSPACE = modern.wsFilePath;
    process.env.LA_E2E_CODEFUL_LEGACY_WORKSPACE = legacy.wsFilePath;
    console.log(`  Modern codeful workspace: ${modern.wsFilePath}`);
    console.log(`  Legacy codeful workspace: ${legacy.wsFilePath}`);

    writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });

    process.env.LA_E2E_CODEFUL_VARIANT = 'modern';
    await prepareFreshSession(`${labelPrefix}-phase10b-modern`);
    await removeDesignTimeEvidence(modern, 'modern');
    const modernExit = await runPhase('Phase 4.10B-modern: codefulDebugTasks', phase10ModernFiles, { resources: [modern.wsFilePath] });

    process.env.LA_E2E_CODEFUL_VARIANT = 'legacy';
    await prepareFreshSession(`${labelPrefix}-phase10b-legacy`);
    await removeDesignTimeEvidence(legacy, 'legacy');
    const legacyExit = await runPhase('Phase 4.10B-legacy: codefulDebugTasks', phase10LegacyFiles, { resources: [legacy.wsFilePath] });
    delete process.env.LA_E2E_CODEFUL_VARIANT;

    return Math.max(modernExit, legacyExit);
  };

  try {
    const getPhase2Resources = () => {
      const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
      let phase2Resources = [];
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          // Use the same fallback order as the test files:
          // prefer standard+Stateful, then any standard, then first entry
          const preferred =
            manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') ||
            manifest.find((e) => e.appType === 'standard') ||
            manifest[0];
          if (preferred?.wsFilePath && fs.existsSync(preferred.wsFilePath)) {
            phase2Resources = [preferred.wsFilePath];
            console.log(`  Using startup workspace: ${preferred.wsFilePath}`);
          } else {
            console.warn('  Could not find a valid directory in manifest for phase 2 startup resource');
          }
        } catch (e) {
          console.warn(`  Failed to parse manifest for phase 2 startup resource: ${e.message}`);
        }
      } else {
        console.warn(`  Manifest not found for phase 2 startup resource: ${manifestPath}`);
      }
      return phase2Resources;
    };

    const getStandardStatelessResources = () => {
      const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`  Manifest not found for stateless startup resource: ${manifestPath}`);
        return [];
      }
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const preferred = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateless');
        if (preferred?.wsFilePath && fs.existsSync(preferred.wsFilePath)) {
          console.log(`  Using stateless startup workspace: ${preferred.wsFilePath}`);
          return [preferred.wsFilePath];
        }
        console.warn('  Could not find Standard + Stateless workspace in manifest for stateless startup resource');
      } catch (e) {
        console.warn(`  Failed to parse manifest for stateless startup resource: ${e.message}`);
      }
      return [];
    };

    // ------------------------------------------------------------------
    // Phase A — per-scenario workspace resolver.
    //
    // Pure function that maps a scenario's `workspaceSpec` to the array
    // of startup resources passed to ExTester's `runTests({ resources })`.
    // Supported shapes:
    //   'plain-folder'   — no resources; extension activates without a
    //                      Logic App context. Currently only Phase 4.0.
    //   'self-creates'   — no resources; the test creates its own
    //                      workspace from inside VS Code (Phase 4.1).
    //   'self-contained' — builds a legacy project fixture via
    //                      createLegacyProjectFixture() and also sets
    //                      LA_E2E_LEGACY_PROJECT_DIR so the test can
    //                      locate it. Returns [legacyDir].
    //   'manifest-multi' — reads created-workspaces.json and returns
    //                      the preferred standard+Stateful entry's
    //                      .code-workspace path (same as
    //                      getPhase2Resources()). Used by phases whose
    //                      tests further consume the manifest at runtime
    //                      (4.7 dataMapper, 4.8c multipleDesigners).
    //   { appType, wfType, use? } — reads the manifest, picks the
    //                      matching entry, and returns its wsFilePath
    //                      (default), wsDir (`use: 'wsDir'`), or appDir
    //                      (`use: 'appDir'`) as a single-element array.
    //
    // Returns { resources, legacyDir? }. `legacyDir` is set only for
    // 'self-contained' so runScenarioPhases can wire up the env var.
    const selectWorkspaceForSpec = (spec, scenarioId) => {
      if (spec === 'plain-folder' || spec === 'self-creates') {
        return { resources: [] };
      }
      if (spec === 'self-contained') {
        const legacyDir = createLegacyProjectFixture(scenarioId);
        return { resources: [legacyDir], legacyDir };
      }
      const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {
          console.warn(`  [${scenarioId}] Failed to parse manifest: ${e.message}`);
        }
      } else {
        console.warn(`  [${scenarioId}] Manifest not found: ${manifestPath}`);
      }
      if (spec === 'manifest-multi') {
        // Mirrors getPhase2Resources() — returns the preferred standard
        // workspace; the test itself walks the manifest for the rest.
        if (!manifest) return { resources: [] };
        const preferred =
          manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') ||
          manifest.find((e) => e.appType === 'standard') ||
          manifest[0];
        if (preferred?.wsFilePath && fs.existsSync(preferred.wsFilePath)) {
          return { resources: [preferred.wsFilePath] };
        }
        return { resources: [] };
      }
      if (spec && typeof spec === 'object') {
        if (!manifest) return { resources: [] };
        const { appType, wfType, use } = spec;
        const entry =
          manifest.find((e) => (!appType || e.appType === appType) && (!wfType || e.wfType === wfType)) ||
          (!wfType ? manifest.find((e) => !appType || e.appType === appType) : undefined) ||
          (!appType && !wfType ? manifest[0] : undefined);
        if (!entry) {
          console.warn(`  [${scenarioId}] No manifest entry matched ${JSON.stringify(spec)}`);
          return { resources: [] };
        }
        const key = use === 'wsDir' ? 'wsDir' : use === 'appDir' ? 'appDir' : 'wsFilePath';
        const value = entry[key];
        if (value && fs.existsSync(value)) {
          return { resources: [value] };
        }
        console.warn(`  [${scenarioId}] Manifest entry missing ${key}: ${value}`);
        return { resources: [] };
      }
      console.warn(`  [${scenarioId}] Unknown workspaceSpec; returning no resources: ${JSON.stringify(spec)}`);
      return { resources: [] };
    };

    // ------------------------------------------------------------------
    // Phase A — per-scenario bootstrapper.
    //
    // Modeled on runCodefulDebugPhases() (above). For each scenario:
    //   1. Resolve writeTestSettings (with 'auto' → live runtime check).
    //   2. prepareFreshSession() to kill stale VS Code / chromedriver /
    //      func / vsdbg processes and clear settings/User.
    //   3. Resolve startup resources via selectWorkspaceForSpec().
    //   4. Export LA_E2E_LEGACY_PROJECT_DIR for self-contained specs.
    //   5. Hand off to runPhase() (one ExTester instance per scenario).
    //   6. Collect exit codes; every scenario contributes to the aggregate.
    //
    // Returns the aggregate exit code.
    const runScenarioPhases = async (scenarioList /* , opts */) => {
      const exits = [];
      for (const scenario of scenarioList) {
        const { id, testFile: files, workspaceSpec, settings = {}, monolithic, env: scenarioEnv } = scenario;
        const resolvedSettings = { ...settings };
        if (resolvedSettings.validateDependencies === 'auto') {
          resolvedSettings.validateDependencies = shouldValidateRuntimeDependencies();
        }
        writeTestSettings(resolvedSettings);

        // Apply per-scenario env overrides (e.g. LA_E2E_SHAPE for parameterized
        // shape-specific shards). Captured here so we can restore afterward.
        const envOverridesApplied = [];
        if (scenarioEnv && typeof scenarioEnv === 'object') {
          for (const [key, value] of Object.entries(scenarioEnv)) {
            envOverridesApplied.push({ key, prev: process.env[key] });
            process.env[key] = String(value);
            console.log(`  [${id}] env override: ${key}=${value}`);
          }
        }

        await prepareFreshSession(id);
        const { resources, legacyDir } = selectWorkspaceForSpec(workspaceSpec, id);
        if (legacyDir) {
          process.env.LA_E2E_LEGACY_PROJECT_DIR = legacyDir;
        }
        const fileList = Array.isArray(files) ? files : [files];
        if (!monolithic && fileList.length !== 1) {
          console.warn(`  [${id}] Non-monolithic scenario received ${fileList.length} files; running all of them`);
        }
        const exit = await runPhase(`Scenario ${id}`, fileList, { resources });
        // Restore env overrides so subsequent scenarios aren't contaminated.
        for (const { key, prev } of envOverridesApplied) {
          if (prev === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = prev;
          }
        }
        exits.push(exit);
        // Brief pause between sessions to let VS Code/chromedriver release
        // ports and sockets before the next prepareFreshSession() runs.
        await new Promise((r) => setTimeout(r, 3000));
      }
      const aggregate = exits.length === 0 ? 0 : Math.max(...exits);
      console.log(`\n=== Scenarios results: ${exits.length} blocking → exit ${aggregate} ===`);
      return aggregate;
    };

    // Step 3 (per-scenario matrix): LA_E2E_SCENARIO selects a single
    // scenarios[] entry by id. Takes precedence over E2E_MODE so a matrix
    // shard that sets both env vars (e.g. for transitional debugging)
    // still runs exactly one scenario. E2E_MODE remains supported as a
    // fallback for legacy grouped-shard invocations.
    const singleScenarioId = process.env.LA_E2E_SCENARIO;
    if (singleScenarioId) {
      const scenarioEntry = scenarios.find((s) => s.id === singleScenarioId);
      if (!scenarioEntry) {
        console.error(`Unknown LA_E2E_SCENARIO: ${singleScenarioId}`);
        console.error(`Known scenarios: ${scenarios.map((s) => s.id).join(', ')}`);
        process.exit(2);
      }
      console.log(`\nRunning single scenario (LA_E2E_SCENARIO): ${singleScenarioId}`);
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const singleExit = await runScenarioPhases([scenarioEntry]);
      process.exit(singleExit);
    }

    if (e2eMode === 'scenarios') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const scenariosExit = await runScenarioPhases(scenarios);
      process.exit(scenariosExit);
    }

    if (e2eMode === 'scenarios-pilot') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      // Pilot exactly one scenario: inlineJavascript. Decision gate per the
      // per-scenario re-architecture plan — if this passes where the current
      // createplusnewtests shard fails Phase 4.3, the new pattern is validated.
      const pilotScenarios = scenarios.filter((s) => s.id === 'p43-inlinejavascript');
      if (pilotScenarios.length === 0) {
        throw new Error('scenarios-pilot: p43-inlinejavascript scenario not found in scenarios[] table');
      }
      // Phase 4.1 must run first to populate the manifest the bootstrapper consumes
      // for { appType: 'standard', wfType: 'Stateful' }. Mirror createplusnewtests's
      // Phase 4.1 invocation.
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await prepareFreshSession('phase1-pilot');
      const phase1Exit = await runPhase('Phase 4.1: createWorkspace (pilot prerequisite)', phase1Files);
      if (phase1Exit !== 0) {
        console.log(`\n⚠ Phase 4.1 exited with code ${phase1Exit} — pilot cannot proceed without manifest`);
        process.exit(phase1Exit);
      }
      // Now run the pilot scenario through the bootstrapper.
      const pilotExit = await runScenarioPhases(pilotScenarios);
      console.log(`\n=== Pilot result: 4.1=${phase1Exit}, p43-inlinejavascript=${pilotExit} → exit ${Math.max(phase1Exit, pilotExit)} ===`);
      process.exit(Math.max(phase1Exit, pilotExit));
    }

    if (e2eMode === 'codefuldebugonly') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const phase10Exit = await runCodefulDebugPhases('phase10-only');
      process.exit(phase10Exit);
    }

    if (e2eMode === 'nonlogicappstartup') {
      // Startup regression test: intentionally omit runtime dependency paths to
      // exercise extension activation in a plain, non-Logic-App folder.
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      writeTestSettings({ validateDependencies: false, autoStartDesignTime: false, includeRuntimeDependencyPaths: false });

      await prepareFreshSession('nonlogicappstartup-only');
      const startupExit = await runPhase('Phase 4.0: nonLogicAppStartup', phase0Files);
      process.exit(startupExit);
    }

    if (e2eMode === 'designeronly') {
      // Ensure VS Code and ChromeDriver are downloaded
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });

      await prepareFreshSession('phase2-only');
      const phase2Resources = getPhase2Resources();
      const phase2Exit = await runPhase('Phase 4.2: designerActions', phase2Files, {
        resources: phase2Resources,
      });
      process.exit(phase2Exit);
    }

    if (e2eMode === 'newtestsonly') {
      // Run only the new tests (phases 4.3–4.6) each in their own session
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });
      const wsResources = getPhase2Resources();
      const exits = [];

      await prepareFreshSession('phase3-only');
      exits.push(await runPhase('Phase 4.3: inlineJavascript', phase3Files, { resources: wsResources }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase4-only');
      exits.push(await runPhase('Phase 4.4: statelessVariables', phase4Files, { resources: getStandardStatelessResources() }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase5-only');
      exits.push(await runPhase('Phase 4.5: designerViewExtended', phase5Files, { resources: wsResources }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase6-only');
      exits.push(await runPhase('Phase 4.6: keyboardNavigation', phase6Files, { resources: wsResources }));

      const finalExit = Math.max(...exits);
      console.log(`\n=== New tests results: ${exits.map((c, i) => `4.${i + 3}=${c}`).join(', ')} → exit ${finalExit} ===`);
      process.exit(finalExit);
    }

    if (e2eMode === 'conversiononly') {
      // Run only the workspace conversion tests (phases 4.8a–4.8d)
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      // ALL conversion tests need validateDependencies ON so the extension
      // fully activates and detects legacy projects / shows conversion dialog.
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      const wsResources = getPhase2Resources();
      const exits = [];

      // Phase 4.8a: Open workspace DIR (not .code-workspace), click No
      // Startup resource = workspace directory (the folder containing .code-workspace)
      const wsDir = (() => {
        const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const preferred = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest[0];
            if (preferred?.wsDir && fs.existsSync(preferred.wsDir)) return [preferred.wsDir];
          } catch {
            /* ignore */
          }
        }
        return [];
      })();
      if (wsDir.length > 0) {
        await prepareFreshSession('phase8a-only');
        exits.push(await runPhase('Phase 4.8a: conversionNo', phase8aFiles, { resources: wsDir }));
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.warn('  No workspace directory found for phase 4.8a — skipping');
        exits.push(0);
      }

      // Phase 4.8b: Open legacy project folder (no .code-workspace), click Yes
      const legacyDir = createLegacyProjectFixture('conversiononly');
      // Phase 4.8b: Enable dependency validation so extension fully activates
      // and shows the conversion dialog for legacy projects.
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      await prepareFreshSession('phase8b-only');
      process.env.LA_E2E_LEGACY_PROJECT_DIR = legacyDir;
      exits.push(await runPhase('Phase 4.8b: conversionCreate', phase8bFiles, { resources: [legacyDir] }));
      await new Promise((r) => setTimeout(r, 3000));

      // Phase 4.8c: Multiple designers + add workflow — needs full design-time
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await prepareFreshSession('phase8c-only');
      exits.push(await runPhase('Phase 4.8c: multipleDesigners', phase8cFiles, { resources: wsResources }));
      await new Promise((r) => setTimeout(r, 3000));

      // Phase 4.8d: Keep validateDependencies ON for conversion dialog
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      if (wsDir.length > 0) {
        await prepareFreshSession('phase8d-only');
        exits.push(await runPhase('Phase 4.8d: conversionYes', phase8dFiles, { resources: wsDir }));
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error('  No workspace directory found for phase 4.8d — failing strict conversionYes gate');
        exits.push(1);
      }

      // Phase 4.8e: Open logic app subfolder, click No
      const appDir = (() => {
        const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const preferred = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest[0];
            if (preferred?.appDir && fs.existsSync(preferred.appDir)) return [preferred.appDir];
          } catch {
            /* ignore */
          }
        }
        return [];
      })();
      if (appDir.length > 0) {
        await prepareFreshSession('phase8e-only');
        exits.push(await runPhase('Phase 4.8e: conversionSubfolder', phase8eFiles, { resources: appDir }));
      } else {
        console.warn('  No app directory found for phase 4.8e — skipping');
        exits.push(0);
      }

      const finalExit = Math.max(...exits);
      console.log(
        `\n=== Conversion tests results: 4.8a=${exits[0]}, 4.8b=${exits[1]}, 4.8c=${exits[2]}, 4.8d=${exits[3]}, 4.8e=${exits[4]} → exit ${finalExit} ===`
      );
      process.exit(finalExit);
    }

    if (e2eMode === 'conversioncreateonly') {
      // Run only Phase 4.8b: Open legacy project folder (no .code-workspace),
      // click Yes, then verify one Create click starts and completes workspace creation.
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });

      const legacyDir = createLegacyProjectFixture('conversioncreateonly');

      await prepareFreshSession('phase8b-only');
      process.env.LA_E2E_LEGACY_PROJECT_DIR = legacyDir;
      const phase8bExit = await runPhase('Phase 4.8b: conversionCreate', phase8bFiles, { resources: [legacyDir] });
      process.exit(phase8bExit);
    }

    if (e2eMode === 'createonly') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      await prepareFreshSession('phase1-only');
      const phase1Exit = await runPhase('Phase 4.1: createWorkspace session', phase1Files);
      process.exit(phase1Exit);
    }

    // ----------------------------------------------------------------------
    // CI matrix shard modes — each is intended to run on a separate runner.
    // The full suite is divided into four shards so total CI wall-time drops
    // from ~30+ min on a single runner to ~12-15 min critical path.
    //
    //   - independentonly: phases that don't depend on Phase 4.1 workspaces.
    //   - createplusdesigner: Phase 4.1 → Phase 4.2 (designer lifecycle).
    //   - createplusnewtests: Phase 4.1 → Phases 4.3-4.5 (single-test phases).
    //   - createplusconversion: Phase 4.1 → Phases 4.8a/c/d/e (workspace
    //     conversion; 4.8b is in `independentonly` because it builds its own
    //     legacy fixture and does not need Phase 4.1).
    //
    // Phase 4.1 is intentionally re-run in three shards (Stage 1 of the
    // parallelization plan). Stage 2 will replace this with an artifact-shared
    // workspace setup job.
    // ----------------------------------------------------------------------

    if (e2eMode === 'independentonly') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const exits = [];

      // Phase 4.0: nonLogicAppStartup — plain folder, no Logic App context.
      writeTestSettings({ validateDependencies: false, autoStartDesignTime: false, includeRuntimeDependencyPaths: false });
      await prepareFreshSession('phase0-only');
      exits.push(await runPhase('Phase 4.0: nonLogicAppStartup', phase0Files));

      // Phase 4.8b: conversionCreate — builds its own legacy fixture, so it
      // does not need Phase 4.1's created-workspaces.json manifest.
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      const legacyDir = createLegacyProjectFixture('independentonly');
      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase8b-only');
      process.env.LA_E2E_LEGACY_PROJECT_DIR = legacyDir;
      exits.push(await runPhase('Phase 4.8b: conversionCreate', phase8bFiles, { resources: [legacyDir] }));

      const finalExit = Math.max(...exits);
      console.log(`\n=== Independent shard results: 4.0=${exits[0]}, 4.8b=${exits[1]} → exit ${finalExit} ===`);
      process.exit(finalExit);
    }

    if (e2eMode === 'createplusdesigner') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const exits = [];

      // Phase 4.1: createWorkspace — needed to produce the manifest consumed
      // by Phase 4.2 and Phase 4.7 (dataMapper.test.ts asserts the manifest
      // exists in its `before` hook).
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await prepareFreshSession('phase1-shard');
      exits.push(await runPhase('Phase 4.1: createWorkspace session', phase1Files));

      // Phase 4.2: designerActions — reuse workspaces from Phase 4.1.
      writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });
      await new Promise((r) => setTimeout(r, 5000));
      await prepareFreshSession('phase2-shard');
      const phase2Resources = getPhase2Resources();
      exits.push(await runPhase('Phase 4.2: designerActions', phase2Files, { resources: phase2Resources }));

      // Phase 4.7: demo/smoke/standalone/dataMapper. dataMapper depends on
      // Phase 4.1's manifest; the others are quick (~14s total for the three).
      // Co-locating with `designer` keeps them all on a Phase-4.1-aware runner
      // and balances shard wall-time.
      writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });
      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase7-shard');
      exits.push(await runPhase('Phase 4.7: remaining suites', phase7Files));

      const finalExit = Math.max(...exits);
      console.log(`\n=== Designer shard results: 4.1=${exits[0]}, 4.2=${exits[1]}, 4.7=${exits[2]} → exit ${finalExit} ===`);
      process.exit(finalExit);
    }

    if (e2eMode === 'createplusnewtests') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const exits = [];

      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await prepareFreshSession('phase1-shard');
      exits.push(await runPhase('Phase 4.1: createWorkspace session', phase1Files));

      writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });
      const wsResources = getPhase2Resources();

      await new Promise((r) => setTimeout(r, 5000));
      await prepareFreshSession('phase3-shard');
      exits.push(await runPhase('Phase 4.3: inlineJavascript', phase3Files, { resources: wsResources }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase4-shard');
      exits.push(await runPhase('Phase 4.4: statelessVariables', phase4Files, { resources: getStandardStatelessResources() }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase5-shard');
      exits.push(await runPhase('Phase 4.5: designerViewExtended', phase5Files, { resources: wsResources }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase6-shard');
      exits.push(await runPhase('Phase 4.6: keyboardNavigation', phase6Files, { resources: wsResources }));

      const finalExit = Math.max(...exits);
      console.log(
        `\n=== Newtests shard results: 4.1=${exits[0]}, 4.3=${exits[1]}, 4.4=${exits[2]}, 4.5=${exits[3]}, 4.6=${exits[4]} → exit ${finalExit} ===`
      );
      process.exit(finalExit);
    }

    if (e2eMode === 'createplusconversion') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      const exits = [];

      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await prepareFreshSession('phase1-shard');
      exits.push(await runPhase('Phase 4.1: createWorkspace session', phase1Files));

      const wsResources = getPhase2Resources();
      const manifestPath = path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json');
      const readManifest = () => {
        try {
          return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch {
          return null;
        }
      };
      const findPreferred = (m) =>
        m && (m.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || m.find((e) => e.appType === 'standard'));

      const wsDir = (() => {
        const preferred = findPreferred(readManifest());
        return preferred?.wsDir && fs.existsSync(preferred.wsDir) ? [preferred.wsDir] : [];
      })();
      const appDir = (() => {
        const preferred = findPreferred(readManifest());
        return preferred?.appDir && fs.existsSync(preferred.appDir) ? [preferred.appDir] : [];
      })();

      // Phase 4.8a: Open workspace dir, click No on conversion dialog
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      if (wsDir.length > 0) {
        await new Promise((r) => setTimeout(r, 3000));
        await prepareFreshSession('phase8a-shard');
        exits.push(await runPhase('Phase 4.8a: conversionNo', phase8aFiles, { resources: wsDir }));
      } else {
        console.warn('  No workspace directory found for phase 4.8a — skipping');
        exits.push(0);
      }

      // Phase 4.8c: Multiple designers + add workflow — needs full design-time
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase8c-shard');
      exits.push(await runPhase('Phase 4.8c: multipleDesigners', phase8cFiles, { resources: wsResources }));

      // Phase 4.8d: Open workspace dir, click Yes (may reload VS Code)
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      let phase8dExit = 0;
      if (wsDir.length > 0) {
        await new Promise((r) => setTimeout(r, 3000));
        await prepareFreshSession('phase8d-shard');
        phase8dExit = await runPhase('Phase 4.8d: conversionYes', phase8dFiles, { resources: wsDir });
      } else {
        console.error('  No workspace directory found for phase 4.8d — failing strict conversionYes gate');
        phase8dExit = 1;
      }

      // Phase 4.8e: Open logic app subfolder, click No
      if (appDir.length > 0) {
        await new Promise((r) => setTimeout(r, 3000));
        await prepareFreshSession('phase8e-shard');
        exits.push(await runPhase('Phase 4.8e: conversionSubfolder', phase8eFiles, { resources: appDir }));
      } else {
        console.warn('  No app directory found for phase 4.8e — skipping');
        exits.push(0);
      }

      const finalExit = Math.max(...exits, phase8dExit);
      console.log(
        `\n=== Conversion shard results: 4.1=${exits[0]}, 4.8a=${exits[1]}, 4.8c=${exits[2]}, 4.8d=${phase8dExit}, 4.8e=${exits[3]} → exit ${finalExit} ===`
      );
      process.exit(finalExit);
    }

    writeTestSettings({ validateDependencies: false, autoStartDesignTime: false, includeRuntimeDependencyPaths: false });
    await prepareFreshSession('phase0');
    const phase0Exit = await runPhase('Phase 4.0: nonLogicAppStartup', phase0Files);
    if (phase0Exit !== 0) {
      console.log(`\n⚠ Phase 4.0 exited with code ${phase0Exit} — continuing to Phase 4.1`);
    }

    writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase1');
    const phase1Exit = await runPhase('Phase 4.1: createWorkspace session', phase1Files);
    if (phase1Exit !== 0) {
      console.log(`\n⚠ Phase 4.1 exited with code ${phase1Exit} — continuing to Phase 4.2 anyway (workspaces may still have been created)`);
    }

    // Phase 4.1 performs the dependency download/validation. Later designer
    // phases use the explicit binary paths above and skip revalidation when all
    // binaries are present, avoiding CI flakes where validation overwrites func
    // without executable bits while the test is opening the designer.
    writeTestSettings({ validateDependencies: shouldValidateRuntimeDependencies(), autoStartDesignTime: true });

    console.log('\n=== Session boundary: closing createWorkspace session completely ===');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await prepareFreshSession('phase2');
    const phase2Resources = getPhase2Resources();

    const phase2Exit = await runPhase('Phase 4.2: designerActions', phase2Files, {
      resources: phase2Resources,
    });
    if (phase2Exit !== 0) {
      console.log(`\n⚠ Phase 4.2 exited with code ${phase2Exit} — continuing to Phase 4.3`);
    }

    // Phases 4.3–4.5: Each new test in its own fresh VS Code session
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase3');
    const phase3Exit = await runPhase('Phase 4.3: inlineJavascript', phase3Files, { resources: phase2Resources });
    if (phase3Exit !== 0) {
      console.log(`\n⚠ Phase 4.3 exited with code ${phase3Exit} — continuing`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase4');
    const phase4Exit = await runPhase('Phase 4.4: statelessVariables', phase4Files, { resources: getStandardStatelessResources() });
    if (phase4Exit !== 0) {
      console.log(`\n⚠ Phase 4.4 exited with code ${phase4Exit} — continuing`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase5');
    const phase5Exit = await runPhase('Phase 4.5: designerViewExtended', phase5Files, { resources: phase2Resources });
    if (phase5Exit !== 0) {
      console.log(`\n⚠ Phase 4.5 exited with code ${phase5Exit} — continuing`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase6');
    const phase6Exit = await runPhase('Phase 4.6: keyboardNavigation', phase6Files, { resources: phase2Resources });
    if (phase6Exit !== 0) {
      console.log(`\n⚠ Phase 4.6 exited with code ${phase6Exit} — continuing`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase7');
    const phase7Exit = await runPhase('Phase 4.7: remaining suites', phase7Files);

    // Phases 4.8a–4.8e: Workspace conversion tests (ADO #31054994, Steps 5-15)
    // ALL conversion tests need validateDependencies ON so the extension fully
    // activates and can detect legacy projects / show the conversion dialog.
    // Design-time is not needed (no designer opens in conversion tests).
    writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });

    // Phase 4.8a: Open workspace dir, click No on conversion dialog
    let phase8aExit = 0;
    const wsDir = (() => {
      const preferred = (() => {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json'), 'utf8'));
          return m.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || m.find((e) => e.appType === 'standard');
        } catch {
          return null;
        }
      })();
      return preferred?.wsDir && fs.existsSync(preferred.wsDir) ? [preferred.wsDir] : [];
    })();
    if (wsDir.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await prepareFreshSession('phase8a');
      phase8aExit = await runPhase('Phase 4.8a: conversionNo', phase8aFiles, { resources: wsDir });
      if (phase8aExit !== 0) console.log(`\n⚠ Phase 4.8a exited with code ${phase8aExit} — continuing`);
    }

    // Phase 4.8b: Open legacy project, create workspace dialog
    // Re-enable dependency validation — the extension needs to fully activate
    // to detect the legacy project and show the conversion dialog.
    writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
    let phase8bExit = 0;
    const legacyDir = createLegacyProjectFixture('phase8b');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase8b');
    process.env.LA_E2E_LEGACY_PROJECT_DIR = legacyDir;
    phase8bExit = await runPhase('Phase 4.8b: conversionCreate', phase8bFiles, { resources: [legacyDir] });
    if (phase8bExit !== 0) console.log(`\n⚠ Phase 4.8b exited with code ${phase8bExit} — continuing`);

    // Phase 4.8c: Multiple designers + add workflow
    // Re-enable full design-time — this test needs the designer to open.
    writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase8c');
    const phase8cExit = await runPhase('Phase 4.8c: multipleDesigners', phase8cFiles, { resources: phase2Resources });
    if (phase8cExit !== 0) console.log(`\n⚠ Phase 4.8c exited with code ${phase8cExit} — continuing`);

    // Phase 4.8d: Open workspace dir, click Yes (may reload VS Code)
    // Restore conversion settings — design-time not needed, but validation must stay ON.
    writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
    let phase8dExit = 0;
    if (wsDir.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await prepareFreshSession('phase8d');
      phase8dExit = await runPhase('Phase 4.8d: conversionYes', phase8dFiles, { resources: wsDir });
      if (phase8dExit !== 0) console.log(`\n⚠ Phase 4.8d exited with code ${phase8dExit} — continuing`);
    } else {
      console.error('  No workspace directory found for phase 4.8d — failing strict conversionYes gate');
      phase8dExit = 1;
    }

    // Phase 4.8e: Open logic app subfolder, click No
    let phase8eExit = 0;
    const appDir = (() => {
      const preferred = (() => {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(require('os').tmpdir(), 'la-e2e-test', 'created-workspaces.json'), 'utf8'));
          return m.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || m.find((e) => e.appType === 'standard');
        } catch {
          return null;
        }
      })();
      return preferred?.appDir && fs.existsSync(preferred.appDir) ? [preferred.appDir] : [];
    })();
    if (appDir.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await prepareFreshSession('phase8e');
      phase8eExit = await runPhase('Phase 4.8e: conversionSubfolder', phase8eFiles, { resources: appDir });
      if (phase8eExit !== 0) console.log(`\n⚠ Phase 4.8e exited with code ${phase8eExit} — continuing`);
    }

    // Phase 4.10: D-001-compliant codeful debug F5 task pattern regression guard.
    // Phase A creates real codeful workspaces through the Create Workspace webview.
    // Phase B reopens each generated .code-workspace in a fresh VS Code session
    // with the task-recorder extension installed and asserts F5 task events.
    let phase10Exit = 0;
    try {
      phase10Exit = await runCodefulDebugPhases('phase10');
      if (phase10Exit !== 0) console.log(`\n⚠ Phase 4.10 exited with code ${phase10Exit} — continuing`);
    } catch (err) {
      phase10Exit = 1;
      console.log(`\n⚠ Phase 4.10 setup error: ${err.message || err} — continuing`);
    }

    // Exit with worst exit code from all phases.
    const finalExit = Math.max(
      phase0Exit,
      phase1Exit,
      phase2Exit,
      phase3Exit,
      phase4Exit,
      phase5Exit,
      phase7Exit,
      phase8aExit,
      phase8bExit,
      phase8cExit,
      phase8dExit,
      phase8eExit,
      phase10Exit
    );
    console.log(
      `\n=== Final results: 4.0=${phase0Exit}, 4.1=${phase1Exit}, 4.2=${phase2Exit}, 4.3=${phase3Exit}, 4.4=${phase4Exit}, 4.5=${phase5Exit}, 4.7=${phase7Exit}, 4.8a=${phase8aExit}, 4.8b=${phase8bExit}, 4.8c=${phase8cExit}, 4.8d=${phase8dExit}, 4.8e=${phase8eExit}, 4.10=${phase10Exit} → exit ${finalExit} ===`
    );
    process.exit(finalExit);
  } catch (err) {
    console.error(`\n✗ ExTester error: ${err.message || err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in E2E launcher:', err);
  process.exit(1);
});

// CI trigger nudge
