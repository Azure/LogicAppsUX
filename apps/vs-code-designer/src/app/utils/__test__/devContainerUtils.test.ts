import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDevContainerWorkspace } from '../devContainerUtils';
import * as vscode from 'vscode';
import * as path from 'path';

// Unmock fs-extra to use real file system operations
vi.unmock('fs-extra');
import * as fse from 'fs-extra';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFile: undefined,
    workspaceFolders: [],
  },
}));

describe('devContainerUtils', () => {
  describe('isDevContainerWorkspace', () => {
    let tempDir: string;

    beforeEach(async () => {
      vi.clearAllMocks();
      // Create a real temp directory for testing
      const tmpBase = process.env.TEMP || process.env.TMP || process.cwd();
      tempDir = await fse.mkdtemp(path.join(tmpBase, 'devcontainer-test-'));
    });

    afterEach(async () => {
      // Clean up temp directory
      if (tempDir) {
        await fse.remove(tempDir);
      }
    });

    it('should return false when no workspace file exists', async () => {
      (vscode.workspace as any).workspaceFile = undefined;

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return false when no workspace folders exist', async () => {
      (vscode.workspace as any).workspaceFile = { fsPath: '/path/to/workspace.code-workspace' };
      (vscode.workspace as any).workspaceFolders = [];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return false when workspace file does not contain devcontainer folder', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      await fse.writeJSON(workspaceFilePath, {
        folders: [{ path: './LogicApp' }, { path: './Functions' }],
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return false when devcontainer folder is listed but devcontainer.json does not exist', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      await fse.writeJSON(workspaceFilePath, {
        folders: [{ path: './.devcontainer' }, { path: './LogicApp' }],
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return true when devcontainer folder is listed and devcontainer.json exists', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      const devcontainerDir = path.join(tempDir, '.devcontainer');
      const devcontainerJsonPath = path.join(devcontainerDir, 'devcontainer.json');

      await fse.ensureDir(devcontainerDir);
      await fse.writeJSON(devcontainerJsonPath, { name: 'Test DevContainer' });
      await fse.writeJSON(workspaceFilePath, {
        folders: [{ path: './.devcontainer' }, { path: './LogicApp' }],
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(true);
    });

    it('should return true when devcontainer folder path is without ./ prefix', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      const devcontainerDir = path.join(tempDir, '.devcontainer');
      const devcontainerJsonPath = path.join(devcontainerDir, 'devcontainer.json');

      await fse.ensureDir(devcontainerDir);
      await fse.writeJSON(devcontainerJsonPath, { name: 'Test DevContainer' });
      await fse.writeJSON(workspaceFilePath, {
        folders: [{ path: '.devcontainer' }, { path: 'LogicApp' }],
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(true);
    });

    it('should return false when workspace file has no folders array', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      await fse.writeJSON(workspaceFilePath, {
        settings: {},
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return false when readJSON throws an error', async () => {
      const workspaceFilePath = path.join(tempDir, 'nonexistent.code-workspace');

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });

    it('should return false when pathExists throws an error', async () => {
      const workspaceFilePath = path.join(tempDir, 'test.code-workspace');
      await fse.writeJSON(workspaceFilePath, {
        folders: [{ path: './.devcontainer' }],
      });

      (vscode.workspace as any).workspaceFile = { fsPath: workspaceFilePath };
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: tempDir } }];

      const result = await isDevContainerWorkspace();

      expect(result).toBe(false);
    });
  });
});
