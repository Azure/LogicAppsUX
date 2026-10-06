/* global process, exports, require */
const vscode = require('vscode');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

exports.activate = (context) => {
  const file = process.env.LA_E2E_CLI_MULTI_ROOT_EVENTS;
  if (!file) {
    throw new Error('Current multi-root invocation event path is required');
  }
  const boot = randomUUID();
  const append = (event) => fs.appendFileSync(file, `${JSON.stringify({ ...event, boot })}\n`);
  append({ kind: 'activation', roots: (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri.fsPath) });
  const record = (kind, session) =>
    append({ kind, id: session.id, name: session.name, folder: session.workspaceFolder?.uri.fsPath, type: session.type });
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => record('started', session)),
    vscode.debug.onDidTerminateDebugSession((session) => record('terminated', session))
  );
};
