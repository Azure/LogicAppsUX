import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  addDataMap,
  createWorkspaceMapperProject,
  findMapperProjects,
  importExistingMap,
  registerEmbeddedMapper,
} from 'btm-data-mapper/embedded';
import { ext } from '../../../extensionVariables';
import {
  createDataMapProject,
  dataMapperV2ViewType,
  dataMapperV3ViewType,
  forgetDataMapToOpen,
  registerDataMapperV3,
  rememberDataMapToOpen,
} from '../dataMapperV3';

vi.mock('btm-data-mapper/embedded', () => ({
  addDataMap: vi.fn(),
  importExistingMap: vi.fn(),
  findMapperProjects: vi.fn().mockResolvedValue([]),
  createWorkspaceMapperProject: vi.fn(),
  registerEmbeddedMapper: vi.fn(),
}));

vi.mock('fs-extra', () => ({ pathExists: vi.fn().mockResolvedValue(true) }));

vi.mock('vscode', () => {
  const file = (filePath: string) => ({
    scheme: 'file',
    fsPath: path.resolve(filePath),
    path: path.resolve(filePath).replace(/\\/g, '/'),
    toString: () => path.resolve(filePath),
  });
  return {
    Uri: {
      file,
      parse: file,
      joinPath: (base: vscode.Uri, ...segments: string[]) => file(path.join(base.fsPath, ...segments)),
    },
    commands: { executeCommand: vi.fn().mockResolvedValue(undefined), registerCommand: vi.fn(() => ({ dispose: vi.fn() })) },
    extensions: { getExtension: vi.fn().mockReturnValue(undefined) },
    window: { showErrorMessage: vi.fn(), showWarningMessage: vi.fn() },
    workspace: {
      onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
      createFileSystemWatcher: vi.fn(() => ({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      })),
      workspaceFile: undefined,
      workspaceFolders: [],
      fs: { stat: vi.fn().mockResolvedValue({ type: 1 }), readFile: vi.fn() },
    },
    FileType: { File: 1, Directory: 2 },
  };
});

describe('embedded Data Mapper v3 host', () => {
  const workspaceFile = vscode.Uri.file(path.resolve('workspaces', 'Orders', 'Orders.code-workspace'));
  const mapUri = vscode.Uri.file(path.resolve('workspaces', 'Orders', 'DataMaps', 'Orders', 'OrderMapping.btm'));
  const pending = new Map<string, unknown>();
  let context: vscode.ExtensionContext;
  let originalContext: vscode.ExtensionContext;
  const editorCommands = () => vi.mocked(vscode.commands.executeCommand).mock.calls.filter(([command]) => command !== 'setContext');
  const projectFoldersContext = 'azureLogicAppsStandard.dataMap.projectFolders';
  const registeredCommand = (suffix: string) => {
    const registration = vi
      .mocked(vscode.commands.registerCommand)
      .mock.calls.find(([id]) => id === `azureLogicAppsStandard.dataMap.${suffix}`);
    if (!registration) {
      throw new Error(`Missing command: ${suffix}`);
    }
    return registration[1];
  };

  const flushStartup = async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    pending.clear();
    vi.mocked(createWorkspaceMapperProject).mockReset();
    vi.mocked(registerEmbeddedMapper).mockReset().mockReturnValue({ dispose: vi.fn() });
    vi.mocked(addDataMap).mockReset().mockResolvedValue(undefined);
    vi.mocked(importExistingMap).mockReset().mockResolvedValue(undefined);
    vi.mocked(findMapperProjects).mockReset().mockResolvedValue([]);
    vi.mocked(vscode.commands.executeCommand).mockReset().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({ type: vscode.FileType.File } as vscode.FileStat);
    context = {
      extensionUri: vscode.Uri.file(path.resolve('extension')),
      subscriptions: [],
      globalState: {
        get: vi.fn((key: string, fallback?: unknown) => pending.get(key) ?? fallback),
        update: vi.fn(async (key: string, value: unknown) => {
          if (value === undefined) {
            pending.delete(key);
          } else {
            pending.set(key, value);
          }
        }),
      },
    } as unknown as vscode.ExtensionContext;
    originalContext = ext.context;
    ext.context = context;
    Object.assign(vscode.workspace, { workspaceFile: undefined, workspaceFolders: [] });
  });

  afterEach(() => {
    for (const subscription of context.subscriptions) {
      subscription.dispose();
    }
    ext.context = originalContext;
  });

  it.each(['Orders.btm', 'Orders.BTM'])('opens the clicked %s in the bundled visual editor', async (name) => {
    registerDataMapperV3(context);
    await flushStartup();
    const uri = vscode.Uri.file(path.join(path.dirname(mapUri.fsPath), name));

    await registeredCommand('openDataMap')(uri);

    expect(editorCommands()).toEqual([['vscode.openWith', uri, dataMapperV3ViewType]]);
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
  });

  it.each(['Orders.lml', 'Orders.LML'])('opens %s in the v2 editor without a Logic App project', async (name) => {
    registerDataMapperV3(context);
    await flushStartup();
    const uri = vscode.Uri.file(path.join(path.dirname(mapUri.fsPath), name));

    await registeredCommand('openDataMap')(uri);

    expect(editorCommands()).toEqual([['vscode.openWith', uri, dataMapperV2ViewType]]);
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
  });

  it.each(['Orders.xsd', 'Orders.txt'])('does not open %s in a map editor', async (name) => {
    registerDataMapperV3(context);
    await flushStartup();

    await registeredCommand('openDataMap')(vscode.Uri.file(path.join(path.dirname(mapUri.fsPath), name)));

    expect(editorCommands()).toEqual([]);
    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
  });

  it('does not open a folder with a BTM suffix', async () => {
    registerDataMapperV3(context);
    await flushStartup();
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({ type: vscode.FileType.Directory } as vscode.FileStat);

    await registeredCommand('openDataMap')(mapUri);

    expect(editorCommands()).toEqual([]);
  });

  it('reports an error opening the selected map', async () => {
    registerDataMapperV3(context);
    await flushStartup();
    vi.mocked(vscode.commands.executeCommand).mockRejectedValueOnce(new Error('Cannot open editor'));

    await registeredCommand('openDataMap')(mapUri);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Cannot open editor'));
  });

  it.each(['addDataMap', 'importDataMap'])(
    'registers an owned %s command and forwards the clicked folder and host settings',
    async (command) => {
      registerDataMapperV3(context);
      await flushStartup();
      const folder = vscode.Uri.file(path.dirname(mapUri.fsPath));
      await registeredCommand(command)(folder);
      const options = { viewType: dataMapperV3ViewType, lmlViewType: dataMapperV2ViewType, requireExistingProject: true };
      if (command === 'addDataMap') {
        expect(addDataMap).toHaveBeenCalledExactlyOnceWith(folder, expect.any(Function), options);
      } else {
        expect(importExistingMap).toHaveBeenCalledExactlyOnceWith(folder, expect.any(Function), context, options);
      }
      const registrationIndex = vi.mocked(vscode.commands.registerCommand).mock.calls.findIndex(([id]) => id.endsWith(command));
      expect(context.subscriptions).toContain(vi.mocked(vscode.commands.registerCommand).mock.results[registrationIndex].value);
      const changed = command === 'addDataMap' ? vi.mocked(addDataMap).mock.calls[0][1] : vi.mocked(importExistingMap).mock.calls[0][1];
      vi.mocked(findMapperProjects).mockClear();
      changed();
      await flushStartup();
      expect(findMapperProjects).toHaveBeenCalledOnce();
      await registeredCommand(command)();
      expect((command === 'addDataMap' ? vi.mocked(addDataMap).mock.calls : vi.mocked(importExistingMap).mock.calls)[1][0]).toBeUndefined();
    }
  );

  it.each(['addDataMap', 'importDataMap'])('reports %s failures through the host without standalone fallback', async (command) => {
    const failure = new Error('No mapper project found');
    vi.mocked(addDataMap).mockRejectedValue(failure);
    vi.mocked(importExistingMap).mockRejectedValue(failure);
    registerDataMapperV3(context);
    await flushStartup();

    await registeredCommand(command)();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining(failure.message));
    expect(editorCommands()).toEqual([]);
  });

  it('initializes normalized mapper paths in a mixed workspace and clears them after folders close', async () => {
    const root = vscode.Uri.file(path.dirname(mapUri.fsPath));
    Object.assign(vscode.workspace, { workspaceFolders: [{ uri: root }, { uri: vscode.Uri.file(path.resolve('LogicApp')) }] });
    vi.mocked(findMapperProjects).mockResolvedValue([
      { name: 'Orders', uri: root },
      { name: 'Orders duplicate', uri: root },
    ]);
    registerDataMapperV3(context);
    await flushStartup();
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('setContext', projectFoldersContext, [
      vscode.Uri.file(root.fsPath).fsPath,
    ]);

    Object.assign(vscode.workspace, { workspaceFolders: [] });
    vi.mocked(findMapperProjects).mockResolvedValue([]);
    const onChanged = vi.mocked(vscode.workspace.onDidChangeWorkspaceFolders).mock.calls[0][0];
    onChanged({ added: [], removed: [] });
    await flushStartup();
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('setContext', projectFoldersContext, []);
  });

  it.each(['onDidCreate', 'onDidChange', 'onDidDelete'] as const)('refreshes mapper detection for marker watcher %s', async (event) => {
    registerDataMapperV3(context);
    await flushStartup();
    const pattern = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.calls[0][0];
    expect(pattern).toContain('*.[bB][tT][mM]');
    expect(pattern).toContain('*.[lL][mM][lL]');
    expect(pattern).toContain('Schemas');
    const watcher = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0].value;
    const root = vscode.Uri.file(path.dirname(mapUri.fsPath));
    vi.mocked(findMapperProjects).mockResolvedValue([{ name: 'Orders', uri: root }]);
    vi.mocked(watcher[event]).mock.calls[0][0](mapUri);
    await flushStartup();
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('setContext', projectFoldersContext, [root.fsPath]);
  });

  it('discards an old detection result after a newer workspace refresh completes', async () => {
    let finishDetection!: (projects: Awaited<ReturnType<typeof findMapperProjects>>) => void;
    vi.mocked(findMapperProjects).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDetection = resolve;
        })
    );
    registerDataMapperV3(context);
    vi.mocked(vscode.workspace.onDidChangeWorkspaceFolders).mock.calls[0][0]({ added: [], removed: [] });
    await flushStartup();
    expect(vscode.commands.executeCommand).toHaveBeenCalledExactlyOnceWith('setContext', projectFoldersContext, []);

    finishDetection([{ name: 'Stale', uri: vscode.Uri.file(path.resolve('Stale')) }]);
    await flushStartup();
    expect(vscode.commands.executeCommand).toHaveBeenCalledExactlyOnceWith('setContext', projectFoldersContext, []);
  });

  it('owns and disposes listeners and watchers and ignores in-flight refreshes after disposal', async () => {
    let finishDetection!: (projects: Awaited<ReturnType<typeof findMapperProjects>>) => void;
    vi.mocked(findMapperProjects).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDetection = resolve;
        })
    );
    registerDataMapperV3(context);
    const watcher = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0].value;
    const listener = vi.mocked(vscode.workspace.onDidChangeWorkspaceFolders).mock.results[0].value;
    expect(context.subscriptions).toContain(watcher);
    expect(context.subscriptions).toContain(listener);
    for (const subscription of context.subscriptions.splice(0)) {
      subscription.dispose();
    }
    expect(watcher.dispose).toHaveBeenCalledOnce();
    expect(listener.dispose).toHaveBeenCalledOnce();
    for (const event of ['onDidCreate', 'onDidChange', 'onDidDelete'] as const) {
      expect(vi.mocked(watcher[event]).mock.results[0].value.dispose).toHaveBeenCalledOnce();
    }
    finishDetection([{ name: 'Late', uri: vscode.Uri.file(path.resolve('Late')) }]);
    await flushStartup();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('reports project detection failures without an unhandled rejection', async () => {
    vi.mocked(findMapperProjects).mockRejectedValueOnce(new Error('Cannot read mapper folders'));
    registerDataMapperV3(context);
    await flushStartup();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Cannot read mapper folders'));
  });

  it('registers the embedded provider with the Logic Apps view type and an owned resource URI', async () => {
    registerDataMapperV3(context);
    await flushStartup();

    expect(dataMapperV3ViewType).toBe('azureLogicAppsStandard.dataMapperV3');
    expect(registerEmbeddedMapper).toHaveBeenCalledOnce();
    const [registeredContext, viewType, resourceRoot, lmlViewType] = vi.mocked(registerEmbeddedMapper).mock.calls[0];
    expect(registeredContext).toBe(context);
    expect(viewType).toBe(dataMapperV3ViewType);
    expect(lmlViewType).toBe(dataMapperV2ViewType);
    if (!resourceRoot) {
      throw new Error('Embedded registration must supply the Logic Apps resource URI');
    }
    expect(resourceRoot.scheme).toBe('file');
    expect(path.relative(context.extensionUri.fsPath, resourceRoot.fsPath)).not.toMatch(/^\.\.(?:[/\\]|$)/);
    expect(path.isAbsolute(path.relative(context.extensionUri.fsPath, resourceRoot.fsPath))).toBe(false);
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    expect(editorCommands()).toEqual([]);
  });

  it('creates a project directly through embedded exports and returns its map URI', async () => {
    const root = vscode.Uri.file(path.dirname(mapUri.fsPath));
    vi.mocked(createWorkspaceMapperProject).mockResolvedValue(mapUri);

    expect(await createDataMapProject(root, 'OrderMapping')).toBe(mapUri);
    expect(createWorkspaceMapperProject).toHaveBeenCalledExactlyOnceWith(root, 'OrderMapping');
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('propagates embedded generation failures for the caller to roll back', async () => {
    const failure = new Error('Embedded generation failed');
    vi.mocked(createWorkspaceMapperProject).mockRejectedValueOnce(failure);

    await expect(createDataMapProject(vscode.Uri.file(path.dirname(mapUri.fsPath)), 'OrderMapping')).rejects.toBe(failure);
    expect(context.globalState.update).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('persists the handoff without opening an editor in the originating window', async () => {
    await rememberDataMapToOpen(workspaceFile, mapUri);

    expect(context.globalState.update).toHaveBeenCalled();
    expect(pending.size).toBeGreaterThan(0);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
  });

  it('opens a pending map in the matching workspace after initialization and consumes it once', async () => {
    await rememberDataMapToOpen(workspaceFile, mapUri);
    Object.assign(vscode.workspace, { workspaceFile });
    const restartedContext = { ...context, subscriptions: [] } as vscode.ExtensionContext;
    ext.context = restartedContext;

    registerDataMapperV3(restartedContext);
    await vi.waitFor(() =>
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        expect.objectContaining({ fsPath: mapUri.fsPath }),
        dataMapperV3ViewType
      )
    );
    await flushStartup();
    vi.mocked(vscode.commands.executeCommand).mockClear();

    registerDataMapperV3(restartedContext);
    await flushStartup();

    expect(editorCommands()).toEqual([]);
    expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
  });

  it.each(['stat', 'openWith'])('retains the pending handoff after %s rejects and opens it on retry', async (stage) => {
    const failure = new Error(`${stage} temporarily unavailable`);
    await rememberDataMapToOpen(workspaceFile, mapUri);
    const stored = [...pending.entries()];
    Object.assign(vscode.workspace, { workspaceFile });
    if (stage === 'stat') {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValueOnce(failure);
    } else {
      vi.mocked(vscode.commands.executeCommand).mockImplementation(async (command) => {
        if (command === 'vscode.openWith') {
          throw failure;
        }
      });
    }

    registerDataMapperV3(context);
    await flushStartup();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining(failure.message));
    expect([...pending.entries()]).toEqual(stored);
    if (stage === 'stat') {
      expect(editorCommands()).toEqual([]);
    }
    vi.mocked(vscode.commands.executeCommand).mockReset().mockResolvedValue(undefined);

    registerDataMapperV3(context);
    await flushStartup();

    expect(editorCommands()).toEqual([['vscode.openWith', expect.objectContaining({ fsPath: mapUri.fsPath }), dataMapperV3ViewType]]);
    expect(pending.size).toBe(0);
  });

  it('keeps the handoff until openWith completes successfully', async () => {
    let finishOpen!: () => void;
    vi.mocked(vscode.commands.executeCommand).mockImplementation(async (command) =>
      command === 'vscode.openWith'
        ? new Promise<void>((resolve) => {
            finishOpen = resolve;
          })
        : undefined
    );
    await rememberDataMapToOpen(workspaceFile, mapUri);
    const stored = [...pending.entries()];
    Object.assign(vscode.workspace, { workspaceFile });

    registerDataMapperV3(context);
    await flushStartup();
    expect(editorCommands()).toHaveLength(1);
    expect([...pending.entries()]).toEqual(stored);

    finishOpen();
    await flushStartup();
    expect(pending.size).toBe(0);
  });

  it('forgets only a pending handoff matching both workspace and map', async () => {
    await rememberDataMapToOpen(workspaceFile, mapUri);
    const stored = [...pending.entries()];
    vi.mocked(context.globalState.update).mockClear();

    await forgetDataMapToOpen(vscode.Uri.file(path.resolve('Other.code-workspace')), mapUri);
    await forgetDataMapToOpen(workspaceFile, vscode.Uri.file(path.resolve('Other.btm')));
    expect([...pending.entries()]).toEqual(stored);
    expect(context.globalState.update).not.toHaveBeenCalled();

    await forgetDataMapToOpen(workspaceFile, mapUri);
    expect(pending.size).toBe(0);
    expect(context.globalState.update).toHaveBeenCalledOnce();
    vi.mocked(context.globalState.update).mockClear();
    await forgetDataMapToOpen(workspaceFile, mapUri);
    expect(context.globalState.update).not.toHaveBeenCalled();
  });

  it('does not clear a newer map handoff when an earlier open finishes', async () => {
    let finishOpen!: () => void;
    vi.mocked(vscode.commands.executeCommand).mockImplementation(async (command) =>
      command === 'vscode.openWith'
        ? new Promise<void>((resolve) => {
            finishOpen = resolve;
          })
        : undefined
    );
    await rememberDataMapToOpen(workspaceFile, mapUri);
    Object.assign(vscode.workspace, { workspaceFile });
    registerDataMapperV3(context);
    await flushStartup();

    await rememberDataMapToOpen(workspaceFile, vscode.Uri.file(path.resolve('Newer.btm')));
    const newer = [...pending.entries()];
    finishOpen();
    await flushStartup();

    expect([...pending.entries()]).toEqual(newer);
  });

  it.each([undefined, vscode.Uri.file(path.resolve('workspaces', 'Other', 'Other.code-workspace'))])(
    'does not consume or cross-open a pending map when the workspace does not match: %s',
    async (currentWorkspace) => {
      await rememberDataMapToOpen(workspaceFile, mapUri);
      const stored = [...pending.entries()];
      Object.assign(vscode.workspace, {
        workspaceFile: currentWorkspace,
        workspaceFolders: [{ uri: vscode.Uri.file(path.dirname(mapUri.fsPath)), name: 'Orders', index: 0 }],
      });

      registerDataMapperV3(context);
      await flushStartup();

      expect(editorCommands()).toEqual([]);
      expect([...pending.entries()]).toEqual(stored);
      Object.assign(vscode.workspace, { workspaceFile });
      registerDataMapperV3(context);
      await vi.waitFor(() =>
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'vscode.openWith',
          expect.objectContaining({ fsPath: mapUri.fsPath }),
          dataMapperV3ViewType
        )
      );
      expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    }
  );
});
