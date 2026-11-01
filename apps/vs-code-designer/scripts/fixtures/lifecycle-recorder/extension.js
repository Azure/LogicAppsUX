/* global exports, require, process */
const vscode = require('vscode');
const { installLifecycleObserver } = require('../../vscode-lifecycle-observer');
let observer;
exports.activate = async (context) => {
  observer = await installLifecycleObserver(vscode, process.env, context);
  return { shutdown: exports.deactivate, receipt: observer?.receipt };
};
exports.deactivate = async () => {
  try {
    await observer?.shutdown();
  } finally {
    observer?.dispose();
  }
};
