import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { localize } from '../../localize';

export interface LegacyMigrationResult {
  destination: string;
  workspaceFile?: string;
}

interface MigrationDialogOptions {
  projectName: string;
  needsWorkspaceName: boolean;
  validateWorkspaceName(value: string): Promise<string | undefined>;
  convert(
    workspaceName: string | undefined,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<LegacyMigrationResult>;
}

export function showLegacyDataMapperMigrationDialog(options: MigrationDialogOptions): Promise<boolean> {
  const title = localize('legacyMapperDialogTitle', 'Project update');
  const panel = vscode.window.createWebviewPanel('legacyDataMapperMigration', title, vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [],
  });
  return new Promise<boolean>((resolve, reject) => {
    let running = false;
    let started = false;
    let disposed = false;
    let settled = false;
    let result: LegacyMigrationResult | undefined;
    let state = { phase: 'confirm', message: '', percent: 0, destination: '' };
    const subscriptions: vscode.Disposable[] = [];
    const finish = async (): Promise<void> => {
      if (running || settled) {
        return;
      }
      settled = true;
      for (const subscription of subscriptions) {
        subscription.dispose();
      }
      try {
        if (result?.workspaceFile) {
          await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(result.workspaceFile));
        }
        resolve(!!result?.workspaceFile);
      } catch (error) {
        reject(error);
      }
    };
    const send = (): void => {
      if (!disposed) {
        panel.webview.postMessage({ type: 'state', ...state });
      }
    };
    subscriptions.push(
      panel.onDidDispose(() => {
        disposed = true;
        finish().catch(reject);
      }),
      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        if (!message || typeof message !== 'object' || !('type' in message)) {
          return;
        }
        if (message.type === 'ready') {
          send();
          return;
        }
        if (message.type === 'close' && !running) {
          panel.dispose();
          return;
        }
        if (message.type !== 'start' || started || disposed) {
          return;
        }
        started = true;
        running = true;
        state = { ...state, phase: 'running', message: localize('legacyMapperConverting', 'Converting into new project...') };
        send();
        try {
          const workspaceName = 'workspaceName' in message && typeof message.workspaceName === 'string' ? message.workspaceName : undefined;
          if (options.needsWorkspaceName) {
            const error = await options.validateWorkspaceName(workspaceName ?? '');
            if (error) {
              started = false;
              state = { ...state, phase: 'confirm', message: error };
              return;
            }
          }
          result = await options.convert(workspaceName, {
            report: (update) => {
              state = {
                ...state,
                message: update.message ?? state.message,
                percent: Math.min(99, state.percent + (update.increment ?? 0)),
              };
              send();
            },
          });
          state = {
            phase: 'success',
            message: localize('legacyMapperMoved', 'Successfully moved to new project "{0}".', path.basename(result.destination)),
            percent: 100,
            destination: result.destination,
          };
        } catch (error) {
          state = { ...state, phase: 'error', message: error instanceof Error ? error.message : String(error) };
          if (disposed) {
            vscode.window.showErrorMessage(state.message);
          }
        } finally {
          running = false;
          send();
          if (disposed) {
            await finish();
          }
        }
      })
    );
    const nonce = randomBytes(24).toString('base64');
    const labels = JSON.stringify({
      title,
      confirmation: localize(
        'legacyMapperConversion',
        '"{0}" project contains legacy mapper element which will be moved to a new mapper project in this workspace.',
        options.projectName
      ),
      converting: localize('legacyMapperConverting', 'Converting into new project...'),
      success: localize('legacyMapperCompleted', 'Conversion completed'),
      failure: localize('legacyMapperFailed', 'Conversion failed'),
      workspaceName: localize('legacyMapperWorkspaceLabel', 'Workspace name'),
      needsWorkspaceName: options.needsWorkspaceName,
      close: localize('legacyMapperClose', 'Close'),
    }).replace(/</g, '\\u003c');
    panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: max(16px, var(--vscode-font-size, 13px)); }
  dialog { box-sizing: border-box; width: min(620px, calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: 24px; border: 1px solid var(--vscode-widget-border, var(--vscode-contrastBorder, transparent)); border-radius: 4px; color: var(--vscode-foreground); background: var(--vscode-editorWidget-background, var(--vscode-editor-background)); }
  dialog::backdrop { background: rgb(0 0 0 / 40%); }
  h1 { margin: 0 0 20px; font-size: 20px; font-weight: 600; }
  p { line-height: 1.5; overflow-wrap: anywhere; }
  label { display: block; margin: 20px 0 8px; }
  input { box-sizing: border-box; width: 100%; padding: 6px 8px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); font: inherit; }
  progress { display: block; width: 100%; height: 8px; margin: 24px 0 12px; accent-color: var(--vscode-progressBar-background); }
  progress::-webkit-progress-bar { background: var(--vscode-input-background); border-radius: 2px; }
  progress::-webkit-progress-value { background: var(--vscode-progressBar-background); border-radius: 2px; transition: width 150ms; }
  #destination { color: var(--vscode-descriptionForeground); }
  #status { min-height: 1.5em; }
  .error { color: var(--vscode-errorForeground); }
  footer { display: flex; justify-content: flex-end; margin-top: 24px; }
  button { min-width: 80px; padding: 6px 16px; border: 1px solid var(--vscode-button-border, transparent); border-radius: 2px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); font: inherit; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  :focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<dialog aria-labelledby="title" aria-describedby="description">
  <h1 id="title"></h1>
  <p id="description"></p>
  <div id="workspace-field" hidden><label id="workspace-label" for="workspace-name"></label><input id="workspace-name" autocomplete="off" required></div>
  <progress id="progress" max="100" value="0" hidden aria-label="Conversion progress"></progress>
  <p id="status" role="status" aria-live="polite"></p>
  <p id="destination" hidden></p>
  <footer><button id="action" type="button">OK</button></footer>
</dialog>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const labels = ${labels};
  const dialog = document.querySelector('dialog');
  const title = document.getElementById('title');
  const description = document.getElementById('description');
  const workspaceField = document.getElementById('workspace-field');
  const workspaceName = document.getElementById('workspace-name');
  const progress = document.getElementById('progress');
  const status = document.getElementById('status');
  const destination = document.getElementById('destination');
  const action = document.getElementById('action');
  let phase = 'confirm';
  title.textContent = labels.title;
  description.textContent = labels.confirmation;
  document.getElementById('workspace-label').textContent = labels.workspaceName;
  workspaceField.hidden = !labels.needsWorkspaceName;
  dialog.addEventListener('cancel', event => event.preventDefault());
  action.addEventListener('click', () => {
    if (phase === 'confirm') {
      if (labels.needsWorkspaceName && !workspaceName.reportValidity()) { return; }
      phase = 'running';
      action.hidden = true;
      workspaceName.disabled = true;
      title.textContent = labels.converting;
      progress.hidden = false;
      vscode.postMessage({ type: 'start', workspaceName: workspaceName.value });
    } else if (phase === 'success' || phase === 'error') {
      vscode.postMessage({ type: 'close' });
    }
  });
  window.addEventListener('message', event => {
    const state = event.data;
    if (state.type !== 'state') { return; }
    phase = state.phase;
    title.textContent = phase === 'confirm' ? labels.title : phase === 'running' ? labels.converting : phase === 'success' ? labels.success : labels.failure;
    description.hidden = phase !== 'confirm';
    workspaceField.hidden = phase !== 'confirm' || !labels.needsWorkspaceName;
    workspaceName.disabled = phase !== 'confirm';
    progress.hidden = phase === 'confirm';
    progress.value = state.percent;
    status.textContent = state.message;
    status.classList.toggle('error', phase === 'error' || phase === 'confirm' && !!state.message);
    destination.hidden = !state.destination;
    destination.textContent = state.destination;
    action.hidden = phase === 'running';
    action.textContent = phase === 'confirm' ? 'OK' : labels.close;
    if (phase === 'success' || phase === 'error') { action.focus(); }
  });
  dialog.showModal();
  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  });
}
