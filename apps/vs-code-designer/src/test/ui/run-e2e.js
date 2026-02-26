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
const { exec } = require('child_process');

const projectDir = path.resolve(__dirname, '..', '..', '..');
const distDir = path.join(projectDir, 'dist');
// Store test-extensions in test-resources/ (alongside VS Code download) rather
// than dist/ — tsup's `clean: true` wipes dist/ on every build:extension, which
// would destroy cached marketplace extension installs.
const extDir = path.join(require('os').tmpdir(), 'test-resources', 'test-extensions');
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
  await extest.downloadCode('max');
  await extest.downloadChromeDriver('max');

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

  // Create a VS Code settings file that disables extension auto-update.
  // Without this, VS Code downloads a newer version from the marketplace,
  // creating duplicate commands and opening the wrong webview.
  const settingsFile = path.join(projectDir, 'out', 'test', 'vscode-settings.json');
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
  fs.writeFileSync(
    settingsFile,
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );
  console.log(`  Created test settings file: ${settingsFile}`);

  const outTestDir = path.resolve(projectDir, 'out', 'test');
  const testFile = (name) => path.join(outTestDir, name).replace(/\\/g, '/');

  const phase1Files = [testFile('basic.test.js'), testFile('commands.test.js'), testFile('createWorkspace.test.js')];

  const phase2Files = [testFile('designerOpen.test.js'), testFile('designerActions.test.js')];

  const phase3Files = [testFile('demo.test.js'), testFile('smoke.test.js'), testFile('standalone.test.js')];

  const e2eMode = (process.env.E2E_MODE || 'full').toLowerCase();
  console.log(`\nE2E mode: ${e2eMode}`);

  const runOptions = {
    vscodeVersion: 'max',
    settings: settingsFile,
    cleanup: false,
    offline: false,
    resources: [],
  };

  const prepareFreshSession = async (label) => {
    const settingsDir = path.join(require('os').tmpdir(), 'test-resources', 'settings');
    const userDir = path.join(settingsDir, 'User');

    // Kill any lingering test VS Code processes that lock the settings dir
    try {
      const { execSync } = require('child_process');
      execSync(
        `powershell -NoProfile -Command "Get-Process -Name Code -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*test-resources*' } | Stop-Process -Force -ErrorAction SilentlyContinue"`,
        { stdio: 'ignore', timeout: 10000 }
      );
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      /* ignore */
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
          const preferred = manifest.find((e) => e.appType === 'standard' && e.wfType === 'Stateful') || manifest[0];
          if (preferred?.wsFilePath && fs.existsSync(preferred.wsFilePath)) {
            phase2Resources = [preferred.wsFilePath];
            console.log(`  Using startup workspace for designerOpen: ${preferred.wsFilePath}`);
          } else {
            console.warn('  Could not find a valid wsFilePath in manifest for phase 2 startup resource');
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
      await extest.downloadCode('max');
      await extest.downloadChromeDriver('max');

      // Steps 2-3 are handled by the main() setup above (extension deps
      // install + copy our extension). Since test-extensions lives in
      // test-resources/ now and persists across builds, deps should already
      // be cached. Just ensure our extension copy is up-to-date.
      // The mtime-based check in Step 3 handles this automatically.

      await prepareFreshSession('phase2-only');
      const phase2Resources = getPhase2Resources();
      const phase2Exit = await runPhase('Phase 4.2: designerOpen fresh session', phase2Files, {
        resources: phase2Resources,
      });
      process.exit(phase2Exit);
    }

    await prepareFreshSession('phase1');
    const phase1Exit = await runPhase('Phase 4.1: createWorkspace session', phase1Files);
    if (phase1Exit !== 0) {
      console.log(`\n⚠ Phase 4.1 exited with code ${phase1Exit} — continuing to Phase 4.2 anyway (workspaces may still have been created)`);
    }

    console.log('\n=== Session boundary: closing createWorkspace session completely ===');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await prepareFreshSession('phase2');
    const phase2Resources = getPhase2Resources();

    const phase2Exit = await runPhase('Phase 4.2: designerOpen fresh session', phase2Files, {
      resources: phase2Resources,
    });
    if (phase2Exit !== 0) {
      console.log(`\n⚠ Phase 4.2 exited with code ${phase2Exit} — continuing to Phase 4.3`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await prepareFreshSession('phase3');
    const phase3Exit = await runPhase('Phase 4.3: remaining suites', phase3Files);

    // Exit with worst exit code from all phases
    const finalExit = Math.max(phase1Exit, phase2Exit, phase3Exit);
    console.log(`\n=== Final results: Phase 4.1=${phase1Exit}, Phase 4.2=${phase2Exit}, Phase 4.3=${phase3Exit} → exit ${finalExit} ===`);
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
