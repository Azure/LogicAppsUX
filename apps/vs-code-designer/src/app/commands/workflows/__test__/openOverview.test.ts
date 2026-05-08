import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../utils/codeless/common', () => ({
  tryGetWebviewPanel: vi.fn(),
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  getStandardAppData: vi.fn((workflowName: string) => ({
    name: workflowName,
    kind: 'Stateful',
    operationOptions: undefined,
    statelessRunMode: undefined,
  })),
  getWorkflowManagementBaseURI: vi.fn(
    () =>
      'https://management.azure.com/subscriptions/sub-123/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site/hostruntime/runtime/webhooks/workflow/api/management'
  ),
  getAzureConnectorDetailsForLocalProject: vi.fn(),
}));

vi.mock('../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthorizationToken: vi.fn(),
  getAuthorizationTokenFromNode: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('../openMonitoringView/openMonitoringView', () => ({
  openMonitoringView: vi.fn(),
}));

import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { workflowAppApiVersion } from '../../../../constants';
import { openOverview } from '../openOverview';
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';

type MockAzureWorkflowNode = RemoteWorkflowTreeItem & {
  getCallbackUrl: ReturnType<typeof vi.fn>;
  parent: Record<string, any>;
  subscription: Record<string, any>;
  workflowFileContent: Record<string, any>;
};

const requestTriggerName = 'When_a_HTTP_request_is_received';
const recurrenceTriggerName = 'Recurrence';

const definition = {
  triggers: {
    [requestTriggerName]: {
      kind: 'Http',
      type: 'Request',
    },
    [recurrenceTriggerName]: {
      recurrence: {
        frequency: 'Minute',
        interval: 5,
      },
      type: 'Recurrence',
    },
  },
};

const createAzureWorkflowNode = (getCallbackUrl: ReturnType<typeof vi.fn>): MockAzureWorkflowNode => {
  const node = Object.create(RemoteWorkflowTreeItem.prototype) as MockAzureWorkflowNode;

  Object.assign(node, {
    name: 'test-workflow',
    subscription: {
      subscriptionId: 'sub-123',
    },
    parent: {
      access: 'read',
      _context: { telemetry: { properties: {}, measurements: {} } },
      subscription: {
        tenantId: 'tenant-123',
        environment: {
          resourceManagerEndpointUrl: 'https://management.azure.com',
        },
      },
      parent: {
        site: {
          location: 'West US',
          resourceGroup: 'test-rg',
          defaultHostName: 'test-site.azurewebsites.net',
        },
      },
      getArtifacts: vi.fn(),
      getConnectionsData: vi.fn(),
      getParametersData: vi.fn(),
      getManualWorkflows: vi.fn(),
    },
    workflowFileContent: {
      definition,
    },
    getCallbackUrl,
  });

  return node;
};

describe('openOverview', () => {
  let receivedMessageHandler: ((message: any) => Promise<void>) | undefined;
  let disposeHandler: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    receivedMessageHandler = undefined;
    disposeHandler = undefined;
    Object.defineProperty(vscode, 'Uri', {
      configurable: true,
      value: class MockUri {
        public static file(filePath: string) {
          return { fsPath: filePath };
        }
      },
    });
    ext.context = {
      extensionPath: 'D:\\test-extension',
      subscriptions: [],
    } as any;
    ext.extensionVersion = '1.2.3';
  });

  afterEach(() => {
    disposeHandler?.();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes Azure overview with request-trigger callback info and preserves it when refresh lookup fails', async () => {
    const { tryGetWebviewPanel, cacheWebviewPanel } = await import('../../../utils/codeless/common');

    vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);

    const callbackInfo = {
      method: 'POST',
      value: 'https://workflow.test/callback?sig=abc123',
    };

    const getCallbackUrl = vi.fn().mockResolvedValueOnce(callbackInfo).mockResolvedValueOnce(undefined);

    const node = createAzureWorkflowNode(getCallbackUrl);
    const mockPostMessage = vi.fn();
    const mockPanel = {
      active: true,
      reveal: vi.fn(),
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((handler: (message: any) => Promise<void>) => {
          receivedMessageHandler = handler;
        }),
        postMessage: mockPostMessage,
      },
      onDidDispose: vi.fn((handler: () => void) => {
        disposeHandler = handler;
      }),
      iconPath: undefined,
    };

    vi.mocked(vscode.window as any).createWebviewPanel = vi.fn().mockReturnValue(mockPanel);

    await openOverview({ telemetry: { properties: {}, measurements: {} } } as any, node);

    expect(cacheWebviewPanel).toHaveBeenCalled();
    expect(getCallbackUrl).toHaveBeenCalledWith(
      node,
      'https://management.azure.com/subscriptions/sub-123/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site/hostruntime/runtime/webhooks/workflow/api/management',
      requestTriggerName,
      workflowAppApiVersion
    );

    expect(receivedMessageHandler).toBeDefined();
    await receivedMessageHandler?.({ command: ExtensionCommand.initialize });

    expect(mockPostMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.initialize_frame,
      data: expect.objectContaining({
        isLocal: false,
        workflowProperties: expect.objectContaining({
          callbackInfo,
          triggerName: requestTriggerName,
        }),
      }),
    });

    await vi.advanceTimersByTimeAsync(3000);

    const postedCommands = mockPostMessage.mock.calls.map(([message]) => message.command);
    expect(postedCommands).toEqual([ExtensionCommand.initialize_frame]);
  });
});
