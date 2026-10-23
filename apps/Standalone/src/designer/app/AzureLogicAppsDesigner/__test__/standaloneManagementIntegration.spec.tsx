// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useAzureStandardManagement } from '../Services/StandardManagement';
import { useStandaloneStandardManagement } from '../../DesignerShell/useStandaloneStandardManagement';
import { DesignerWrapper as DesignerV1 } from '../../DesignerShell/designer';
import { DesignerWrapper as DesignerV2 } from '../../DesignerShell/designerV2';
import { setArmAuthenticationToken } from '../../../../environments/armAuthentication';
import { StandaloneStandardManagementProvider } from '../../DesignerShell/StandaloneStandardManagementProvider';
import { useStandaloneManagementClient } from '../../DesignerShell/standaloneManagementContext';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  fetch: vi.fn(),
  dispatch: vi.fn(),
  options: { enableStandardDirectManagement: false, standardManagementIssuerFailureBackoffMs: 10_000 },
  hostingPlan: 'standard',
  isLocal: false,
  discovery: { data: { properties: { defaultHostName: 'test.azurewebsites.net' } }, isError: false } as {
    data?: { properties: { defaultHostName?: string } };
    isError: boolean;
  },
}));

vi.mock('axios', () => ({
  default: { get: mocks.get, post: mocks.post, create: () => ({ get: mocks.get, post: mocks.post }) },
}));
vi.mock('axios-retry', () => ({ default: vi.fn() }));
vi.mock('../../../../environments/environment', () => ({
  environment: {},
  loadToken: vi.fn(),
  loadSubscriptionIds: vi.fn(),
}));
vi.mock('@microsoft/logic-apps-shared', async () => ({
  ...(await import('../../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/standard/management')),
}));
vi.mock('@microsoft/logic-apps-designer', () => ({ ReactQueryProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@microsoft/logic-apps-designer-v2', () => ({ ReactQueryProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isLoading: false }) }));
vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ search: '' }) }));
vi.mock('../../DesignerShell/workflowExtractionRoute', () => ({ getWorkflowExtractionRoute: () => ({ enabled: false }) }));
vi.mock('../../../state/workflowLoadingSelectors', () => ({
  useAppId: () => resourceId,
  useHostOptions: () => mocks.options,
  useHostingPlan: () => mocks.hostingPlan,
  useIsLocal: () => mocks.isLocal,
  useResourcePath: () => '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test/workflows/Order',
  useQueryCachePersist: () => false,
}));
vi.mock('../Services/WorkflowAndArtifacts', () => ({
  useWorkflowApp: () => mocks.discovery,
}));
vi.mock('../../../state/workflowLoadingSlice', () => ({
  setHostOptions: (payload: Record<string, unknown>) => ({ payload }),
}));
vi.mock('../../../components/settings_box', () => ({ SettingsBox: () => null }));
vi.mock('../../LocalDesigner/localDesigner', () => ({ LocalDesigner: () => null }));
vi.mock('../../LocalDesigner/localDesignerV2', () => ({ LocalDesigner: () => null }));
vi.mock('../laDesignerConsumption', () => ({ default: () => null }));
vi.mock('../laDesignerConsumptionV2', () => ({ default: () => null }));
vi.mock('../laDesigner', () => ({
  default: ({ managementHost }: { managementHost?: unknown }) => <div data-testid="designer">{managementHost ? 'direct' : 'ARM'}</div>,
}));
vi.mock('../laDesignerV2', () => ({
  default: ({ managementHost }: { managementHost?: unknown }) => <div data-testid="designer">{managementHost ? 'direct' : 'ARM'}</div>,
}));

const resourceId = '/subscriptions/test/resourceGroups/test/providers/Microsoft.Web/sites/test';
const armBase = `https://management.azure.com${resourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
const discovery = { resourceId, runtimeHostName: 'test.azurewebsites.net', isHybrid: false };

function credential(account = 'principal'): string {
  return `e30.${btoa(JSON.stringify({ tid: 'tenant', oid: account, iss: 'https://sts.windows.net/tenant/', exp: Date.now() / 1000 + 300 }))}.fixture`;
}

function envelope() {
  const seconds = Math.floor(Date.now() / 1000) + 300;
  return {
    endpoint: 'https://test.azurewebsites.net/runtime/webhooks/workflow/api/management/v1',
    extensionCode: 'synthetic-extension',
    accessToken: `${seconds.toString(16)}.${'A'.repeat(43)}`,
    expiresOn: new Date(seconds * 1000).toISOString().replace('.000Z', 'Z'),
  };
}

function useConfiguredClient() {
  const { managementHost, error } = useStandaloneStandardManagement();
  const client = useAzureStandardManagement(discovery, managementHost);
  return { client, error, managementHost };
}

describe('existing designer direct-management integration', () => {
  beforeEach(() => {
    mocks.options = { enableStandardDirectManagement: false, standardManagementIssuerFailureBackoffMs: 10_000 };
    mocks.hostingPlan = 'standard';
    mocks.isLocal = false;
    mocks.discovery = { data: { properties: { defaultHostName: 'test.azurewebsites.net' } }, isError: false };
    mocks.get.mockReset().mockResolvedValue({ data: { name: 'ARM-run' } });
    mocks.post.mockReset().mockResolvedValue({ data: {} });
    mocks.fetch.mockReset().mockImplementation(async () => new Response(JSON.stringify({ name: 'direct-run' }), { status: 200 }));
    mocks.dispatch.mockReset().mockImplementation(({ payload }) => {
      mocks.options = { ...mocks.options, ...payload };
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', mocks.fetch);
    setArmAuthenticationToken(credential());
  });
  afterEach(() => {
    cleanup();
    setArmAuthenticationToken(undefined);
    vi.unstubAllGlobals();
  });

  it('switches actual requests from ARM to issuance/direct/cache reuse and back to ARM', async () => {
    const { result, rerender } = renderHook(useConfiguredClient);
    const request = { uri: `${armBase}/workflows/Order/runs/run?api-version=2020-06-01` };
    await expect(result.current.client.getRun(request)).resolves.toEqual({ name: 'ARM-run' });
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.options = { ...mocks.options, enableStandardDirectManagement: true };
    mocks.get.mockResolvedValueOnce({ data: envelope() });
    rerender();
    await expect(result.current.client.getRun(request)).resolves.toEqual({ name: 'direct-run' });
    await result.current.client.getRun(request);
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.get.mock.calls[1][0]).toContain('/tokens/reader');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(String(mocks.fetch.mock.calls[0][0])).toContain(
      'https://test.azurewebsites.net/runtime/webhooks/workflow/api/management/v1/workflows/Order/runs/run'
    );
    mocks.options = { ...mocks.options, enableStandardDirectManagement: false };
    rerender();
    await expect(result.current.client.getRun(request)).resolves.toEqual({ name: 'ARM-run' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.get).toHaveBeenCalledTimes(3);
  });

  it('shares Contributor issuance across separate named designer operations', async () => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.post.mockResolvedValueOnce({ data: envelope() });
    const { result } = renderHook(useConfiguredClient);
    await result.current.client.validateWorkflow({ uri: `${armBase}/workflows/Order/validate`, content: { properties: {} } });
    await result.current.client.listMcpServers({ uri: `${armBase}/listMcpServers` });
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post.mock.calls[0][0]).toContain('/getContributorToken');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('shares one root-owned client across selector and designer consumers', async () => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.get.mockResolvedValueOnce({ data: envelope() });
    const Wrapper = ({ children }: { children: ReactNode }) => {
      const { managementHost } = useStandaloneStandardManagement();
      return <StandaloneStandardManagementProvider configuration={managementHost}>{children}</StandaloneStandardManagementProvider>;
    };
    const { result } = renderHook(() => ({ selector: useStandaloneManagementClient(), designer: useStandaloneManagementClient() }), {
      wrapper: Wrapper,
    });
    expect(result.current.selector.client).toBe(result.current.designer.client);
    await result.current.selector.client!.listRuns({ uri: `${armBase}/workflows/Order/runs` });
    await result.current.designer.client!.getRun({ uri: `${armBase}/workflows/Order/runs/run` });
    expect(mocks.get).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects held issuance when the loaded Azure account changes', async () => {
    mocks.options.enableStandardDirectManagement = true;
    let release!: (value: unknown) => void;
    mocks.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const { result } = renderHook(useConfiguredClient);
    const first = result.current.client;
    const pending = first.getRun({ uri: `${armBase}/workflows/Order/runs/run` });
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    const rejection = expect(pending).rejects.toMatchObject({ error: { code: 'ManagementContextChanged' } });
    act(() => setArmAuthenticationToken(credential('other-principal')));
    release({ data: envelope() });
    await rejection;
    expect(result.current.client).not.toBe(first);
    expect(result.current.managementHost?.principalId).toBe('other-principal');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['V1', DesignerV1],
    ['V2', DesignerV2],
  ] as const)('wires programmatic configuration into the existing %s shell without new controls', (_, Designer) => {
    const { rerender } = render(<Designer />);
    expect(screen.getByTestId('designer').textContent).toBe('ARM');
    mocks.options.enableStandardDirectManagement = true;
    rerender(<Designer />);
    expect(screen.getByTestId('designer').textContent).toBe('direct');
    mocks.options.enableStandardDirectManagement = false;
    rerender(<Designer />);
    expect(screen.getByTestId('designer').textContent).toBe('ARM');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it.each([
    ['V1', DesignerV1],
    ['V2', DesignerV2],
  ] as const)('retains the existing %s designer with ARM routing when authentication is unavailable', (_, Designer) => {
    mocks.options.enableStandardDirectManagement = true;
    setArmAuthenticationToken(undefined);
    render(<Designer />);
    expect(screen.getByTestId('designer').textContent).toBe('ARM');
    expect(screen.queryByText(/Sign in to Azure/)).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('original ARM route'), expect.stringContaining('Sign in'));
  });

  it.each([
    ['pending', undefined, false],
    ['failed', undefined, true],
    ['missing hostname', { properties: {} }, false],
  ] as const)('retains the existing designer and original requests while discovery is %s', async (_, data, isError) => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.discovery = { data, isError };
    const Wrapper = ({ children }: { children: ReactNode }) => {
      const { managementHost } = useStandaloneStandardManagement();
      return <StandaloneStandardManagementProvider configuration={managementHost}>{children}</StandaloneStandardManagementProvider>;
    };
    const { result } = renderHook(useStandaloneManagementClient, { wrapper: Wrapper });
    await expect(result.current.client!.getRun({ uri: `${armBase}/workflows/Order/runs/run` })).resolves.toEqual({ name: 'ARM-run' });
    expect(mocks.fetch).not.toHaveBeenCalled();
    render(<DesignerV1 />);
    expect(screen.getByTestId('designer')).toBeTruthy();
    expect(screen.queryByText(/Discovering the trusted app/)).toBeNull();
  });

  it('leaves hybrid apps on their existing route', () => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.hostingPlan = 'hybrid';
    render(<DesignerV2 />);
    expect(screen.getByTestId('designer').textContent).toBe('ARM');
  });

  it.each(['local', 'consumption', 'hybrid'])('does not configure direct management or report authentication errors for %s', (host) => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.isLocal = host === 'local';
    mocks.hostingPlan = host === 'local' ? 'standard' : host;
    setArmAuthenticationToken(undefined);
    const { result } = renderHook(useStandaloneStandardManagement);
    expect(result.current.managementHost).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('reports invalid retry configuration instead of silently selecting ARM', () => {
    mocks.options.enableStandardDirectManagement = true;
    mocks.options.standardManagementIssuerFailureBackoffMs = 0;
    const { result } = renderHook(useConfiguredClient);
    expect(result.current.error).toContain('positive issuer retry delay');
    expect(result.current.managementHost).toBeUndefined();
  });
});
