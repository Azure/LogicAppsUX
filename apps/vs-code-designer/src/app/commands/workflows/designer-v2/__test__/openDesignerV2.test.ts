import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace } from 'vscode';
import { ext } from '../../../../../extensionVariables';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../utils/workspace', () => ({
  getWorkflowNode: vi.fn((node: any) => node),
}));

vi.mock('../../../../utils/customCodeUtils', () => ({
  customCodeArtifactsExist: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../buildCustomCodeFunctionsProject', () => ({
  tryBuildCustomCodeFunctionsProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../utils/vsCodeConfig/settings', () => ({
  shouldAlwaysBuildCustomCode: vi.fn().mockReturnValue(false),
}));

const { mockCreate, mockConstructor } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue(undefined),
  mockConstructor: vi.fn(),
}));

vi.mock('../panels/localDesignerV2Panel', () => ({
  default: class MockLocalDesignerV2Panel {
    create = mockCreate;
    constructor(...args: unknown[]) {
      mockConstructor(...args);
    }
  },
}));

vi.mock('../panels/remoteDesignerV2Panel', () => ({
  RemoteDesignerV2Panel: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

import { openDesignerV2 } from '../openDesignerV2';
import { tryBuildCustomCodeFunctionsProject } from '../../../buildCustomCodeFunctionsProject';
import { customCodeArtifactsExist } from '../../../../utils/customCodeUtils';
import { shouldAlwaysBuildCustomCode } from '../../../../utils/vsCodeConfig/settings';
import { RemoteWorkflowTreeItem } from '../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { RemoteDesignerV2Panel } from '../panels/remoteDesignerV2Panel';
import { getWorkflowNode } from '../../../../utils/workspace';

describe('openDesignerV2', () => {
  const mockContext = { telemetry: { properties: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkflowNode).mockImplementation((node: any) => node);
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(false);
    vi.mocked(RemoteDesignerV2Panel).mockImplementation(() => ({ create: mockCreate }) as any);
    (ext as any).outputChannel = { appendLog: vi.fn() };
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
  });

  it('skips custom code build when opened with runId (monitoring mode)', async () => {
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri, 'workflows/myWorkflow/runs/run-1');

    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
    expect(customCodeArtifactsExist).not.toHaveBeenCalled();
    expect(mockConstructor).toHaveBeenCalledWith(mockContext, mockUri, 'workflows/myWorkflow/runs/run-1');
  });

  it('passes optional codeful context unchanged only to the local V2 panel', async () => {
    const uri = { fsPath: '/test/project/Program.cs' } as any;
    const monitoring = { workflowName: 'selected', runId: 'run-1' } as any;
    await openDesignerV2(mockContext, uri, 'run-1', monitoring);
    expect(mockConstructor).toHaveBeenCalledExactlyOnceWith(mockContext, uri, 'run-1', monitoring);
    expect(mockConstructor.mock.calls[0][3]).toBe(monitoring);
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(customCodeArtifactsExist).not.toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });

  it('leaves the remote constructor contract unchanged when an optional context is supplied', async () => {
    const remote = Object.create(RemoteWorkflowTreeItem.prototype);
    await openDesignerV2(mockContext, remote, 'run-1', {} as any);
    expect(RemoteDesignerV2Panel).toHaveBeenCalledExactlyOnceWith(mockContext, remote, 'run-1');
    expect(mockConstructor).not.toHaveBeenCalled();
    expect(customCodeArtifactsExist).not.toHaveBeenCalled();
  });

  it('checks custom code artifacts when opened without runId (editing mode)', async () => {
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(customCodeArtifactsExist).toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });

  it('builds custom code when artifacts do not exist', async () => {
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(false);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProject).toHaveBeenCalled();
  });

  it('builds custom code when alwaysBuildCustomCode setting is enabled', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(true);
    vi.mocked(customCodeArtifactsExist).mockResolvedValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri);

    expect(tryBuildCustomCodeFunctionsProject).toHaveBeenCalled();
  });

  it('does not build custom code in monitoring mode even with alwaysBuild enabled', async () => {
    vi.mocked(shouldAlwaysBuildCustomCode).mockReturnValue(true);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesignerV2(mockContext, mockUri, 'workflows/myWorkflow/runs/run-1');

    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });

  it('logs and returns early when node is undefined', async () => {
    const { getWorkflowNode } = await import('../../../../utils/workspace');
    vi.mocked(getWorkflowNode).mockReturnValue(undefined);

    await openDesignerV2(mockContext, undefined);

    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(tryBuildCustomCodeFunctionsProject).not.toHaveBeenCalled();
  });
});
