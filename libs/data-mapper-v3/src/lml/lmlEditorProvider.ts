import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { LmlDesignTimeRuntimeManager } from './designTimeRuntime';
import { lmlEditorViewType } from './editorProtocol';
import type { LmlEditorInitialState, LmlEditorRequest, LmlEditorResponse, LmlSaveSnapshot } from './editorProtocol';
import { LmlRuntimeClient } from './lmlRuntimeClient';
import { getLmlSchemaReferences } from './lmlImportPlanner';
import { prepareLmlRuntimeWorkspace } from './runtimeWorkspace';

const customXsltFolder = 'Artifacts/DataMapper/Extensions/InlineXslt';

interface EditorState {
  document: vscode.TextDocument;
  projectPath: string;
  panels: Set<vscode.WebviewPanel>;
  expectedText?: string;
  saving?: boolean;
  nativeSaving?: boolean;
  saveGeneration?: number;
  snapshot?: { id: string; panel: vscode.WebviewPanel; resolve(snapshot: LmlSaveSnapshot): void; reject(error: Error): void };
  savedSnapshot?: LmlSaveSnapshot;
  savedRevision?: number;
}

function requireTrust(): void {
  if (!vscode.workspace.isTrusted) {
    throw new Error('Trust this workspace before using the LML editor.');
  }
}

function text(params: Record<string, unknown>, key: string): string {
  if (typeof params[key] !== 'string') {
    throw new Error(`LML request requires ${key} text.`);
  }
  return params[key] as string;
}

async function projectFile(root: string, relative: string): Promise<string> {
  if (!relative || path.isAbsolute(relative) || /^[a-z][a-z0-9+.-]*:/i.test(relative) || relative.includes('\0')) {
    throw new Error('LML paths must be project-relative local files.');
  }
  const segments = relative.replace(/\\/g, '/').split('/');
  if (segments.some((segment) => segment === '..' || segment.includes(':'))) {
    throw new Error('LML paths must remain inside the project.');
  }
  let current = root;
  for (const segment of segments.filter((part) => part && part !== '.')) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return undefined;
    });
    if (stat?.isSymbolicLink() || (stat?.isFile() && stat.nlink > 1)) {
      throw new Error('LML editor cannot use linked files or directories.');
    }
  }
  return current;
}

async function optionalText(filename: string): Promise<string | undefined> {
  return fs.readFile(filename, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return undefined;
  });
}

async function assetPaths(root: string, folder: string, extensions: RegExp): Promise<string[]> {
  const result: string[] = [];
  async function visit(relative: string): Promise<void> {
    const directory = await projectFile(root, path.posix.join(folder, relative));
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return [];
    });
    for (const entry of entries) {
      const child = path.posix.join(relative, entry.name);
      await projectFile(root, path.posix.join(folder, child));
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile() && extensions.test(entry.name)) {
        result.push(child);
      }
    }
  }
  await visit('');
  return result.sort();
}

export class LmlEditorProvider implements vscode.CustomTextEditorProvider, vscode.Disposable {
  private static readonly activePanels = new Set<vscode.WebviewPanel>();
  private readonly editors = new Map<string, EditorState>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly changeListener: vscode.Disposable;
  private readonly willSaveListener: vscode.Disposable;
  private readonly didSaveListener: vscode.Disposable;
  private disposed = false;

  static register(context: vscode.ExtensionContext, runtimeManager: LmlDesignTimeRuntimeManager): vscode.Disposable {
    const provider = new LmlEditorProvider(context, runtimeManager);
    return vscode.Disposable.from(
      vscode.window.registerCustomEditorProvider(lmlEditorViewType, provider, {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }),
      provider
    );
  }

  static async executeActiveEditorCommand(command: 'compile' | 'test'): Promise<boolean> {
    for (const panel of LmlEditorProvider.activePanels) {
      if (panel.active && panel.visible) {
        return panel.webview.postMessage({ type: 'lmlCommand', command });
      }
    }
    return false;
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly runtimeManager: Pick<LmlDesignTimeRuntimeManager, 'ensureStarted'>
  ) {
    this.changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      const state = this.editors.get(event.document.uri.toString());
      if (!state || event.contentChanges.length === 0) {
        return;
      }
      if (state.expectedText !== undefined && event.document.getText() === state.expectedText) {
        state.expectedText = undefined;
        return;
      }
      state.expectedText = undefined;
      state.savedSnapshot = undefined;
      for (const panel of state.panels) {
        panel.webview.postMessage({ type: 'lmlDocumentChanged', revision: event.document.version });
      }
    });
    this.willSaveListener = vscode.workspace.onWillSaveTextDocument((event) => {
      const state = this.editors.get(event.document.uri.toString());
      if (state && !state.saving) {
        event.waitUntil(this.nativeSave(state));
      }
    });
    this.didSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
      const state = this.editors.get(document.uri.toString());
      const snapshot = state?.savedSnapshot;
      if (!state || !snapshot) {
        return;
      }
      state.savedSnapshot = undefined;
      state.expectedText = undefined;
      if (document.version === state.savedRevision && document.getText() === snapshot.dataMapDefinition) {
        for (const panel of state.panels) {
          panel.webview.postMessage({ type: 'lmlDocumentSaved', id: snapshot.id, revision: document.version });
        }
      }
    });
  }

  private async nativeSave(state: EditorState): Promise<vscode.TextEdit[]> {
    const panel = [...state.panels][0];
    if (!panel) {
      return [];
    }
    const id = randomBytes(16).toString('hex');
    const revision = state.document.version;
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    state.savedSnapshot = undefined;
    state.nativeSaving = true;
    state.saveGeneration = (state.saveGeneration ?? 0) + 1;
    const operation = async (): Promise<vscode.TextEdit[]> => {
      requireTrust();
      const snapshot = await new Promise<LmlSaveSnapshot>((resolve, reject) => {
        state.snapshot = { id, panel, resolve, reject };
        Promise.resolve(panel.webview.postMessage({ type: 'lmlSaveRequested', id, revision, mapText: state.document.getText() })).then(
          (delivered) => {
            if (!delivered) {
              reject(new Error('The LML editor is unavailable for saving.'));
            }
          },
          reject
        );
      });
      if (expired || snapshot.error) {
        throw new Error(snapshot.error || 'LML save snapshot expired.');
      }
      this.revision(state, snapshot.revision);
      if (snapshot.revision !== revision) {
        throw new Error('LML document changed during the native save. Retry saving.');
      }
      if (snapshot.mapMetadata !== undefined) {
        this.metadata(snapshot.mapMetadata);
        await this.writeFile(state, this.metadataPath(state), snapshot.mapMetadata, revision);
      }
      if (expired) {
        throw new Error('LML save snapshot expired.');
      }
      this.revision(state, revision);
      state.savedSnapshot = snapshot;
      state.savedRevision = revision + (state.document.getText() === snapshot.dataMapDefinition ? 0 : 1);
      if (state.document.getText() === snapshot.dataMapDefinition) {
        return [];
      }
      state.expectedText = snapshot.dataMapDefinition;
      return [
        vscode.TextEdit.replace(
          new vscode.Range(state.document.positionAt(0), state.document.positionAt(state.document.getText().length)),
          snapshot.dataMapDefinition
        ),
      ];
    };
    try {
      return await Promise.race([
        operation(),
        new Promise<vscode.TextEdit[]>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            const error = new Error('LML save snapshot timed out. Retry saving when the editor is ready.');
            state.snapshot?.reject(error);
            reject(error);
          }, 1000);
        }),
      ]);
    } catch (error) {
      state.savedSnapshot = undefined;
      state.expectedText = undefined;
      vscode.window.showErrorMessage(error instanceof Error ? error.message : 'LML native save failed.');
      return [];
    } finally {
      clearTimeout(timer);
      state.nativeSaving = false;
      if (state.snapshot?.id === id) {
        state.snapshot = undefined;
      }
    }
  }

  private metadataPath(state: EditorState): string {
    return `.vscode/${path.parse(state.document.uri.fsPath).name}DataMapMetadata-v2.json`;
  }

  private metadata(value: unknown): string {
    if (typeof value !== 'string' && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error('Save Map requires the v2 mapMetadata JSON.');
    }
    const metadataText = typeof value === 'string' ? value : JSON.stringify(value);
    const parsed: unknown = JSON.parse(metadataText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Save Map requires a v2 metadata JSON object.');
    }
    return metadataText;
  }

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    if (this.disposed || document.uri.scheme !== 'file' || document.uri.authority || !/\.lml$/i.test(document.uri.fsPath)) {
      throw new Error('Open a local .lml file to use the LML editor.');
    }
    const projectPath = await fs.realpath(path.dirname(document.uri.fsPath));
    await projectFile(projectPath, path.basename(document.uri.fsPath));
    const key = document.uri.toString();
    let state = this.editors.get(key);
    if (!state) {
      state = { document, projectPath, panels: new Set() };
      this.editors.set(key, state);
    }
    const editor = state;
    editor.panels.add(panel);
    LmlEditorProvider.activePanels.add(panel);
    const bundleRoot = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview');
    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    panel.webview.options = { enableScripts: true, localResourceRoots: [bundleRoot, mediaRoot] };
    const receive = panel.webview.onDidReceiveMessage((message: unknown) => this.receive(editor, panel, message));
    const disposal = panel.onDidDispose(() => {
      receive.dispose();
      disposal.dispose();
      editor.panels.delete(panel);
      LmlEditorProvider.activePanels.delete(panel);
      if (editor.panels.size === 0) {
        editor.snapshot?.reject(new Error('The LML editor was closed during save.'));
        this.editors.delete(key);
      }
    });
    panel.webview.html = this.html(panel.webview, bundleRoot);
  }

  private html(webview: vscode.Webview, bundleRoot: vscode.Uri): string {
    const nonce = randomBytes(24).toString('base64');
    const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const script = escapeAttribute(webview.asWebviewUri(vscode.Uri.joinPath(bundleRoot, 'lml.js')).toString());
    const styles = escapeAttribute(webview.asWebviewUri(vscode.Uri.joinPath(bundleRoot, 'lml.css')).toString());
    const source = escapeAttribute(webview.cspSource);
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${source} 'self' 'unsafe-inline'; img-src ${source} 'self' data: blob:; font-src ${source} 'self' data: blob:; connect-src 'none';">
<link rel="stylesheet" href="${styles}"><title>LML Data Mapper</title></head>
<body><div id="root"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
  }

  private receive(state: EditorState, panel: vscode.WebviewPanel, message: unknown): Promise<void> | undefined {
    if (!message || typeof message !== 'object') {
      return;
    }
    const snapshot = message as LmlSaveSnapshot;
    if (snapshot.type === 'lmlSaveSnapshot') {
      if (state.snapshot?.id === snapshot.id && state.snapshot.panel === panel && typeof snapshot.dataMapDefinition === 'string') {
        state.snapshot.resolve(snapshot);
      }
      return;
    }
    const request = message as LmlEditorRequest;
    if (request.type !== 'lmlRequest' || typeof request.id !== 'string' || typeof request.method !== 'string') {
      return;
    }
    const previous = this.pending.get(state.projectPath) ?? Promise.resolve();
    const saveGeneration = state.saveGeneration ?? 0;
    const receivedDuringSave = state.nativeSaving;
    const task = previous
      .catch(() => undefined)
      .then(async () => {
        const response: LmlEditorResponse = { type: 'lmlResponse', id: request.id };
        try {
          if (this.disposed || !state.panels.has(panel)) {
            return;
          }
          if (
            (request.method === 'saveDraftState' || request.method === 'saveMapDefinition') &&
            (receivedDuringSave || saveGeneration !== (state.saveGeneration ?? 0))
          ) {
            throw new Error('A native LML save superseded this queued write. Retry using the current map.');
          }
          response.result = await this.handle(state, request);
        } catch (error) {
          response.error = error instanceof Error ? error.message : 'LML editor request failed.';
        }
        await panel.webview.postMessage(response);
      });
    this.pending.set(state.projectPath, task);
    return task.finally(() => {
      if (this.pending.get(state.projectPath) === task) {
        this.pending.delete(state.projectPath);
      }
    });
  }

  private revision(state: EditorState, revision: unknown): void {
    if (!Number.isInteger(revision) || revision !== state.document.version || state.document.isClosed) {
      throw new Error('LML document changed. Reload the current map before retrying.');
    }
  }

  private async runtime(state: EditorState, refresh: boolean, selectedSchema?: string): Promise<LmlRuntimeClient> {
    requireTrust();
    const runtime = await this.runtimeManager.ensureStarted(state.projectPath);
    requireTrust();
    if (refresh) {
      const schemas = getLmlSchemaReferences(state.document.getText());
      await prepareLmlRuntimeWorkspace(state.projectPath, selectedSchema ? [...schemas, selectedSchema] : schemas);
    }
    requireTrust();
    return new LmlRuntimeClient(runtime.baseUrl, requireTrust);
  }

  private async editMap(state: EditorState, mapText: string, revision: unknown): Promise<number> {
    requireTrust();
    if (state.nativeSaving) {
      throw new Error('A native LML save is in progress. Retry this edit after it finishes.');
    }
    await projectFile(state.projectPath, path.basename(state.document.uri.fsPath));
    requireTrust();
    this.revision(state, revision);
    if (state.nativeSaving) {
      throw new Error('A native LML save is in progress. Retry this edit after it finishes.');
    }
    if (state.document.getText() === mapText) {
      return state.document.version;
    }
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      state.document.uri,
      new vscode.Range(state.document.positionAt(0), state.document.positionAt(state.document.getText().length)),
      mapText
    );
    state.expectedText = mapText;
    try {
      if (!(await vscode.workspace.applyEdit(edit))) {
        throw new Error('VS Code could not apply the LML document edit.');
      }
    } finally {
      state.expectedText = undefined;
    }
    if (state.document.getText() !== mapText) {
      throw new Error('LML document changed while applying the edit. Reload before retrying.');
    }
    return state.document.version;
  }

  private async writeFile(state: EditorState, relative: string, contents: string, revision: unknown): Promise<void> {
    requireTrust();
    this.revision(state, revision);
    const target = await projectFile(state.projectPath, relative);
    requireTrust();
    this.revision(state, revision);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await projectFile(state.projectPath, relative);
    requireTrust();
    this.revision(state, revision);
    await fs.writeFile(target, contents, 'utf8');
    this.revision(state, revision);
  }

  private async handle(state: EditorState, request: LmlEditorRequest): Promise<unknown> {
    const params = request.params ?? {};
    const basename = path.basename(state.document.uri.fsPath);
    const xsltFilename = `${basename}.xslt`;
    requireTrust();
    switch (request.method) {
      case 'initialize': {
        const revision = state.document.version;
        const mapText = state.document.getText();
        const metadataText =
          (await optionalText(await projectFile(state.projectPath, this.metadataPath(state)))) ??
          (await optionalText(await projectFile(state.projectPath, `${basename}.metadata.json`)));
        const xsltContent = (await optionalText(await projectFile(state.projectPath, `__generated/${xsltFilename}`))) ?? '';
        const schemaPaths = await assetPaths(state.projectPath, 'Schemas', /\.(xsd|json)$/i);
        const customXsltPaths = await assetPaths(state.projectPath, customXsltFolder, /\.(xslt|xml)$/i);
        this.revision(state, revision);
        const initial: LmlEditorInitialState = {
          mapText,
          metadataText,
          xsltFilename,
          xsltContent,
          schemaPaths,
          customXsltPaths,
          revision,
          isTestDisabledForOS: process.platform !== 'win32',
          isDark:
            vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Light &&
            vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.HighContrastLight,
        };
        return initial;
      }
      case 'getFunctionsManifest':
        return (await this.runtime(state, false)).getFunctionsManifest();
      case 'getSchemaFile': {
        const schemaName = text(params, 'schemaName');
        const schemaFilePath = text(params, 'schemaFilePath').replace(/\\/g, '/');
        if (path.posix.basename(schemaFilePath) !== schemaName || !/\.(xsd|json)$/i.test(schemaName)) {
          throw new Error('Select a project XSD or JSON schema.');
        }
        const schema = await projectFile(state.projectPath, `Schemas/${schemaFilePath}`);
        if (!(await fs.stat(schema)).isFile()) {
          throw new Error('Select an existing project schema file.');
        }
        return (await this.runtime(state, true, schemaFilePath)).getSchemaFile(schemaName, schemaFilePath);
      }
      case 'generateDataMapXslt': {
        const definition = text(params, 'dataMapDefinition');
        const revision = params.revision ?? state.document.version;
        this.revision(state, revision);
        const runtime = await this.runtime(state, true);
        this.revision(state, revision);
        const xslt = await runtime.generateDataMapXslt(definition);
        this.revision(state, revision);
        return xslt;
      }
      case 'testDataMap': {
        if (process.platform !== 'win32') {
          throw new Error('LML Test Map is supported only on Windows.');
        }
        if (text(params, 'dataMapXsltFilename') !== xsltFilename) {
          throw new Error("Test Map can only run this map's generated .lml.xslt file.");
        }
        const input = text(params, 'schemaInputValue');
        const revision = params.revision ?? state.document.version;
        this.revision(state, revision);
        await fs.access(await projectFile(state.projectPath, `__generated/${xsltFilename}`));
        const runtime = await this.runtime(state, true);
        this.revision(state, revision);
        const result = await runtime.testDataMap(xsltFilename, input);
        this.revision(state, revision);
        return result;
      }
      case 'saveDraftState':
        return { revision: await this.editMap(state, text(params, 'dataMapDefinition'), params.revision) };
      case 'saveMapDefinition': {
        this.revision(state, params.revision);
        const metadataText = this.metadata(params.mapMetadata);
        await projectFile(state.projectPath, this.metadataPath(state));
        const revision = await this.editMap(state, text(params, 'dataMapDefinition'), params.revision);
        requireTrust();
        state.saving = true;
        state.savedSnapshot = undefined;
        try {
          if (!(await state.document.save())) {
            throw new Error('VS Code could not save the LML document. Metadata was not saved.');
          }
        } finally {
          state.saving = false;
        }
        this.revision(state, revision);
        await this.writeFile(state, this.metadataPath(state), metadataText, revision);
        return { revision: state.document.version };
      }
      case 'saveXslt': {
        await this.writeFile(state, `__generated/${xsltFilename}`, text(params, 'xslt'), params.revision);
        return { revision: state.document.version };
      }
      case 'readSchemas':
        return assetPaths(state.projectPath, 'Schemas', /\.(xsd|json)$/i);
      case 'readCustomXsltPaths':
        return assetPaths(state.projectPath, customXsltFolder, /\.(xslt|xml)$/i);
      case 'selectSchema': {
        if (params.schemaType !== 'source' && params.schemaType !== 'target') {
          throw new Error('Select a source or target schema.');
        }
        const selected = await vscode.window.showQuickPick(await assetPaths(state.projectPath, 'Schemas', /\.(xsd|json)$/i), {
          title: params.schemaType === 'source' ? 'Source schema' : 'Target schema',
        });
        return selected ? { name: path.posix.basename(selected), path: selected, type: params.schemaType } : undefined;
      }
      case 'notify': {
        const title = text(params, 'title');
        const notification = `${title}: ${text(params, 'text')}`;
        if (params.level === 2 || params.level === 'error') {
          vscode.window.showErrorMessage(notification);
        } else if (params.level === 1 || params.level === 'warning') {
          vscode.window.showWarningMessage(notification);
        } else {
          vscode.window.showInformationMessage(notification);
        }
        return undefined;
      }
      default:
        throw new Error('Unsupported LML editor request.');
    }
  }

  dispose(): void {
    this.disposed = true;
    this.changeListener.dispose();
    this.willSaveListener.dispose();
    this.didSaveListener.dispose();
    for (const state of this.editors.values()) {
      state.snapshot?.reject(new Error('The LML editor was disposed during save.'));
      for (const panel of state.panels) {
        LmlEditorProvider.activePanels.delete(panel);
      }
    }
    this.editors.clear();
  }
}
