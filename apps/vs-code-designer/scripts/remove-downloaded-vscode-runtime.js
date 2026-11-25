/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { removePathWithRetry } = require('./e2e-cli-path-cleanup');

const WINDOWS_RUNTIME_DIRECTORY = /^vscode-win32-(?:x64|arm64)-archive-\d+(?:\.\d+)+$/;

async function removeDownloadedVSCodeRuntime(runtimeRoot) {
  if (!fs.existsSync(runtimeRoot)) {
    return [];
  }

  const resolvedRoot = fs.realpathSync(runtimeRoot);
  const removedDirectories = [];
  for (const entry of fs.readdirSync(resolvedRoot, { withFileTypes: true })) {
    if (!WINDOWS_RUNTIME_DIRECTORY.test(entry.name)) {
      continue;
    }

    const runtimeDirectory = path.join(resolvedRoot, entry.name);
    if (path.dirname(runtimeDirectory) !== resolvedRoot) {
      throw new Error(`Refusing to remove downloaded VS Code runtime outside '${resolvedRoot}': '${runtimeDirectory}'`);
    }
    const stat = fs.lstatSync(runtimeDirectory);
    if (!entry.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`Refusing to remove unexpected downloaded VS Code runtime entry: '${runtimeDirectory}'`);
    }
    await removePathWithRetry(runtimeDirectory, {
      onRetry: ({ attempts, code, elapsedMs }) =>
        console.warn(
          `Retrying downloaded VS Code runtime cleanup attempt=${attempts} code=${code} elapsedMs=${elapsedMs}: ${runtimeDirectory}`
        ),
    });
    removedDirectories.push(runtimeDirectory);
  }
  const remaining = fs.readdirSync(resolvedRoot).filter((name) => WINDOWS_RUNTIME_DIRECTORY.test(name));
  if (remaining.length > 0) {
    throw new Error(`Downloaded VS Code runtime cleanup left matching entries: ${remaining.join(', ')}`);
  }
  return removedDirectories;
}

if (require.main === module) {
  const runtimeRoot = process.argv[2];
  if (!runtimeRoot) {
    throw new Error('The vscode-test runtime root is required.');
  }

  removeDownloadedVSCodeRuntime(runtimeRoot)
    .then((removedDirectories) => {
      for (const removedDirectory of removedDirectories) {
        console.log(`Removed downloaded VS Code runtime: ${removedDirectory}`);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { removeDownloadedVSCodeRuntime };
