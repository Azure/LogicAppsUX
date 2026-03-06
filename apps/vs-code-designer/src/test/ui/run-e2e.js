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

  // Read extension metadata from dist/package.json
  const pkgJson = JSON.parse(fs.readFileSync(path.join(distDir, 'package.json'), 'utf8'));
  const extDeps = pkgJson.extensionDependencies || [];
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
  if (extDeps.length > 0) {
    console.log(`\n=== Step 2: Install ${extDeps.length} extension dependencies ===`);

    const depsToInstall = [];
    for (const dep of extDeps) {
      const depLower = dep.toLowerCase();
      const alreadyInstalled =
        fs.existsSync(extDir) &&
        fs.readdirSync(extDir).some((entry) => {
          if (entry === 'extensions.json' || entry === '.obsolete') return false;
          return entry.toLowerCase().startsWith(depLower + '-') || entry.toLowerCase() === depLower;
        });

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
          const depLower = dep.toLowerCase();
          const onDisk =
            fs.existsSync(extDir) &&
            fs.readdirSync(extDir).some((entry) => {
              if (entry === 'extensions.json' || entry === '.obsolete') return false;
              return entry.toLowerCase().startsWith(depLower + '-') || entry.toLowerCase() === depLower;
            });
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
  const depsRoot = path.join(os.homedir(), '.azurelogicapps', 'dependencies');
  const funcBinary = path.join(depsRoot, 'FuncCoreTools', 'func');
  const dotnetBinary = path.join(depsRoot, 'DotNetSDK', 'dotnet');
  const nodeBinary = path.join(depsRoot, 'NodeJs', 'node');

  // Create a VS Code settings file. Called before each phase group so we can
  // enable dependency validation for Phase 4.1 (first run) and disable it
  // for all subsequent phases (saves 30-60s per session startup).
  const settingsFile = path.join(projectDir, 'out', 'test', 'vscode-settings.json');
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });

  const writeTestSettings = ({ validateDependencies = false, autoStartDesignTime = true } = {}) => {
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
      // Point to auto-downloaded runtime binaries so the extension can start
      // the design-time API process (func host start) without relying on PATH.
      'azureLogicAppsStandard.autoRuntimeDependenciesPath': depsRoot,
      // Dependency validation: Phase 4.1 needs this ON (first run downloads/validates
      // binaries). All subsequent phases set it OFF since paths are already resolved.
      'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': validateDependencies,
      'azureLogicAppsStandard.funcCoreToolsBinaryPath': funcBinary,
      'azureLogicAppsStandard.dotnetBinaryPath': dotnetBinary,
      'azureLogicAppsStandard.nodeJsBinaryPath': nodeBinary,
      // Design-time auto-start: ON for tests that need the runtime (designer, run),
      // OFF for tests that only check UI/conversion to save startup time.
      'azureLogicAppsStandard.autoStartDesignTime': autoStartDesignTime,
      // Suppress the "Start design time?" prompt dialog on project load.
      'azureLogicAppsStandard.showStartDesignTimeMessage': false,
      // Suppress "wants to sign in" auth dialog — uses silent auth that
      // returns undefined instead of prompting when no cached token exists.
      'azureLogicAppsStandard.silentAuth': true,
    };
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    console.log(`  Settings: validateDependencies=${validateDependencies}, autoStartDesignTime=${autoStartDesignTime}`);
  };

  // Write initial settings — keep dependency validation ON for all phases.
  // It adds ~30-60s per session but prevents the Azure connector wizard
  // from blocking designer operations (the validation flow handles the
  // timing so the wizard completes before the user opens the designer).
  writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
  console.log(`  Created test settings file: ${settingsFile}`);
  console.log(`  funcCoreToolsBinaryPath: ${funcBinary}`);
  console.log(`  autoRuntimeDependenciesPath: ${depsRoot}`);

  const outTestDir = path.resolve(projectDir, 'out', 'test');
  const testFile = (name) => path.join(outTestDir, name).replace(/\\/g, '/');

  const phase1Files = [testFile('basic.test.js'), testFile('commands.test.js'), testFile('createWorkspace.test.js')];

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

  const e2eMode = (process.env.E2E_MODE || 'full').toLowerCase();
  console.log(`\nE2E mode: ${e2eMode}`);

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
      } else {
        // Windows: use PowerShell
        execSync(
          'powershell -NoProfile -Command "Get-Process -Name Code -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*test-resources*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"',
          { stdio: 'ignore', timeout: 10000 }
        );
      }
      console.log(`  [${label}] ✓ Killed lingering VS Code/chromedriver processes`);
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
    const phaseTester = new ExTester(undefined, undefined, extDir);
    const code = await phaseTester.runTests(files, phaseRunOptions);
    console.log(`  ${phaseName} exit code: ${code}`);
    return code;
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

    if (e2eMode === 'designeronly') {
      // Ensure VS Code and ChromeDriver are downloaded
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      // Keep dependency validation on to ensure extension activates properly
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });

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
      // Keep dependency validation on to ensure extension activates properly
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: true });
      const wsResources = getPhase2Resources();
      const exits = [];

      await prepareFreshSession('phase3-only');
      exits.push(await runPhase('Phase 4.3: inlineJavascript', phase3Files, { resources: wsResources }));

      await new Promise((r) => setTimeout(r, 3000));
      await prepareFreshSession('phase4-only');
      exits.push(await runPhase('Phase 4.4: statelessVariables', phase4Files, { resources: wsResources }));

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
      const legacyDir = path.join(require('os').tmpdir(), 'la-e2e-test', 'legacy-project');
      // Create the legacy project for this test
      const legacyWfDir = path.join(legacyDir, 'testworkflow');
      if (!fs.existsSync(legacyWfDir)) {
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
      }
      // Phase 4.8b: Enable dependency validation so extension fully activates
      // and shows the conversion dialog for legacy projects.
      writeTestSettings({ validateDependencies: true, autoStartDesignTime: false });
      await prepareFreshSession('phase8b-only');
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
        exits.push(0);
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

    if (e2eMode === 'createonly') {
      await extest.downloadCode(VSCODE_VERSION);
      await extest.downloadChromeDriver(VSCODE_VERSION);
      await prepareFreshSession('phase1-only');
      const phase1Exit = await runPhase('Phase 4.1: createWorkspace session', phase1Files);
      process.exit(phase1Exit);
    }

    await prepareFreshSession('phase1');
    const phase1Exit = await runPhase('Phase 4.1: createWorkspace session', phase1Files);
    if (phase1Exit !== 0) {
      console.log(`\n⚠ Phase 4.1 exited with code ${phase1Exit} — continuing to Phase 4.2 anyway (workspaces may still have been created)`);
    }

    // After Phase 4.1, keep dependency validation ON but the conversion phases
    // don't need design-time. That change happens before phase 4.8.

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

    // Phases 4.3–4.6: Each new test in its own fresh VS Code session
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase3');
    const phase3Exit = await runPhase('Phase 4.3: inlineJavascript', phase3Files, { resources: phase2Resources });
    if (phase3Exit !== 0) {
      console.log(`\n⚠ Phase 4.3 exited with code ${phase3Exit} — continuing`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase4');
    const phase4Exit = await runPhase('Phase 4.4: statelessVariables', phase4Files, { resources: phase2Resources });
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
    const legacyDir = path.join(require('os').tmpdir(), 'la-e2e-test', 'legacy-project');
    const legacyWfDir = path.join(legacyDir, 'testworkflow');
    if (!fs.existsSync(legacyWfDir)) {
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
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase8b');
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

    // Exit with worst exit code from all phases
    const finalExit = Math.max(
      phase1Exit,
      phase2Exit,
      phase3Exit,
      phase4Exit,
      phase5Exit,
      phase6Exit,
      phase7Exit,
      phase8aExit,
      phase8bExit,
      phase8cExit,
      phase8dExit,
      phase8eExit
    );
    console.log(
      `\n=== Final results: 4.1=${phase1Exit}, 4.2=${phase2Exit}, 4.3=${phase3Exit}, 4.4=${phase4Exit}, 4.5=${phase5Exit}, 4.6=${phase6Exit}, 4.7=${phase7Exit}, 4.8a=${phase8aExit}, 4.8b=${phase8bExit}, 4.8c=${phase8cExit}, 4.8d=${phase8dExit}, 4.8e=${phase8eExit} → exit ${finalExit} ===`
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
