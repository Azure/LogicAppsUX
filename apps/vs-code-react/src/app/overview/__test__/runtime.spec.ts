import { describe, expect, it, vi } from 'vitest';
import { isOverviewRuntimeAvailable, shouldShowLocalDebugError } from '../runtime';

const { mockIsRuntimeUp } = vi.hoisted(() => ({
  mockIsRuntimeUp: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isRuntimeUp: mockIsRuntimeUp,
}));

describe('overview runtime helpers', () => {
  it('delegates to the local runtime probe for local workflows', async () => {
    mockIsRuntimeUp.mockResolvedValue(true);

    await expect(
      isOverviewRuntimeAvailable({
        apiVersion: '2018-11-01',
        baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management',
        isLocal: true,
      })
    ).resolves.toBe(true);

    expect(mockIsRuntimeUp).toHaveBeenCalledWith('http://localhost:7071/runtime/webhooks/workflow/api/management');
  });

  it('treats remote workflows as available when callback info exists', async () => {
    await expect(
      isOverviewRuntimeAvailable({
        apiVersion: '2018-11-01',
        baseUrl:
          'https://management.azure.com/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test/hostruntime/runtime/webhooks/workflow/api/management',
        callbackInfo: {
          method: 'POST',
          value: 'https://workflow.test/run',
        },
        isLocal: false,
      })
    ).resolves.toBe(true);
  });

  it('uses the authenticated HTTP client for remote workflows without callback info', async () => {
    const httpClient = {
      get: vi.fn().mockResolvedValue({}),
    };

    await expect(
      isOverviewRuntimeAvailable({
        apiVersion: '2018-11-01',
        baseUrl:
          'https://management.azure.com/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test/hostruntime/runtime/webhooks/workflow/api/management',
        httpClient: httpClient as any,
        isLocal: false,
      })
    ).resolves.toBe(true);

    expect(httpClient.get).toHaveBeenCalledWith({
      uri: 'https://management.azure.com/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test/hostruntime/runtime/webhooks/workflow/api/management/operationGroups',
      queryParameters: {
        'api-version': '2018-11-01',
      },
    });
  });

  it('returns false for remote workflows when neither callback info nor the probe succeeds', async () => {
    const httpClient = {
      get: vi.fn().mockRejectedValue(new Error('forbidden')),
    };

    await expect(
      isOverviewRuntimeAvailable({
        apiVersion: '2018-11-01',
        baseUrl:
          'https://management.azure.com/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test/hostruntime/runtime/webhooks/workflow/api/management',
        httpClient: httpClient as any,
        isLocal: false,
      })
    ).resolves.toBe(false);
  });

  it('only shows the debug-required message for local workflows', () => {
    expect(shouldShowLocalDebugError(true, false)).toBe(true);
    expect(shouldShowLocalDebugError(false, false)).toBe(false);
    expect(shouldShowLocalDebugError(true, true)).toBe(false);
  });
});
