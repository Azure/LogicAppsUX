import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspace } from 'vscode';
import { ensureProjectFiles } from '../../projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../../projectConsistency/vscodeConsistency';
import { getWorkspaceLogicAppRoots } from '../../utils/workspace';
import { isProjectConsistencyCheckEnabled } from '../../utils/vsCodeConfig/settings';
import { runProjectConsistencyCheck } from '../runProjectConsistencyCheck';

vi.mock('../../projectConsistency/projectFilesConsistency', () => ({
  ensureProjectFiles: vi.fn(),
}));

vi.mock('../../projectConsistency/vscodeConsistency', () => ({
  ensureVSCodeFiles: vi.fn(),
}));

vi.mock('../../utils/workspace', () => ({
  getWorkspaceLogicAppRoots: vi.fn(),
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  isProjectConsistencyCheckEnabled: vi.fn(),
}));

describe('runProjectConsistencyCheck', () => {
  const context = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:\\workspace' }, name: 'workspace', index: 0 }];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['D:\\workspace\\app-one']);
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(true);
  });

  it('skips project and VS Code consistency checks when disabled', async () => {
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(false);

    await runProjectConsistencyCheck(context);

    expect(getWorkspaceLogicAppRoots).not.toHaveBeenCalled();
    expect(ensureProjectFiles).not.toHaveBeenCalled();
    expect(ensureVSCodeFiles).not.toHaveBeenCalled();
  });

  it('checks all discovered projects when enabled', async () => {
    await runProjectConsistencyCheck(context);

    expect(ensureProjectFiles).toHaveBeenCalledWith(context, 'D:\\workspace\\app-one');
    expect(ensureVSCodeFiles).toHaveBeenCalledWith(context, ['D:\\workspace\\app-one']);
  });
});
