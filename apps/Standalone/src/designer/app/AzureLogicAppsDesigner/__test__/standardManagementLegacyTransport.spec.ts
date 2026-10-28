import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armOnlyStandardManagement } from '../Services/StandardManagement';

const mocks = vi.hoisted(() => ({ adapter: vi.fn() }));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  actual.default.defaults.adapter = mocks.adapter;
  return actual;
});
vi.mock('../../../../environments/environment', () => ({ environment: { armToken: 'synthetic-arm-token' } }));
vi.mock('@microsoft/logic-apps-shared', async () => ({
  ...(await import('../../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/standard/management')),
}));

const uri =
  'https://management.azure.com/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/sites/app/hostruntime/runtime/webhooks/workflow/api/management/workflows/Order/runs';
const body = { error: { code: 'OriginalError', message: 'Synthetic ARM failure' } };

function response(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return { config, status, data, headers: {}, statusText: String(status) };
}

describe('disabled management uses the original Axios transport', () => {
  beforeEach(() => {
    mocks.adapter.mockReset();
  });
  afterEach(() => {
    expect(axios.defaults.adapter).toBe(mocks.adapter);
  });

  it('retains all three existing retries for a transient GET failure', async () => {
    mocks.adapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      if (mocks.adapter.mock.calls.length < 4) {
        throw new AxiosError('Synthetic unavailable', 'ERR_BAD_RESPONSE', config, undefined, response(config, 503, body));
      }
      return response(config, 200, { value: [] });
    });
    await expect(armOnlyStandardManagement.listRuns({ uri })).resolves.toEqual({ value: [] });
    expect(mocks.adapter).toHaveBeenCalledTimes(4);
    expect(mocks.adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer synthetic-arm-token');
  });

  it('retains legacy POST error-body rejection without retrying', async () => {
    mocks.adapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Synthetic denied', 'ERR_BAD_REQUEST', config, undefined, response(config, 403, body));
    });
    await expect(armOnlyStandardManagement.cancelRun({ uri: `${uri}/run/cancel` })).rejects.toBe(body);
    expect(mocks.adapter).toHaveBeenCalledOnce();
    const config = mocks.adapter.mock.calls[0][0];
    expect(config.headers.get('Content-Type')).toBe('application/json');
    expect(config.headers.get('x-ms-user-agent')).toBe('LogicAppsDesigner/(host localdesigner)');
  });
});
