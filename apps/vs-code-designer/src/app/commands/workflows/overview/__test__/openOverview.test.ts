import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const mocks = vi.hoisted(() => {
  class MockUri {
    public fsPath: string;
    public constructor(fsPath: string) {
      this.fsPath = fsPath;
    }
    public static file(fsPath: string): MockUri {
      return new MockUri(fsPath);
    }
    public toString(): string {
      return this.fsPath;
    }
  }

  class MockRemoteWorkflowTreeItem {}

  return {
    MockUri,
    MockRemoteWorkflowTreeItem,
    getWorkflowNode: vi.fn((node: any) => node),
    localCreate: vi.fn().mockResolvedValue(undefined),
    codefulCreate: vi.fn().mockResolvedValue(undefined),
    remoteCreate: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('vscode', () => ({
  Uri: mocks.MockUri,
}));

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem', () => ({
  RemoteWorkflowTreeItem: mocks.MockRemoteWorkflowTreeItem,
}));

vi.mock('../../../../utils/workspace', () => ({
  getWorkflowNode: mocks.getWorkflowNode,
}));

vi.mock('../panels/localOverviewPanel', () => ({
  default: class {
    create = mocks.localCreate;
  },
}));

vi.mock('../panels/localCodefulOverviewPanel', () => ({
  default: class {
    create = mocks.codefulCreate;
  },
}));

vi.mock('../panels/remoteOverviewPanel', () => ({
  default: class {
    create = mocks.remoteCreate;
  },
}));

import { openOverview } from '../openOverview';

const context = { telemetry: { properties: {}, measurements: {} } } as any;

describe('openOverview routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWorkflowNode.mockImplementation((node: any) => node);
  });

  it('routes to LocalOverviewPanel for codeless workflow.json files', async () => {
    const node = vscode.Uri.file('D:\\project\\my-workflow\\workflow.json');
    await openOverview(context, node as any);

    expect(mocks.localCreate).toHaveBeenCalled();
    expect(mocks.codefulCreate).not.toHaveBeenCalled();
    expect(mocks.remoteCreate).not.toHaveBeenCalled();
  });

  it('routes to LocalCodefulOverviewPanel for .cs files', async () => {
    const node = vscode.Uri.file('D:\\project\\Workflows.cs');
    await openOverview(context, node as any);

    expect(mocks.codefulCreate).toHaveBeenCalled();
    expect(mocks.localCreate).not.toHaveBeenCalled();
    expect(mocks.remoteCreate).not.toHaveBeenCalled();
  });

  it('routes to RemoteOverviewPanel for RemoteWorkflowTreeItem', async () => {
    const node = new mocks.MockRemoteWorkflowTreeItem();
    await openOverview(context, node as any);

    expect(mocks.remoteCreate).toHaveBeenCalled();
    expect(mocks.localCreate).not.toHaveBeenCalled();
    expect(mocks.codefulCreate).not.toHaveBeenCalled();
  });

  it('logs and returns early when workflow node is not found', async () => {
    mocks.getWorkflowNode.mockReturnValue(undefined);
    await openOverview(context, undefined);

    expect(mocks.localCreate).not.toHaveBeenCalled();
    expect(mocks.codefulCreate).not.toHaveBeenCalled();
    expect(mocks.remoteCreate).not.toHaveBeenCalled();
  });
});
