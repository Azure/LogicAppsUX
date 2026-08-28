import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace } from 'vscode';
import { ext } from '../../../../../extensionVariables';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../utils/workspace', () => ({
  getActiveWorkflowNode: vi.fn(),
  getParentLogicAppRoot: vi.fn(),
}));

vi.mock('../../../../utils/customCodeUtils', () => ({
  customCodeArtifactsExist: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProjectInternal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../utils/vsCodeConfig/settings', () => ({
  shouldAlwaysBuildCustomCode: vi.fn().mockReturnValue(false),
}));

const mockCreate = vi.fn().mockResolvedValue(undefined);

vi.mock('../panels/localDesignerV2Panel', () => ({
  default: class MockLocalDesignerV2Panel {
    create = mockCreate;
  },
}));

vi.mock('../panels/remoteDesignerV2Panel', () => ({
  RemoteDesignerV2Panel: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

import { openDesignerV2 } from '../openDesignerV2';
import { tryBuildCustomCodeFunctionsProjectInternal } from '../../../buildCustomCodeFunctionsProject';
import { customCodeArtifactsExist } from '../../../../utils/customCodeUtils';
import { shouldAlwaysBuildCustomCode } from '../../../../utils/vsCodeConfig/settings';
import { getActiveWorkflowNode, getParentLogicAppRoot } from '../../../../utils/workspace';

describe('openDesignerV2', () => {
  const mockContext = { telemetry: { properties: {} } } as any;
  const projectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).outputChannel = { appendLog: vi.fn() };
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    vi.mocked(getActiveWorkflowNode).mockReturnValue(undefined);
    vi.mocked(getParentLogicAppRoot).mockResolvedValue(projectPath);
  });

  it('skips custom code build when opened with runId (monitoring mode)', async () => {
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri, 'workflows/myWorkflow/runs/run-1');

    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
    expect(customCodeArtifactsExist).not.toHaveBeenCalled();
  });

  it('checks custom code artifacts when opened without runId (editing mode)', async () => {
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(getActiveWorkflowNode).not.toHaveBeenCalled();
    expect(getParentLogicAppRoot).toHaveBeenCalledWith(mockUri.fsPath);
    expect(customCodeArtifactsExist).toHaveBeenCalledWith(projectPath);
    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
  });

  it('builds custom code when artifacts do not exist', async () => {
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(false);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProjectInternal).toHaveBeenCalledWith(expect.any(Object), projectPath);
  });

  it('builds custom code when alwaysBuildCustomCode setting is enabled', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(true);
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProjectInternal).toHaveBeenCalledWith(expect.any(Object), projectPath);
  });

  it('does not build custom code in monitoring mode even with alwaysBuild enabled', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri, 'workflows/myWorkflow/runs/run-1');

    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
  });

  it('logs and returns early when node is undefined', async () => {
    await openDesignerV2(mockContext, undefined);

    expect(getActiveWorkflowNode).toHaveBeenCalledOnce();
    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProjectInternal).not.toHaveBeenCalled();
  });

  it('falls back to the active workflow when no node is supplied', async () => {
    const activeWorkflow = { fsPath: '/test/project/activeWorkflow/workflow.json' } as any;
    vi.mocked(getActiveWorkflowNode).mockReturnValue(activeWorkflow);

    await openDesignerV2(mockContext, undefined);

    expect(getActiveWorkflowNode).toHaveBeenCalledOnce();
    expect(getParentLogicAppRoot).toHaveBeenCalledWith(activeWorkflow.fsPath);
    expect(mockCreate).toHaveBeenCalled();
  });
});
