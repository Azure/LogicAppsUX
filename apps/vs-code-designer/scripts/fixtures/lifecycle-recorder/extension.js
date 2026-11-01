/* global exports, require, process, console */
const vscode = require('vscode');
const { installLifecycleObserver } = require('../../vscode-lifecycle-observer');
let installation;
let finishing;
exports.activate = (context) => {
  // Complete recorder activation synchronously so VS Code registers our real
  // deactivate hook even when Open Folder reloads during product activation.
  // Keep the original host's context/profile and installation promise; teardown
  // must await it, not silently skip an observer that is still being installed.
  installation = installLifecycleObserver(vscode, process.env, context);
  installation.catch((error) => console.error('[lifecycle-recorder] observer installation failed', error));
  return { shutdown: exports.deactivate };
};
exports.deactivate = () => {
  if (!finishing) {
    finishing = (async () => {
      const observer = await installation;
      try {
        await observer?.shutdown();
      } finally {
        observer?.dispose();
      }
    })();
  }
  return finishing;
};
