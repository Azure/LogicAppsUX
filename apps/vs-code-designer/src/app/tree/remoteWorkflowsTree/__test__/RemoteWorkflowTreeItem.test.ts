import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMsg: string) => defaultMsg,
}));

vi.mock('../../../utils/requestUtils', () => ({
  sendAzureRequest: vi.fn(),
}));

import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { RemoteWorkflowTreeItem } from '../RemoteWorkflowTreeItem';
import { sendAzureRequest } from '../../../utils/requestUtils';

type TestRemoteWorkflowTreeItem = RemoteWorkflowTreeItem & {
  parent: Record<string, any>;
  subscription: Record<string, any>;
  workflowFileContent: Record<string, any>;
};

const createRemoteWorkflowTreeItem = (): TestRemoteWorkflowTreeItem => {
  const item = Object.create(RemoteWorkflowTreeItem.prototype) as TestRemoteWorkflowTreeItem;

  Object.assign(item, {
    name: 'test-workflow',
    subscription: {
      subscriptionId: 'sub-123',
    },
    parent: {
      _context: { telemetry: { properties: {}, measurements: {} } },
      parent: {
        id: '/subscriptions/sub-123/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site',
      },
    },
    workflowFileContent: {
      definition: {
        triggers: {
          When_a_HTTP_request_is_received: {
            kind: 'Http',
            type: 'Request',
          },
          Recurrence: {
            recurrence: {
              frequency: 'Minute',
              interval: 5,
            },
            type: 'Recurrence',
          },
        },
      },
    },
  });

  return item;
};

describe('RemoteWorkflowTreeItem.getCallbackUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the request trigger when building the Azure callback URL', async () => {
    const item = createRemoteWorkflowTreeItem();
    vi.mocked(sendAzureRequest).mockResolvedValue({
      parsedBody: {
        method: 'POST',
        value: 'https://workflow.test/callback?sig=abc123',
      },
    } as any);

    const response = await item.getCallbackUrl(
      item,
      'https://management.azure.com/subscriptions/sub-123/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site/hostruntime/runtime/webhooks/workflow/api/management',
      'Recurrence',
      '2018-11-01'
    );

    expect(sendAzureRequest).toHaveBeenCalledWith(
      '/subscriptions/sub-123/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site/hostruntime/runtime/webhooks/workflow/api/management/workflows/test-workflow/triggers/When_a_HTTP_request_is_received/listCallbackUrl?api-version=2018-11-01',
      item.parent._context,
      HTTP_METHODS.POST,
      item.subscription
    );
    expect(response).toEqual({
      method: 'POST',
      value: 'https://workflow.test/callback?sig=abc123',
    });
  });
});
