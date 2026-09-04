#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const portalReactRelativePath = path.join('src', 'Extension', 'Client', 'React');
const manifestNames = ['package.json', 'package-lock.json'];

export function parseArguments(args, environment = process.env) {
  const options = {
    dryRun: false,
    portalRoot: environment.LOGIC_APPS_PORTAL_ROOT,
    serve: true,
  };

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--no-serve') {
      options.serve = false;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--portal-root') {
      options.portalRoot = args[++index];
    } else if (argument.startsWith('--portal-root=')) {
      options.portalRoot = argument.slice('--portal-root='.length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.help && !options.portalRoot) {
    throw new Error('Provide --portal-root <path> or set LOGIC_APPS_PORTAL_ROOT.');
  }

  return options;
}

export function resolvePortalReactDirectory(portalRoot, currentDirectory = process.cwd()) {
  const resolvedRoot = path.resolve(currentDirectory, portalRoot);
  const candidates = [resolvedRoot, path.join(resolvedRoot, portalReactRelativePath)];

  for (const candidate of candidates) {
    const manifestPath = path.join(candidate, 'package.json');
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    const manifest = readJson(manifestPath);
    if (manifest.scripts?.['build-hybrid:dev'] && manifest.scripts?.serve) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find the Portal React project under ${resolvedRoot}. ` +
      `Pass either the Portal worktree root or its ${portalReactRelativePath} directory.`
  );
}

export function discoverPortalPackages(logicAppsUxRoot, portalReactDirectory) {
  const portalManifest = readJson(path.join(portalReactDirectory, 'package.json'));
  const portalDependencies = {
    ...portalManifest.dependencies,
    ...portalManifest.devDependencies,
    ...portalManifest.optionalDependencies,
  };
  const workspacePackages = readWorkspacePackages(logicAppsUxRoot);
  const selectedNames = Object.keys(portalDependencies).filter((name) => workspacePackages.has(name));

  if (selectedNames.length === 0) {
    throw new Error('The Portal project does not depend on any publishable LogicAppsUX library packages.');
  }

  const packageNames = new Set(selectedNames);
  const addWorkspaceDependencies = (packageName) => {
    const packageInfo = workspacePackages.get(packageName);
    const dependencies = {
      ...packageInfo.manifest.dependencies,
      ...packageInfo.manifest.optionalDependencies,
    };

    for (const [dependencyName, version] of Object.entries(dependencies)) {
      if (typeof version === 'string' && version.startsWith('workspace:') && workspacePackages.has(dependencyName)) {
        if (!packageNames.has(dependencyName)) {
          packageNames.add(dependencyName);
          addWorkspaceDependencies(dependencyName);
        }
      }
    }
  };

  for (const packageName of selectedNames) {
    addWorkspaceDependencies(packageName);
  }

  return topologicalSort(
    [...packageNames].map((name) => workspacePackages.get(name)),
    packageNames
  );
}

export function snapshotManifests(portalReactDirectory) {
  return new Map(
    manifestNames
      .map((name) => path.join(portalReactDirectory, name))
      .filter((manifestPath) => fs.existsSync(manifestPath))
      .map((manifestPath) => [manifestPath, hashFile(manifestPath)])
  );
}

export function assertManifestsUnchanged(snapshot) {
  for (const [manifestPath, expectedHash] of snapshot) {
    if (!fs.existsSync(manifestPath) || hashFile(manifestPath) !== expectedHash) {
      throw new Error(`${manifestPath} changed during local package installation.`);
    }
  }
}

export function acquirePortalLock(portalReactDirectory) {
  const lockPath = path.join(portalReactDirectory, 'node_modules', '.logicappsux-portal-local.lock');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  try {
    const descriptor = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify({ logicAppsUxRoot: repositoryRoot, pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`
    );
    return { descriptor, path: lockPath };
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }

    let owner = 'another helper process';
    try {
      const lock = readJson(lockPath);
      owner = `process ${lock.pid} using ${lock.logicAppsUxRoot}`;
    } catch {
      // The owning process may still be writing the newly created lock.
    }
    throw new Error(`Portal local setup is already running for this worktree (${owner}). Lock: ${lockPath}`);
  }
}

export function releasePortalLock(lock) {
  if (!lock) {
    return;
  }
  fs.closeSync(lock.descriptor);
  fs.rmSync(lock.path, { force: true });
}

function readWorkspacePackages(logicAppsUxRoot) {
  const librariesDirectory = path.join(logicAppsUxRoot, 'libs');
  const packages = new Map();

  for (const entry of fs.readdirSync(librariesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(librariesDirectory, entry.name);
    const manifestPath = path.join(directory, 'package.json');
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    const manifest = readJson(manifestPath);
    if (manifest.private || !manifest.name || !manifest.version || !manifest.scripts?.['build:lib']) {
      continue;
    }

    packages.set(manifest.name, { directory, manifest, name: manifest.name, version: manifest.version });
  }

  return packages;
}

function topologicalSort(packages, selectedNames) {
  const packageMap = new Map(packages.map((packageInfo) => [packageInfo.name, packageInfo]));
  const visiting = new Set();
  const visited = new Set();
  const sorted = [];

  const visit = (packageInfo) => {
    if (visited.has(packageInfo.name)) {
      return;
    }
    if (visiting.has(packageInfo.name)) {
      throw new Error(`Circular workspace dependency involving ${packageInfo.name}.`);
    }

    visiting.add(packageInfo.name);
    const dependencies = {
      ...packageInfo.manifest.dependencies,
      ...packageInfo.manifest.optionalDependencies,
    };

    for (const dependencyName of Object.keys(dependencies).sort()) {
      if (selectedNames.has(dependencyName) && packageMap.has(dependencyName)) {
        visit(packageMap.get(dependencyName));
      }
    }

    visiting.delete(packageInfo.name);
    visited.add(packageInfo.name);
    sorted.push(packageInfo);
  };

  for (const packageInfo of [...packages].sort((left, right) => left.name.localeCompare(right.name))) {
    visit(packageInfo);
  }

  return sorted;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hashFile(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function snapshotDirectory(directory) {
  const snapshot = new Map();

  const visit = (currentDirectory) => {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile()) {
        snapshot.set(path.relative(directory, entryPath), hashFile(entryPath));
      }
    }
  };

  visit(directory);
  return snapshot;
}

function formatCommand(command, args) {
  return [command, ...args].map((argument) => (/[\s"&|<>^()]/.test(argument) ? JSON.stringify(argument) : argument)).join(' ');
}

function runCommand(command, args, options = {}) {
  const commandText = formatCommand(command, args);
  console.log(`\n> ${commandText}`);
  console.log(`  cwd: ${options.cwd}`);

  if (options.dryRun) {
    return;
  }

  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandText], {
          cwd: options.cwd,
          env: process.env,
          stdio: 'inherit',
        })
      : spawnSync(command, args, {
          cwd: options.cwd,
          env: process.env,
          stdio: 'inherit',
        });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? 'unknown'}.`);
  }
}

function packPackages(packages, temporaryDirectory, dryRun) {
  const tarballs = [];

  for (const packageInfo of packages) {
    runCommand('pnpm', ['--filter', packageInfo.name, 'build:lib'], {
      cwd: repositoryRoot,
      dryRun,
    });

    if (dryRun) {
      const tarballName = `${packageInfo.name.replace(/^@/, '').replace('/', '-')}-${packageInfo.version}.tgz`;
      tarballs.push(path.join('<temporary-directory>', tarballName));
      runCommand('pnpm', ['pack', '--pack-destination', '<temporary-directory>'], {
        cwd: packageInfo.directory,
        dryRun: true,
      });
      continue;
    }

    const existingTarballs = new Set(fs.readdirSync(temporaryDirectory));
    runCommand('pnpm', ['pack', '--pack-destination', temporaryDirectory], {
      cwd: packageInfo.directory,
    });
    const newTarballs = fs
      .readdirSync(temporaryDirectory)
      .filter((fileName) => fileName.endsWith('.tgz') && !existingTarballs.has(fileName));

    if (newTarballs.length !== 1) {
      throw new Error(`Expected one tarball after packing ${packageInfo.name}, found ${newTarballs.length}.`);
    }
    tarballs.push(path.join(temporaryDirectory, newTarballs[0]));
  }

  return tarballs;
}

function stageInstalledPackages(portalReactDirectory, packages, backupDirectory, stagedPackages, dryRun) {
  for (const packageInfo of packages) {
    const installedDirectory = path.join(portalReactDirectory, 'node_modules', ...packageInfo.name.split('/'));
    const backupPackageDirectory = path.join(backupDirectory ?? '<backup-directory>', ...packageInfo.name.split('/'));
    console.log(`\n> Move ${installedDirectory} to ${backupPackageDirectory}`);
    if (!dryRun) {
      const hadOriginalPackage = fs.existsSync(installedDirectory);
      if (hadOriginalPackage) {
        fs.mkdirSync(path.dirname(backupPackageDirectory), { recursive: true });
        fs.renameSync(installedDirectory, backupPackageDirectory);
      }
      stagedPackages.set(packageInfo.name, hadOriginalPackage);
    }
  }
}

function installPackedPackages(portalReactDirectory, packages, tarballs, temporaryDirectory, dryRun) {
  for (const [index, packageInfo] of packages.entries()) {
    const extractionDirectory = dryRun
      ? path.join('<temporary-directory>', `extract-${index}`)
      : path.join(temporaryDirectory, `extract-${index}`);
    const installedDirectory = path.join(portalReactDirectory, 'node_modules', ...packageInfo.name.split('/'));

    if (!dryRun) {
      fs.mkdirSync(extractionDirectory, { recursive: true });
    }
    runCommand('tar', ['-xzf', tarballs[index], '-C', extractionDirectory], {
      cwd: repositoryRoot,
      dryRun,
    });

    const extractedPackageDirectory = path.join(extractionDirectory, 'package');
    console.log(`\n> Copy ${extractedPackageDirectory} to ${installedDirectory}`);
    if (!dryRun) {
      if (!fs.existsSync(extractedPackageDirectory)) {
        throw new Error(`Packed archive for ${packageInfo.name} does not contain a package directory.`);
      }
      fs.mkdirSync(path.dirname(installedDirectory), { recursive: true });
      fs.cpSync(extractedPackageDirectory, installedDirectory, { errorOnExist: true, recursive: true });
    }
  }
}

function restoreInstalledPackages(portalReactDirectory, stagedPackages, backupDirectory) {
  for (const [packageName, hadOriginalPackage] of stagedPackages) {
    const installedDirectory = path.join(portalReactDirectory, 'node_modules', ...packageName.split('/'));
    const backupPackageDirectory = path.join(backupDirectory, ...packageName.split('/'));
    fs.rmSync(installedDirectory, { force: true, recursive: true });
    if (hadOriginalPackage && fs.existsSync(backupPackageDirectory)) {
      fs.mkdirSync(path.dirname(installedDirectory), { recursive: true });
      fs.renameSync(backupPackageDirectory, installedDirectory);
    }
  }
}

function verifyInstalledPackages(portalReactDirectory, packages) {
  for (const packageInfo of packages) {
    const installedDirectory = path.join(portalReactDirectory, 'node_modules', ...packageInfo.name.split('/'));
    const installedManifest = readJson(path.join(installedDirectory, 'package.json'));
    if (installedManifest.version !== packageInfo.version) {
      throw new Error(
        `${packageInfo.name} installed version ${installedManifest.version} instead of local version ${packageInfo.version}.`
      );
    }

    const localBuildDirectory = path.join(packageInfo.directory, 'build', 'lib');
    const installedBuildDirectory = path.join(installedDirectory, 'build', 'lib');
    if (!fs.existsSync(localBuildDirectory) || !fs.existsSync(installedBuildDirectory)) {
      throw new Error(`Cannot verify the build output for ${packageInfo.name}.`);
    }

    const localBuild = snapshotDirectory(localBuildDirectory);
    const installedBuild = snapshotDirectory(installedBuildDirectory);
    if (localBuild.size !== installedBuild.size || [...localBuild].some(([fileName, hash]) => installedBuild.get(fileName) !== hash)) {
      throw new Error(`${packageInfo.name} does not match the package built from this LogicAppsUX worktree.`);
    }
  }
}

function printHelp() {
  console.log(`Usage:
  pnpm portal:local --portal-root <path> [--no-serve] [--dry-run]

Options:
  --portal-root <path>  Portal repository/worktree root or its React directory.
  --no-serve            Build Portal without starting its local server.
  --dry-run             Validate paths and print commands without changing files.
  --help, -h            Show this help.

Environment:
  LOGIC_APPS_PORTAL_ROOT  Default value for --portal-root.`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const portalReactDirectory = resolvePortalReactDirectory(options.portalRoot);
  const packages = discoverPortalPackages(repositoryRoot, portalReactDirectory);
  const snapshot = snapshotManifests(portalReactDirectory);
  const temporaryDirectory = options.dryRun ? undefined : fs.mkdtempSync(path.join(os.tmpdir(), 'logicappsux-portal-local-'));
  const backupDirectory = options.dryRun
    ? undefined
    : path.join(portalReactDirectory, 'node_modules', `.logicappsux-local-backup-${process.pid}-${Date.now()}`);
  const stagedPackages = new Map();
  let packagesInstalled = false;
  let portalLock;
  let preserveBackup = false;

  console.log(`LogicAppsUX worktree: ${repositoryRoot}`);
  console.log(`Portal React project: ${portalReactDirectory}`);
  console.log('Local packages:');
  for (const packageInfo of packages) {
    console.log(`  ${packageInfo.name}@${packageInfo.version}`);
  }

  try {
    const tarballs = packPackages(packages, temporaryDirectory, options.dryRun);
    if (!options.dryRun) {
      portalLock = acquirePortalLock(portalReactDirectory);
    }
    stageInstalledPackages(portalReactDirectory, packages, backupDirectory, stagedPackages, options.dryRun);
    installPackedPackages(portalReactDirectory, packages, tarballs, temporaryDirectory, options.dryRun);

    if (!options.dryRun) {
      assertManifestsUnchanged(snapshot);
      verifyInstalledPackages(portalReactDirectory, packages);
      packagesInstalled = true;
      fs.rmSync(backupDirectory, { force: true, recursive: true });
      fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    }

    runCommand('npm', ['run', 'build-hybrid:dev'], {
      cwd: portalReactDirectory,
      dryRun: options.dryRun,
    });

    if (!options.dryRun) {
      assertManifestsUnchanged(snapshot);
    }

    releasePortalLock(portalLock);
    portalLock = undefined;

    if (options.serve) {
      runCommand('npm', ['run', 'serve'], {
        cwd: portalReactDirectory,
        dryRun: options.dryRun,
      });
    }
  } catch (error) {
    if (!options.dryRun && !packagesInstalled) {
      try {
        restoreInstalledPackages(portalReactDirectory, stagedPackages, backupDirectory);
      } catch (restoreError) {
        preserveBackup = true;
        throw new AggregateError(
          [error, restoreError],
          `Local package installation and rollback failed. Original packages remain under ${backupDirectory}.`
        );
      }
    }
    throw error;
  } finally {
    releasePortalLock(portalLock);
    if (temporaryDirectory && fs.existsSync(temporaryDirectory)) {
      fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    }
    if (!preserveBackup && backupDirectory && fs.existsSync(backupDirectory)) {
      fs.rmSync(backupDirectory, { force: true, recursive: true });
    }
  }
}

const invokedScript = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedScript === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`\nPortal local setup failed: ${error.message}`);
    process.exitCode = 1;
  });
}
