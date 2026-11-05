import { describe, test, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  createWorkspaceMapperProject,
  getDuplicateSafeName,
  getWorkspaceRoot,
  getWorkspaceRootForMap,
  isMapperProject,
  mapperProjectFoldersContext,
  updateMapperProjectContext,
  validateWorkspaceName,
} from '../src/workspaceStructure';
import manifest from '../package.json';
import { BtmSerializer } from '../src/schema/btmSerializer';

describe('data map workspace structure', () => {
  test.each([
    [['Schemas'], false],
    [['Schemas', '__generated'], true],
    [['OrderMapping.btm'], true],
    [['OrderMapping.lml'], true],
    [['host.json', 'Artifacts'], false],
  ])('recognizes mapper project markers without treating every Schemas folder as a project: %j', async (names, expected) => {
    vi.spyOn(vscode.workspace.fs, 'readDirectory').mockResolvedValue(
      names.map((name): [string, vscode.FileType] => [name, name.includes('.') ? vscode.FileType.File : vscode.FileType.Directory])
    );
    expect(await isMapperProject(vscode.Uri.file('/workspaces/Orders'))).toBe(expected);
    vi.restoreAllMocks();
  });

  test('contributes exactly the three mapper project actions using project-path membership', () => {
    const actions = manifest.contributes.menus['explorer/context'].filter((entry) =>
      entry.when.includes('resourcePath in biztalkDataMapper.projectFolders')
    );
    expect(actions.map((entry) => entry.command)).toEqual([
      'biztalkDataMapper.addDataMap',
      'biztalkDataMapper.importExistingMap',
      'biztalkDataMapper.publishArtifacts',
    ]);
    expect(actions.every((entry) => entry.when.includes('explorerResourceIsFolder'))).toBe(true);
  });

  test('sets exact project paths and clears them after workspace folders close', async () => {
    const previousFolders = vscode.workspace.workspaceFolders;
    const root = vscode.Uri.file('/workspaces/Maps');
    const unrelated = vscode.Uri.file('/workspaces/LogicApp');
    Object.assign(vscode.workspace, {
      workspaceFolders: [
        { uri: root, name: 'Maps' },
        { uri: unrelated, name: 'LogicApp' },
      ],
    });
    vi.spyOn(vscode.workspace.fs, 'readDirectory').mockImplementation(async (uri) =>
      uri.fsPath === root.fsPath ? [['OrderMapping.btm', vscode.FileType.File]] : []
    );
    const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
    await updateMapperProjectContext();
    expect(executeCommand).toHaveBeenCalledWith('setContext', mapperProjectFoldersContext, [root.fsPath]);
    Object.assign(vscode.workspace, { workspaceFolders: [] });
    await updateMapperProjectContext();
    expect(executeCommand).toHaveBeenLastCalledWith('setContext', mapperProjectFoldersContext, []);
    Object.assign(vscode.workspace, { workspaceFolders: previousFolders });
    vi.restoreAllMocks();
  });

  test('creates a named v3 map without prompting or opening an editor', async () => {
    const showInputBox = vi.spyOn(vscode.window, 'showInputBox');
    const executeCommand = vi.spyOn(vscode.commands, 'executeCommand');
    vi.spyOn(vscode.workspace.fs, 'readDirectory').mockResolvedValue([]);
    vi.spyOn(vscode.workspace.fs, 'createDirectory').mockResolvedValue(undefined);
    const writeFile = vi.spyOn(vscode.workspace.fs, 'writeFile').mockResolvedValue(undefined);
    const root = vscode.Uri.file('/workspaces/Orders/DataMaps');
    const map = await createWorkspaceMapperProject(root, 'OrderMapping');
    expect(map.fsPath).toBe(vscode.Uri.joinPath(root, 'OrderMapping.btm').fsPath);
    expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: vscode.Uri.joinPath(root, 'Schemas').fsPath })
    );
    expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: vscode.Uri.joinPath(root, '__generated').fsPath })
    );
    const reopened = new BtmSerializer().deserialize(Buffer.from(writeFile.mock.calls[0][1]).toString('utf8'));
    expect(reopened.name).toBe('OrderMapping');
    expect(reopened.pages).toHaveLength(1);
    expect(showInputBox).not.toHaveBeenCalled();
    expect(executeCommand).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  test('rejects invalid names before creating mapper folders', async () => {
    vi.spyOn(vscode.workspace.fs, 'readDirectory').mockResolvedValue([]);
    const createDirectory = vi.spyOn(vscode.workspace.fs, 'createDirectory');
    await expect(createWorkspaceMapperProject(vscode.Uri.file('/workspaces/Orders'), '../outside')).rejects.toThrow('valid file name');
    expect(createDirectory).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  test('allocates duplicate-safe map names case-insensitively', () => {
    expect(getDuplicateSafeName('map', '.btm', [])).toBe('map.btm');
    expect(getDuplicateSafeName('map', '.btm', ['map.btm'])).toBe('map(1).btm');
    expect(getDuplicateSafeName('map', '.btm', ['MAP.BTM', 'map(1).btm', 'map(2).btm'])).toBe('map(3).btm');
    expect(getDuplicateSafeName('map', '.lml', ['map.btm'])).toBe('map.lml');
    expect(getDuplicateSafeName('map', '.lml', ['MAP.LML', 'map.btm'])).toBe('map(1).lml');
  });

  test.each(['', '   ', '.', '..', 'bad/name', 'bad\\name', 'bad:name', 'trailing.', 'trailing ', 'CON', 'nul.txt', 'COM1'])(
    'rejects invalid workspace name %j',
    (name) => {
      expect(validateWorkspaceName(name)).toBeDefined();
    }
  );

  test('accepts a valid workspace name', () => {
    expect(validateWorkspaceName('Customer Maps')).toBeUndefined();
    expect(validateWorkspaceName('Customer.Maps')).toBeUndefined();
  });

  test('keeps dotted workspace folders as roots', () => {
    const workspaceUri = vscode.Uri.parse('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');

    expect(getWorkspaceRoot(workspaceUri).toString()).toBe(workspaceUri.toString());
  });

  test.each(['btm', 'lml'])('preserves the URI scheme when finding a %s workspace root', (extension) => {
    const mapUri = vscode.Uri.parse(`vscode-remote://ssh-remote+host/workspaces/Customer.Maps/map.${extension}`);

    expect(getWorkspaceRoot(mapUri).toString()).toBe('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');
    expect(getWorkspaceRootForMap(mapUri).toString()).toBe('vscode-remote://ssh-remote+host/workspaces/Customer.Maps');
  });
});
