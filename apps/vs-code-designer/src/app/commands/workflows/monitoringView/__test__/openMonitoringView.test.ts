import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace, Uri } from 'vscode';
import { ext } from '../../../../../extensionVariables';

const { mockLocalMonitoringConstructor, mockLocalMonitoringCreate, mockRemoteMonitoringCreate } = vi.hoisted(() => ({
  mockLocalMonitoringConstructor: vi.fn(),
  mockLocalMonitoringCreate: vi.fn().mockResolvedValue(undefined),
  mockRemoteMonitoringCreate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('vscode', () => {
  class MockUri {
    public constructor(public readonly fsPath: string) {}

    public static file(filePath: string): MockUri {
      return new MockUri(filePath);
    }
  }

  return {
    Uri: MockUri,
    workspace: {
      getConfiguration: vi.fn(),
    },
  };
});

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../panels/localMonitoringPanel', () => ({
  default: class MockLocalMonitoringPanel {
    public readonly create = mockLocalMonitoringCreate;

    public constructor(...args: unknown[]) {
      mockLocalMonitoringConstructor(...args);
    }
  },
}));

vi.mock('../panels/remoteMonitoringPanel', () => ({
  default: class MockRemoteMonitoringPanel {
    public readonly create = mockRemoteMonitoringCreate;
  },
}));

vi.mock('../../designer-v2/openDesignerV2', () => ({
  openDesignerV2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_name, callback) => callback({ telemetry: { properties: {} } })),
}));

import { openMonitoringView } from '../openMonitoringView';
import { openDesignerV2 } from '../../designer-v2/openDesignerV2';

describe('openMonitoringView', () => {
  const mockContext = { telemetry: { properties: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).outputChannel = { appendLog: vi.fn() };
  });

  it('routes to openDesignerV2 with runId when designer version is 2', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    const mockUri = Uri.file('/test/project/myWorkflow/workflow.json');

    await openMonitoringView(mockContext, mockUri, 'workflows/myWorkflow/runs/08585CU01', '/test/project/myWorkflow/workflow.json');

    expect(openDesignerV2).toHaveBeenCalledWith(mockContext, mockUri, 'workflows/myWorkflow/runs/08585CU01');
    expect(mockLocalMonitoringConstructor).not.toHaveBeenCalled();
  });

  it('routes local codeful workflows to the v1 monitoring panel when designer version is 2', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    const workflowFilePath = '/test/project/workflow.cs';
    const mockUri = Uri.file(workflowFilePath);
    const runId = 'workflows/myWorkflow/runs/08585CU01';

    await openMonitoringView(mockContext, mockUri, runId, workflowFilePath);

    expect(openDesignerV2).not.toHaveBeenCalled();
    expect(mockLocalMonitoringConstructor).toHaveBeenCalledWith(mockContext, runId, workflowFilePath);
    expect(mockLocalMonitoringCreate).toHaveBeenCalledOnce();
  });

  it('continues routing local codeful workflows to the v1 monitoring panel when designer version is 1', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);
    const workflowFilePath = '/test/project/workflow.cs';
    const mockUri = Uri.file(workflowFilePath);
    const runId = 'workflows/myWorkflow/runs/08585CU01';

    await openMonitoringView(mockContext, mockUri, runId, workflowFilePath);

    expect(openDesignerV2).not.toHaveBeenCalled();
    expect(mockLocalMonitoringConstructor).toHaveBeenCalledWith(mockContext, runId, workflowFilePath);
    expect(mockLocalMonitoringCreate).toHaveBeenCalledOnce();
  });

  it('continues routing remote workflows to the v2 designer when designer version is 2', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    const remoteNode = { name: 'myWorkflow' } as any;
    const runId = 'workflows/myWorkflow/runs/08585CU01';

    await openMonitoringView(mockContext, remoteNode, runId, undefined as any);

    expect(openDesignerV2).toHaveBeenCalledWith(mockContext, remoteNode, runId);
    expect(mockLocalMonitoringConstructor).not.toHaveBeenCalled();
    expect(mockRemoteMonitoringCreate).not.toHaveBeenCalled();
  });

  it('logs and returns early when node is undefined', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);

    await openMonitoringView(mockContext, undefined, 'run-id', '/path');

    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(openDesignerV2).not.toHaveBeenCalled();
    expect(mockLocalMonitoringConstructor).not.toHaveBeenCalled();
  });
});
