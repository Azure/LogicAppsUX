import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  addDataMap,
  createWorkspaceMapperProject,
  findMapperProjects,
  importExistingMap,
  registerEmbeddedMapper,
} from '../src/embeddedMapper';
import { IMPORT_MAP_BROWSE_DIRECTORY_KEY } from '../src/browseLocation';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { LmlDesignTimeRuntimeManager } from '../src/lml/designTimeRuntime';
import { lmlEditorViewType } from '../src/lml/editorProtocol';
import { LmlEditorProvider } from '../src/lml/lmlEditorProvider';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { CompilerWorkerClient } from '../src/worker/compilerWorkerClient';

vi.mock('vscode', async (importOriginal) => {
  const base = await importOriginal<typeof vscode>();
  return {
    ...base,
    extensions: { getExtension: vi.fn(), all: [] },
    window: { ...base.window, showQuickPick: vi.fn() },
    workspace: {
      ...base.workspace,
      workspaceFolders: [],
      getWorkspaceFolder: vi.fn((uri) => ({ uri })),
      fs: { ...base.workspace.fs, stat: vi.fn((uri) => fs.stat(uri.fsPath)) },
      getConfiguration: vi.fn(() => ({ get: vi.fn((_key: string, fallback: unknown) => fallback) })),
    },
  };
});

describe('embedded mapper source integration', () => {
  let tempDir: string;
  let registration: vscode.Disposable | undefined;
  const hostOptions = { viewType: 'azureLogicAppsStandard.dataMapperV3', btmOnly: true, requireExistingProject: true };
  const importContext = () => ({ globalState: { get: vi.fn(), update: vi.fn() } }) as unknown as vscode.ExtensionContext;
  const createImportSource = async () => {
    const root = vscode.Uri.file(path.join(tempDir, 'Source'));
    const map = await createWorkspaceMapperProject(root, 'Imported');
    const schema = '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="Shared.xsd"/></xs:schema>';
    await fs.writeFile(path.join(root.fsPath, 'Schemas', 'Source.xsd'), schema);
    await fs.writeFile(path.join(root.fsPath, 'Schemas', 'Shared.xsd'), '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>');
    const serializer = new BtmSerializer();
    await fs.writeFile(map.fsPath, serializer.serialize(serializer.createNew('Schemas/Source.xsd', 'Schemas/Source.xsd', 'Imported')));
    return map;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(vscode.workspace, { workspaceFolders: [] });
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'embedded-mapper-'));
    vi.spyOn(vscode.workspace.fs, 'createDirectory').mockImplementation(async (uri) => {
      await fs.mkdir(uri.fsPath, { recursive: true });
    });
    vi.spyOn(vscode.workspace.fs, 'writeFile').mockImplementation(async (uri, data) => {
      await fs.writeFile(uri.fsPath, data);
    });
    vi.spyOn(vscode.workspace.fs, 'readFile').mockImplementation((uri) => fs.readFile(uri.fsPath));
    vi.spyOn(vscode.workspace.fs, 'readDirectory').mockImplementation(async (uri) => {
      try {
        return (await fs.readdir(uri.fsPath, { withFileTypes: true })).map((entry): [string, vscode.FileType] => [
          entry.name,
          entry.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
        ]);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw Object.assign(new Error('Folder not found'), { code: 'FileNotFound' });
        }
        throw error;
      }
    });
  });

  afterEach(async () => {
    registration?.dispose();
    registration = undefined;
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates a native named map through the real embedded export without a separate extension', async () => {
    const activateSeparateMapper = vi.fn();
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({ activate: activateSeparateMapper } as unknown as vscode.Extension<unknown>);
    const root = vscode.Uri.file(path.join(tempDir, 'DataMaps', 'Orders'));

    const mapUri = await createWorkspaceMapperProject(root, 'OrderMapping');

    expect(mapUri.fsPath).toBe(path.join(root.fsPath, 'OrderMapping.btm'));
    expect((await fs.readdir(root.fsPath)).sort()).toEqual(['OrderMapping.btm', 'Schemas', '__generated']);
    expect(await fs.readdir(path.join(root.fsPath, 'Schemas'))).toEqual([]);
    expect(await fs.readdir(path.join(root.fsPath, '__generated'))).toEqual([]);
    const parsed = new BtmSerializer().deserialize(await fs.readFile(mapUri.fsPath, 'utf8'));
    expect(parsed).toMatchObject({ name: 'OrderMapping', pages: [{ name: 'Page 1', links: [], functoids: [] }] });
    expect(parsed.pages).toHaveLength(1);
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    expect(activateSeparateMapper).not.toHaveBeenCalled();
  });

  it.each([true, false])('adds a native map with collision protection (embedded host: %s)', async (embedded) => {
    const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
    const original = await createWorkspaceMapperProject(root, 'map');
    const originalContent = await fs.readFile(original.fsPath, 'utf8');
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('map');
    const changed = vi.fn();

    await addDataMap(root, changed, embedded ? hostOptions : undefined);

    const added = path.join(root.fsPath, 'map(1).btm');
    expect(new BtmSerializer().deserialize(await fs.readFile(added, 'utf8')).name).toBe('map(1)');
    expect(await fs.readFile(original.fsPath, 'utf8')).toBe(originalContent);
    expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({ value: 'map(1)' }));
    expect(changed).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenCalledExactlyOnceWith(
      'vscode.openWith',
      expect.objectContaining({ fsPath: added }),
      embedded ? hostOptions.viewType : 'biztalkDataMapper.mapEditor'
    );
  });

  it('imports a BTM with schema dependencies, browse persistence, and collision-safe host opening', async () => {
    const source = await createImportSource();
    const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
    const original = await createWorkspaceMapperProject(root, 'Imported');
    const originalContent = await fs.readFile(original.fsPath, 'utf8');
    const context = importContext();
    vi.mocked(context.globalState.get).mockReturnValue(tempDir);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([source]);
    const changed = vi.fn();

    await importExistingMap(root, changed, context, hostOptions);

    const imported = path.join(root.fsPath, 'Imported(1).btm');
    expect(new BtmSerializer().deserialize(await fs.readFile(imported, 'utf8')).sourceSchema.location).toBe('Schemas/Source.xsd');
    expect((await fs.readdir(path.join(root.fsPath, 'Schemas'))).sort()).toEqual(['Shared.xsd', 'Source.xsd']);
    expect(await fs.readFile(original.fsPath, 'utf8')).toBe(originalContent);
    expect(vscode.window.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { 'Data Maps': ['btm'] },
        defaultUri: expect.objectContaining({ fsPath: tempDir }),
      })
    );
    expect(context.globalState.update).toHaveBeenCalledWith(IMPORT_MAP_BROWSE_DIRECTORY_KEY, path.dirname(source.fsPath));
    expect(changed).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenCalledExactlyOnceWith(
      'vscode.openWith',
      expect.objectContaining({ fsPath: imported }),
      hostOptions.viewType
    );
  });

  it.each([undefined, 'Keep Existing', 'Overwrite'])('preserves schema conflict safeguards for host import: %s', async (choice) => {
    const source = await createImportSource();
    const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
    await createWorkspaceMapperProject(root, 'map');
    const existing = path.join(root.fsPath, 'Schemas', 'Shared.xsd');
    await fs.writeFile(existing, 'existing schema');
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([source]);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValueOnce(choice);
    const changed = vi.fn();

    await importExistingMap(root, changed, importContext(), hostOptions);

    expect(await fs.readFile(existing, 'utf8')).toBe(
      choice === 'Overwrite'
        ? await fs.readFile(path.join(path.dirname(source.fsPath), 'Schemas', 'Shared.xsd'), 'utf8')
        : 'existing schema'
    );
    if (choice) {
      expect(changed).toHaveBeenCalledOnce();
      expect(await fs.readFile(path.join(root.fsPath, 'Imported.btm'), 'utf8')).toContain('Schemas/Source.xsd');
    } else {
      expect(changed).not.toHaveBeenCalled();
      expect(await fs.readdir(root.fsPath)).not.toContain('Imported.btm');
      expect(await fs.readdir(path.join(root.fsPath, 'Schemas'))).toEqual(['Shared.xsd']);
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    }
  });

  it('rejects LML selection even if a dialog bypasses the BTM filter', async () => {
    const context = importContext();
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([vscode.Uri.file(path.join(tempDir, 'Map.lml'))]);
    const changed = vi.fn();
    await expect(importExistingMap(undefined, changed, context, hostOptions)).rejects.toThrow('Only BTM');
    expect(context.globalState.update).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it.each([undefined, 'azureLogicAppsStandard.dataMapperV2'])(
    'imports LML with its own view type despite a BTM host override: %s',
    async (lmlViewType) => {
      const source = await createImportSource();
      const lml = vscode.Uri.file(path.join(path.dirname(source.fsPath), 'Imported.lml'));
      const contents = '$sourceSchema: Source.xsd\n$targetSchema: Source.xsd\nRoot: /Root\n';
      await fs.writeFile(lml.fsPath, contents);
      const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
      await createWorkspaceMapperProject(root, 'map');
      const original = path.join(root.fsPath, 'Imported.lml');
      await fs.writeFile(original, 'original map');
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([lml]);
      const changed = vi.fn();
      const context = importContext();

      await importExistingMap({ resourceUri: root }, changed, context, { ...hostOptions, btmOnly: false, lmlViewType });

      const imported = path.join(root.fsPath, 'Imported(1).lml');
      expect(await fs.readFile(imported, 'utf8')).toContain('Root: /Root');
      expect(await fs.readFile(original, 'utf8')).toBe('original map');
      expect(await fs.readFile(lml.fsPath, 'utf8')).toBe(contents);
      expect((await fs.readdir(path.join(root.fsPath, 'Schemas'))).sort()).toEqual(['Shared.xsd', 'Source.xsd']);
      expect(vscode.window.showOpenDialog).toHaveBeenCalledWith(expect.objectContaining({ filters: { 'Data Maps': ['btm', 'lml'] } }));
      expect(context.globalState.update).toHaveBeenCalledWith(IMPORT_MAP_BROWSE_DIRECTORY_KEY, path.dirname(lml.fsPath));
      expect(changed).toHaveBeenCalledOnce();
      expect(vscode.commands.executeCommand).toHaveBeenCalledExactlyOnceWith(
        'vscode.openWith',
        expect.objectContaining({ fsPath: imported }),
        lmlViewType ?? lmlEditorViewType
      );
    }
  );

  it('refuses LML schema replacement without writing or opening the imported map', async () => {
    const source = await createImportSource();
    const lml = vscode.Uri.file(path.join(path.dirname(source.fsPath), 'Imported.lml'));
    await fs.writeFile(lml.fsPath, '$sourceSchema: Source.xsd\n$targetSchema: Source.xsd\n');
    const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
    await createWorkspaceMapperProject(root, 'map');
    const schema = path.join(root.fsPath, 'Schemas', 'Source.xsd');
    await fs.writeFile(schema, 'existing schema');
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([lml]);
    const changed = vi.fn();

    await importExistingMap(root, changed, importContext(), {
      ...hostOptions,
      btmOnly: false,
      lmlViewType: 'azureLogicAppsStandard.dataMapperV2',
    });

    expect(await fs.readFile(schema, 'utf8')).toBe('existing schema');
    expect(await fs.readdir(path.join(root.fsPath, 'Schemas'))).toEqual(['Source.xsd']);
    expect(await fs.readdir(root.fsPath)).not.toContain('Imported.lml');
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('LML import would replace existing schemas'));
    expect(changed).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it.each([false, true])('owns the embedded V2 LML provider and runtime (disposal rejects: %s)', async (rejectDisposal) => {
    const hostUri = vscode.Uri.file(path.join(tempDir, 'logic-apps-extension'));
    const resourceRoot = vscode.Uri.joinPath(hostUri, 'assets', 'data-mapper-v3');
    const context = {
      extensionUri: hostUri,
      subscriptions: [],
      globalState: { get: vi.fn(), update: vi.fn() },
    } as unknown as vscode.ExtensionContext;
    const readProposedApi = vi.fn(() => {
      throw new Error('extensionRuntime API is not enabled');
    });
    Object.defineProperty(context, 'extensionRuntime', { enumerable: true, get: readProposedApi });
    Object.freeze(context);
    const ensureStarted = vi.spyOn(LmlDesignTimeRuntimeManager.prototype, 'ensureStarted').mockRejectedValue(new Error('Must not start'));
    const disposeRuntime = vi.spyOn(LmlDesignTimeRuntimeManager.prototype, 'dispose');
    if (rejectDisposal) {
      disposeRuntime.mockRejectedValueOnce(new Error('Runtime stop failed'));
    }
    const disposeProvider = vi.spyOn(LmlEditorProvider.prototype, 'dispose');

    registration = registerEmbeddedMapper(context, hostOptions.viewType, resourceRoot, 'azureLogicAppsStandard.dataMapperV2');

    expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledTimes(2);
    const [btmRegistration, lmlRegistration] = vi.mocked(vscode.window.registerCustomEditorProvider).mock.calls;
    expect(btmRegistration[0]).toBe(hostOptions.viewType);
    expect(lmlRegistration[0]).toBe('azureLogicAppsStandard.dataMapperV2');
    expect(lmlRegistration[1]).toBeInstanceOf(LmlEditorProvider);
    expect(lmlRegistration[2]).toEqual({ webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false });
    const btm = btmRegistration[1] as unknown as { context: vscode.ExtensionContext };
    const lml = lmlRegistration[1] as LmlEditorProvider;
    const owned = lml as unknown as { context: vscode.ExtensionContext; runtimeManager: LmlDesignTimeRuntimeManager };
    expect(owned.context).toBe(btm.context);
    expect(owned.context.extensionUri).toBe(resourceRoot);
    expect(owned.context.extensionPath).toBe(resourceRoot.fsPath);
    expect(owned.context.asAbsolutePath('out/webview/lml.js')).toBe(path.join(resourceRoot.fsPath, 'out/webview/lml.js'));
    expect(owned.context.globalState).toBe(context.globalState);
    expect(owned.context.subscriptions).toBe(context.subscriptions);
    expect(owned.runtimeManager).toBeInstanceOf(LmlDesignTimeRuntimeManager);
    const mapUri = vscode.Uri.file(path.join(tempDir, 'orders.lml'));
    await fs.writeFile(mapUri.fsPath, '$sourceSchema: source.xsd\n$targetSchema: target.xsd\n');
    const panel = {
      webview: {
        options: {} as vscode.WebviewOptions,
        html: '',
        cspSource: 'vscode-webview:',
        asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    };
    await lml.resolveCustomTextEditor({ uri: mapUri } as vscode.TextDocument, panel as unknown as vscode.WebviewPanel);
    expect(panel.webview.options.localResourceRoots?.map((uri) => uri.fsPath)).toEqual([
      path.join(resourceRoot.fsPath, 'out', 'webview'),
      path.join(resourceRoot.fsPath, 'media'),
    ]);
    for (const asset of ['lml.js', 'lml.css']) {
      expect(panel.webview.html).toContain(path.join(resourceRoot.fsPath, 'out', 'webview', asset));
    }
    expect(ensureStarted).not.toHaveBeenCalled();
    expect(readProposedApi).not.toHaveBeenCalled();
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();

    const providerRegistration = vi.mocked(vscode.window.registerCustomEditorProvider).mock.results[1].value;
    registration.dispose();
    registration = undefined;
    await Promise.resolve();
    expect(disposeRuntime).toHaveBeenCalledOnce();
    expect(disposeProvider).toHaveBeenCalledOnce();
    expect(providerRegistration.dispose).toHaveBeenCalledOnce();
    if (rejectDisposal) {
      expect(vscode.window.createOutputChannel().error).toHaveBeenCalledWith('LML runtime disposal failed: Error');
    }
  });

  it.each(['add', 'import'])('does not open a standalone mapper when no project exists: %s', async (command) => {
    const source = await createImportSource();
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce([source]);
    const changed = vi.fn();
    await expect(
      command === 'add' ? addDataMap(undefined, changed, hostOptions) : importExistingMap(undefined, changed, importContext(), hostOptions)
    ).rejects.toThrow('No mapper project');
    expect(changed).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it.each(['add', 'import'])('leaves the project unchanged after cancellation: %s', async (command) => {
    const root = vscode.Uri.file(path.join(tempDir, 'Maps'));
    await createWorkspaceMapperProject(root, 'map');
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValueOnce(undefined);
    const changed = vi.fn();
    if (command === 'add') {
      await addDataMap(root, changed, hostOptions);
    } else {
      await importExistingMap(root, changed, importContext(), hostOptions);
    }
    expect((await fs.readdir(root.fsPath)).sort()).toEqual(['Schemas', '__generated', 'map.btm']);
    expect(changed).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('detects mixed workspace mapper projects without classifying Logic Apps artifact schemas', async () => {
    const logicApp = vscode.Uri.file(path.join(tempDir, 'LogicApp'));
    await fs.mkdir(path.join(logicApp.fsPath, 'Artifacts', 'MapDefinitions'), { recursive: true });
    await fs.mkdir(path.join(logicApp.fsPath, 'Artifacts', 'Schemas'), { recursive: true });
    await fs.mkdir(path.join(logicApp.fsPath, 'Schemas'), { recursive: true });
    await fs.writeFile(path.join(logicApp.fsPath, 'host.json'), '{}');
    const mapper = vscode.Uri.file(path.join(tempDir, 'Mapper'));
    await createWorkspaceMapperProject(mapper, 'map');
    const nested = vscode.Uri.file(path.join(tempDir, 'Container', 'Nested'));
    await createWorkspaceMapperProject(nested, 'map');
    Object.assign(vscode.workspace, {
      workspaceFolders: [logicApp, mapper, vscode.Uri.file(path.dirname(nested.fsPath))].map((uri) => ({
        name: path.basename(uri.fsPath),
        uri,
      })),
    });
    expect((await findMapperProjects()).map((project) => project.uri.fsPath)).toEqual([mapper.fsPath, nested.fsPath]);
  });

  it.each([false, true])(
    'registers the real provider with a frozen context and owns webview/worker resources (explicit resource root: %s)',
    async (explicitRoot) => {
      const hostUri = vscode.Uri.file(path.join(tempDir, 'logic-apps-extension'));
      const resourceRoot = explicitRoot ? vscode.Uri.joinPath(hostUri, 'assets', 'data-mapper-v3') : hostUri;
      const context = {
        extensionUri: hostUri,
        extensionPath: hostUri.fsPath,
        asAbsolutePath: vi.fn((relative: string) => path.join(hostUri.fsPath, relative)),
        subscriptions: [],
        globalState: { get: vi.fn(), update: vi.fn() },
      } as unknown as vscode.ExtensionContext;
      const readProposedApi = vi.fn(() => {
        throw new Error('extensionRuntime API is not enabled');
      });
      Object.defineProperty(context, 'extensionRuntime', { enumerable: true, get: readProposedApi });
      Object.freeze(context);
      const mapUri = await createWorkspaceMapperProject(vscode.Uri.file(path.join(tempDir, 'Maps')), 'OrderMapping');
      const nativeXml = await fs.readFile(mapUri.fsPath, 'utf8');

      registration = explicitRoot
        ? registerEmbeddedMapper(context, 'azureLogicAppsStandard.dataMapperV3', resourceRoot)
        : registerEmbeddedMapper(context, 'azureLogicAppsStandard.dataMapperV3');

      expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledOnce();
      const [viewType, provider, options] = vi.mocked(vscode.window.registerCustomEditorProvider).mock.calls[0];
      expect(viewType).toBe('azureLogicAppsStandard.dataMapperV3');
      expect(provider).toBeInstanceOf(MapEditorProvider);
      expect(options).toEqual({ webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: false });
      const owned = provider as unknown as {
        context: vscode.ExtensionContext;
        compilerWorker: { context: vscode.ExtensionContext };
      };
      expect(owned.context.extensionUri.fsPath).toBe(resourceRoot.fsPath);
      expect(owned.context.extensionPath).toBe(resourceRoot.fsPath);
      expect(owned.context.globalState).toBe(context.globalState);
      expect(owned.context.subscriptions).toBe(context.subscriptions);
      expect(owned.compilerWorker).toBeInstanceOf(CompilerWorkerClient);
      expect(owned.compilerWorker.context).toBe(owned.context);
      for (const relative of [
        path.join('tools', 'compiler-worker', 'runtime', 'win-x64', 'BizTalk.DataMapper.Worker.exe'),
        path.join('tools', 'compiler-worker', 'BizTalk.DataMapper.Worker', 'BizTalk.DataMapper.Worker.csproj'),
      ]) {
        expect(owned.compilerWorker.context.asAbsolutePath(relative)).toBe(path.join(resourceRoot.fsPath, relative));
      }
      expect(context.asAbsolutePath).not.toHaveBeenCalled();

      const onDidReceiveMessage = vi.fn();
      const panel = {
        active: true,
        title: '',
        webview: {
          options: {} as vscode.WebviewOptions,
          html: '',
          cspSource: 'vscode-webview:',
          asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
          onDidReceiveMessage,
          postMessage: vi.fn().mockResolvedValue(true),
        },
        onDidChangeViewState: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDispose: vi.fn(),
      };
      const document = { uri: mapUri, version: 1, getText: () => nativeXml } as vscode.TextDocument;
      await (provider as MapEditorProvider).resolveCustomTextEditor(
        document,
        panel as unknown as vscode.WebviewPanel,
        {} as vscode.CancellationToken
      );
      expect(panel.title).toBe('OrderMapping');
      expect(panel.webview.options.enableScripts).toBe(true);
      expect(panel.webview.options.localResourceRoots?.map((uri) => uri.fsPath)).toEqual([
        path.join(resourceRoot.fsPath, 'out', 'webview'),
        path.join(resourceRoot.fsPath, 'media'),
      ]);
      expect(panel.webview.asWebviewUri).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ fsPath: path.join(resourceRoot.fsPath, 'out', 'webview', 'webview.js') })
      );
      expect(panel.webview.html).toContain(path.join(resourceRoot.fsPath, 'out', 'webview', 'webview.js'));
      await onDidReceiveMessage.mock.calls[0][0]({ type: 'ready' });
      expect(panel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init',
          data: expect.objectContaining({
            map: expect.objectContaining({
              name: 'OrderMapping',
              pages: [{ name: 'Page 1', links: [], functoids: [], id: expect.any(String) }],
            }),
          }),
        })
      );
      expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
      expect(readProposedApi).not.toHaveBeenCalled();
      panel.onDidDispose.mock.calls[0][0]();
    }
  );
});
