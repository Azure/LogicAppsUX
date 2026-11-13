import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { runProjectConsistencyCheck } from '../runProjectConsistencyCheck';
import { ensureProjectFiles } from '../../projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../../projectConsistency/vscodeConsistency';
import { getWorkspaceLogicAppRoots } from '../../utils/workspace';

const probeEvents = vi.hoisted(() => ({ record: vi.fn() }));

vi.mock('../../projectConsistency/projectFilesConsistency', () => ({
  ensureProjectFiles: vi.fn(),
}));

vi.mock('../../projectConsistency/vscodeConsistency', () => ({
  ensureVSCodeFiles: vi.fn(),
}));

vi.mock('../../utils/workspace', () => ({
  getWorkspaceLogicAppRoots: vi.fn(),
}));

vi.mock('../../utils/regenerationProbe', () => ({
  recordRegenerationEvent: probeEvents.record,
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
  },
}));

describe('runProjectConsistencyCheck', () => {
  const context = {} as IActionContext;
  const projectPaths = ['D:\\workspace\\app-one', 'D:\\workspace\\app-two'];

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:\\workspace' }, name: 'workspace', index: 0 }];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(projectPaths);
  });

  it('forwards the workspace invocation origin without serializing existing checks', async () => {
    await runProjectConsistencyCheck(context, 'workspace-change');

    expect(ensureProjectFiles).toHaveBeenCalledTimes(projectPaths.length);
    expect(ensureVSCodeFiles).toHaveBeenCalledExactlyOnceWith(context, projectPaths, 'workspace-change');
  });

  it('uses the explicit command origin by default', async () => {
    await runProjectConsistencyCheck(context);

    expect(ensureVSCodeFiles).toHaveBeenCalledExactlyOnceWith(context, projectPaths, 'explicit-consistency-command');
  });
});
