import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { WorkspaceFolder, Uri } from 'vscode';

vi.mock('../../verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../settings', () => ({
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
}));

vi.mock('../../funcCoreTools/funcVersion', () => ({
  tryParseFuncVersion: vi.fn(),
}));

vi.mock('../verifyTargetFramework', () => ({
  verifyTargetFramework: vi.fn(),
}));

vi.mock('../../commands/initProjectForVSCode/initProjectForVSCode', () => ({
  initProjectForVSCode: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isEmptyString: vi.fn((s: string) => s === '' || s === undefined || s === null),
  isNullOrUndefined: vi.fn((v: unknown) => v === null || v === undefined),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ProjectLanguage: { CSharp: 'C#', JavaScript: 'JavaScript', CustomCode: 'CustomCode' },
}));

import { verifyVSCodeConfigOnActivate } from '../verifyVSCodeConfigOnActivate';
import { tryGetLogicAppProjectRoot } from '../../verifyIsProject';
import { getWorkspaceSetting } from '../settings';
import { tryParseFuncVersion } from '../../funcCoreTools/funcVersion';
import { ext } from '../../../../extensionVariables';

describe('verifyVSCodeConfigOnActivate', () => {
  let mockContext: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).defaultLogicAppPath = '';
    mockContext = {
      telemetry: { properties: {}, suppressIfSuccessful: false },
      errorHandling: { suppressDisplay: false },
      ui: { showWarningMessage: vi.fn() },
    } as unknown as IActionContext;
  });

  function createWorkspaceFolder(fsPath: string): WorkspaceFolder {
    return {
      uri: { fsPath } as Uri,
      name: fsPath.split('/').pop() || '',
      index: 0,
    };
  }

  it('should do nothing when folders is undefined', async () => {
    await verifyVSCodeConfigOnActivate(mockContext, undefined);
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
  });

  it('should do nothing when folders is empty', async () => {
    await verifyVSCodeConfigOnActivate(mockContext, []);
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
  });

  it('should call tryGetLogicAppProjectRoot with suppressPrompt=true', async () => {
    const folder = createWorkspaceFolder('/workspace/myapp');
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);

    await verifyVSCodeConfigOnActivate(mockContext, [folder]);

    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(mockContext, folder, true);
  });

  it('should set ext.defaultLogicAppPath when project is found', async () => {
    const folder = createWorkspaceFolder('/workspace/myapp');
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/workspace/myapp/logicapp');
    vi.mocked(getWorkspaceSetting).mockReturnValue('');
    vi.mocked(tryParseFuncVersion).mockReturnValue(undefined);

    await verifyVSCodeConfigOnActivate(mockContext, [folder]);

    expect(ext.defaultLogicAppPath).toBe('/workspace/myapp/logicapp');
  });

  it('should set telemetry properties on activation', async () => {
    const folder = createWorkspaceFolder('/workspace/myapp');
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);

    await verifyVSCodeConfigOnActivate(mockContext, [folder]);

    expect(mockContext.telemetry.suppressIfSuccessful).toBe(true);
    expect(mockContext.telemetry.properties.isActivationEvent).toBe('true');
    expect(mockContext.errorHandling.suppressDisplay).toBe(true);
  });

  it('should iterate over all workspace folders', async () => {
    const folders = [createWorkspaceFolder('/workspace/app1'), createWorkspaceFolder('/workspace/app2')];
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);

    await verifyVSCodeConfigOnActivate(mockContext, folders);

    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledTimes(2);
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(mockContext, folders[0], true);
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(mockContext, folders[1], true);
  });
});
