import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { runProjectConsistencyCheck } from '../runProjectConsistencyCheck';
import { ensureProjectFiles } from '../../projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../../projectConsistency/vscodeConsistency';
import { getWorkspaceLogicAppRoots } from '../../utils/workspace';
import { isProjectConsistencyCheckEnabled } from '../../utils/vsCodeConfig/settings';

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

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  isProjectConsistencyCheckEnabled: vi.fn(),
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
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(true);
  });

  it('skips project and VS Code consistency checks when disabled', async () => {
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(false);

    await runProjectConsistencyCheck(context);

    expect(getWorkspaceLogicAppRoots).not.toHaveBeenCalled();
    expect(ensureProjectFiles).not.toHaveBeenCalled();
    expect(ensureVSCodeFiles).not.toHaveBeenCalled();
    expect(probeEvents.record).toHaveBeenCalledWith({ event: 'consistency-check-skipped', reason: 'disabled' });
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
