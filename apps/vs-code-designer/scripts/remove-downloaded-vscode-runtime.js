/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');

const WINDOWS_RUNTIME_DIRECTORY = /^vscode-win32-(?:x64|arm64)-archive-\d+(?:\.\d+)+$/;

function removeDownloadedVSCodeRuntime(runtimeRoot) {
  if (!fs.existsSync(runtimeRoot)) {
    return [];
  }

  const resolvedRoot = fs.realpathSync(runtimeRoot);
  const removedDirectories = [];
  for (const entry of fs.readdirSync(resolvedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !WINDOWS_RUNTIME_DIRECTORY.test(entry.name)) {
      continue;
    }

    const runtimeDirectory = path.join(resolvedRoot, entry.name);
    if (path.dirname(runtimeDirectory) !== resolvedRoot) {
      throw new Error(`Refusing to remove downloaded VS Code runtime outside '${resolvedRoot}': '${runtimeDirectory}'`);
    }
    fs.rmSync(runtimeDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    removedDirectories.push(runtimeDirectory);
  }
  return removedDirectories;
}

if (require.main === module) {
  const runtimeRoot = process.argv[2];
  if (!runtimeRoot) {
    throw new Error('The vscode-test runtime root is required.');
  }

  for (const removedDirectory of removeDownloadedVSCodeRuntime(runtimeRoot)) {
    console.log(`Removed downloaded VS Code runtime: ${removedDirectory}`);
  }
}

module.exports = { removeDownloadedVSCodeRuntime };
