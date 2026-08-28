import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace } from 'vscode';
import { ext } from '../../../../../extensionVariables';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../utils/workspace', () => ({
  getWorkflowNode: vi.fn((node: any) => node),
  getParentLogicAppRoot: vi.fn(),
}));

vi.mock('../../../../utils/customCodeUtils', () => ({
  customCodeArtifactsExist: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProjectInternal: vi.fn(),
}));

vi.mock('../../../../utils/vsCodeConfig/settings', () => ({
  shouldAlwaysBuildCustomCode: vi.fn().mockReturnValue(false),
}));

const mockCreate = vi.fn().mockResolvedValue(undefined);

vi.mock('../panels/localDesignerPanel', () => ({
  default: class MockLocalDesignerPanel {
    create = mockCreate;
  },
}));

vi.mock('../panels/remoteDesignerPanel', () => ({
  RemoteDesignerPanel: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock('../../designer-v2/openDesignerV2', () => ({
  openDesignerV2: vi.fn().mockResolvedValue(undefined),
}));

import { openDesigner } from '../openDesigner';
import { openDesignerV2 } from '../../designer-v2/openDesignerV2';
import { tryBuildCustomCodeFunctionsProjectInternal } from '../../../buildCustomCodeFunctionsProject';
import { customCodeArtifactsExist } from '../../../../utils/customCodeUtils';
import { shouldAlwaysBuildCustomCode } from '../../../../utils/vsCodeConfig/settings';
import { getParentLogicAppRoot } from '../../../../utils/workspace';

describe('openDesigner', () => {
  const mockContext = { telemetry: { properties: {} } } as any;
  const projectPath = 'D:\\test\\project';

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).outputChannel = { appendLog: vi.fn() };
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);
    vi.mocked(getParentLogicAppRoot).mockResolvedValue(projectPath);
  });

  it('routes to openDesignerV2 when designer version is 2', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    const mockUri = { fsPath: 'D:\\test\\project\\myWorkflow\\workflow.json' } as any;

    await openDesigner(mockContext, mockUri);

    expect(openDesignerV2).toHaveBeenCalledWith(mockContext, mockUri);
  });

  it('builds custom code when alwaysBuildCustomCode setting is enabled', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(true);
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: 'D:\\test\\project\\myWorkflow\\workflow.json' } as any;

    await openDesigner(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProjectInternal).toHaveBeenCalledWith(expect.any(Object), projectPath);
  });

  it('builds custom code when artifacts do not exist', async () => {
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(false);
    const mockUri = { fsPath: 'D:\\test\\project\\myWorkflow\\workflow.json' } as any;

    await openDesigner(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProjectInternal).toHaveBeenCalledWith(expect.any(Object), projectPath);
  });

  it('does not build custom code when artifacts exist and alwaysBuildCustomCode is false', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(false);
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: 'D:\\test\\project\\myWorkflow\\workflow.json' } as any;

    await openDesigner(mockContext, mockUri);

    expect(getParentLogicAppRoot).toHaveBeenCalledWith(mockUri.fsPath);
    expect(customCodeArtifactsExist).toHaveBeenCalledWith(projectPath);
    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
  });
});
