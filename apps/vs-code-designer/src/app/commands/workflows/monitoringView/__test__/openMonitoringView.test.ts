import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace, Uri } from 'vscode';
import { ext } from '../../../../../extensionVariables';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../panels/localMonitoringPanel', () => ({
  default: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock('../panels/remoteMonitoringPanel', () => ({
  default: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock('../../designer-v2/openDesignerV2', () => ({
  openDesignerV2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(async (_name, callback) => callback({ telemetry: { properties: {} } })),
}));

import { openMonitoringView } from '../openMonitoringView';
import { openDesignerV2 } from '../../designer-v2/openDesignerV2';
import LocalMonitoringPanel from '../panels/localMonitoringPanel';

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
    expect(LocalMonitoringPanel).not.toHaveBeenCalled();
  });

  it('logs and returns early when node is undefined', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 1) } as any);

    await openMonitoringView(mockContext, undefined, 'run-id', '/path');

    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    expect(openDesignerV2).not.toHaveBeenCalled();
    expect(LocalMonitoringPanel).not.toHaveBeenCalled();
  });
});
