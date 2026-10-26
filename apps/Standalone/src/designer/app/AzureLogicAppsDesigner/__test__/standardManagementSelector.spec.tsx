// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AzureStandardLogicAppSelector } from '../LogicAppSelectionSetting/AzureStandardLogicAppSelector';

const mocks = vi.hoisted(() => ({
  hostingPlan: 'standard',
  runError: false,
  listRuns: vi.fn(),
  get: vi.fn(),
  hybridGet: vi.fn(),
  queries: [] as { key: unknown[]; run: () => Promise<unknown>; options?: { enabled: boolean } }[],
}));
vi.mock('../../../../environments/environment', () => ({ environment: {} }));
vi.mock('../../../state/workflowLoadingSelectors', () => ({
  useAppId: () => '/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/test/providers/Microsoft.Web/sites/test',
  useWorkflowName: () => 'Order',
  useRunId: () => undefined,
  useIsMonitoringView: () => true,
  useHostingPlan: () => mocks.hostingPlan,
}));
vi.mock('../../../state/workflowLoadingSlice', () => ({}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('../Queries/FetchStandardApps', () => ({ useFetchStandardApps: () => ({ data: [], isLoading: false }) }));
vi.mock('../Queries/FetchHybridApps', () => ({ useFetchHybridApps: () => ({ data: [], isLoading: false }) }));
vi.mock('axios', () => ({ default: { get: mocks.get } }));
vi.mock('../Utilities/HybridAppUtilities', () => ({
  HybridAppUtility: { getProxy: mocks.hybridGet },
  hybridApiVersion: '2023-11-02-preview',
}));
vi.mock('../../DesignerShell/standaloneManagementContext', () => ({
  useStandaloneManagementClient: () => ({ client: { listRuns: mocks.listRuns } }),
}));
vi.mock('../Services/StandardManagement', () => ({
  armOnlyStandardManagement: { listRuns: mocks.listRuns },
  getStandardManagementCacheKey: () => 7,
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (key: unknown[], run: () => Promise<unknown>, options?: { enabled: boolean }) => {
    mocks.queries.push({ key, run, options });
    return {
      data: undefined,
      isLoading: false,
      isError: mocks.runError,
      error: mocks.runError ? new Error('Run enumeration failed.') : undefined,
      refetch: vi.fn(),
    };
  },
}));

describe('existing Azure designer run selector', () => {
  beforeEach(() => {
    mocks.hostingPlan = 'standard';
    mocks.runError = false;
    mocks.queries = [];
    mocks.listRuns.mockReset().mockResolvedValue({ value: [] });
    mocks.get.mockReset().mockResolvedValue({ data: { value: [] } });
    mocks.hybridGet.mockReset().mockResolvedValue({ value: [] });
  });
  afterEach(cleanup);

  it('routes run enumeration through the same named client and partitions the query cache by owner', async () => {
    render(<AzureStandardLogicAppSelector />);
    const query = mocks.queries.find(({ key }) => key[0] === 'getListOfRunInstances');
    expect(query?.options?.enabled).toBe(true);
    expect(query?.key[3]).toBe(7);
    await expect(query?.run()).resolves.toEqual({ value: [] });
    expect(mocks.listRuns).toHaveBeenCalledWith(
      {
        uri: expect.stringContaining('/hostruntime/runtime/webhooks/workflow/api/management/workflows/Order/runs?api-version=2018-11-01'),
      },
      expect.any(Function)
    );
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('retains the original Axios request and raw error when direct management is disabled', async () => {
    mocks.listRuns.mockImplementation((_request, legacyRequest) => legacyRequest());
    const failure = { response: { status: 503, data: { error: { code: 'Unavailable' } } } };
    mocks.get.mockRejectedValueOnce(failure);
    render(<AzureStandardLogicAppSelector />);
    const query = mocks.queries.find(({ key }) => key[0] === 'getListOfRunInstances');
    await expect(query?.run()).rejects.toBe(failure);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('/hostruntime/runtime/webhooks/workflow/api/management/workflows/Order/runs?api-version=2018-11-01'),
      { headers: { Authorization: 'Bearer undefined' } }
    );
  });

  it('retains the original selector UI when run enumeration fails', () => {
    const { container, rerender } = render(<AzureStandardLogicAppSelector />);
    const original = container.innerHTML;
    mocks.runError = true;
    rerender(<AzureStandardLogicAppSelector />);
    expect(container.innerHTML).toBe(original);
    expect(screen.queryByRole('button', { name: 'Retry loading runs' })).toBeNull();
    expect(screen.queryByText(/Unable to load run instances/)).toBeNull();
  });

  it('preserves the excluded ARM workflow inventory route', async () => {
    render(<AzureStandardLogicAppSelector />);
    await mocks.queries.find(({ key }) => key[0] === 'getListOfWorkflows')?.run();
    expect(mocks.get).toHaveBeenCalledWith(expect.stringContaining('/sites/test/workflows?api-version=2018-11-01'), expect.anything());
    expect(mocks.listRuns).not.toHaveBeenCalled();
  });

  it('preserves hybrid proxy routing', async () => {
    mocks.hostingPlan = 'hybrid';
    render(<AzureStandardLogicAppSelector />);
    await mocks.queries.find(({ key }) => key[0] === 'getListOfRunInstances')?.run();
    expect(mocks.hybridGet).toHaveBeenCalledOnce();
    expect(mocks.listRuns).not.toHaveBeenCalled();
  });
});
