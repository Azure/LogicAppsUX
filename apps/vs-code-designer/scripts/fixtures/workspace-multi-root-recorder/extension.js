/* global process, exports, require */
const vscode = require('vscode');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { observeFuncRuntime } = require('../../../out/test/e2e/workspaceMultiRootLaunch');

exports.activate = (context) => {
  const file = process.env.LA_E2E_CLI_MULTI_ROOT_EVENTS;
  if (!file) {
    throw new Error('Current multi-root invocation event path is required');
  }
  const boot = randomUUID();
  const append = (event) => fs.appendFileSync(file, `${JSON.stringify({ ...event, boot })}\n`);
  append({ kind: 'activation', roots: (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri.fsPath) });
  // Read actual global settings after the product has executed ensureBinaries.
  // This is observation only: no settings rewrite, version probe or install.
  const recordRuntime = async () => {
    const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
    if (!extension) {
      throw new Error('Actual Logic Apps extension was not loaded');
    }
    await extension.activate();
    const config = vscode.workspace.getConfiguration('azureLogicAppsStandard');
    const global = (key) => {
      const inspected = config.inspect(key);
      return inspected?.globalValue ?? inspected?.defaultValue;
    };
    return observeFuncRuntime(
      global('funcCoreToolsBinaryPath'),
      global('autoRuntimeDependenciesValidationAndInstallation'),
      global('autoRuntimeDependenciesPath'),
      process.env
    );
  };
  recordRuntime().then(
    (resolution) => append({ kind: 'runtimeResolution', resolution }),
    (error) => append({ kind: 'runtimeResolution', error: String(error) })
  );
  const record = (kind, session) =>
    append({ kind, id: session.id, name: session.name, folder: session.workspaceFolder?.uri.fsPath, type: session.type });
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => record('started', session)),
    vscode.debug.onDidTerminateDebugSession((session) => record('terminated', session))
  );
};
