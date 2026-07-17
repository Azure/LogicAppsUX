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
  tryBuildCustomCodeFunctionsProject: vi.fn(),
}));

vi.mock('../panels/localDesignerPanel', () => ({
  default: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock('../panels/remoteDesignerPanel', () => ({
  RemoteDesignerPanel: vi.fn().mockImplementation(() => ({ create: vi.fn().mockResolvedValue(undefined) })),
}));

vi.mock('../../designer-v2/openDesignerV2', () => ({
  openDesignerV2: vi.fn().mockResolvedValue(undefined),
}));

import { openDesigner } from '../openDesigner';
import { openDesignerV2 } from '../../designer-v2/openDesignerV2';

describe('openDesigner', () => {
  const mockContext = { telemetry: { properties: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).outputChannel = { appendLog: vi.fn() };
  });

  it('routes to openDesignerV2 when designer version is 2', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn(() => 2) } as any);
    const mockUri = { fsPath: '/test/project/myWorkflow/workflow.json' } as any;

    await openDesigner(mockContext, mockUri);

    expect(openDesignerV2).toHaveBeenCalledWith(mockContext, mockUri);
  });
});
