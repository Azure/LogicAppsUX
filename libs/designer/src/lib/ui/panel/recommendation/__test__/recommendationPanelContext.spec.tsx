// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage }),
}));

vi.mock('../../../../core/actions/bjsworkflow/add', () => ({
  addOperation: vi.fn((payload: unknown) => ({ type: 'addOperation', payload })),
}));

vi.mock('../../../../core/queries/browse', () => ({
  useAllConnectors: vi.fn(),
  useAllOperations: vi.fn(),
  useMcpServersQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useOperationsByConnector: vi.fn(),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useHostOptions: vi.fn(() => ({ displayRuntimeInfo: false })),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelFavoriteOperations: vi.fn(() => []),
  useDiscoveryPanelIsAddingTrigger: vi.fn(() => false),
  useDiscoveryPanelIsParallelBranch: vi.fn(() => false),
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({ graphId: 'root' })),
  useDiscoveryPanelSelectedOperationGroupId: vi.fn(),
  useIsAddingMcpServer: vi.fn(() => false),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id: string) => ({ type: 'selectOperationGroupId', payload: id })),
  selectOperationId: vi.fn((id: string) => ({ type: 'selectOperationId', payload: id })),
}));

vi.mock('../operationGroupDetailView', () => ({
  OperationGroupDetailView: ({ groupOperations, onOperationClick }: any) => (
    <div>
      {groupOperations.map((op: DiscoveryOperation<DiscoveryResultTypes>) => (
        <button key={op.id} data-testid={`op-${op.id}`} onClick={() => onOperationClick(op.id, op.properties.api.id)}>
          {op.properties.summary}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('../searchView', () => ({ SearchView: () => null }));
vi.mock('../browseView', () => ({ BrowseView: () => null }));
vi.mock('../actionSpotlight', () => ({ ActionSpotlight: () => null }));
vi.mock('../azureResourceSelection', () => ({ AzureResourceSelection: () => null }));
vi.mock('../customSwaggerSelection', () => ({ CustomSwaggerSelection: () => null }));
vi.mock('../hooks', () => ({ useOnFavoriteClick: () => vi.fn() }));
vi.mock('../helpers', () => ({ getOperationCardDataFromOperation: () => ({ id: 'nativemcpclient' }) }));

vi.mock('@microsoft/designer-ui', () => ({
  OperationSearchHeader: () => null,
  XLargeText: ({ text }: { text: string }) => <h2>{text}</h2>,
  NavigateIcon: () => null,
}));

import { RecommendationPanelContext } from '../recommendationPanelContext';
import { addOperation } from '../../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations, useOperationsByConnector } from '../../../../core/queries/browse';
import { useDiscoveryPanelSelectedOperationGroupId } from '../../../../core/state/panel/panelSelectors';

const blobApiId = '/subscriptions/sub/providers/Microsoft.Web/locations/westus/managedApis/azureblob';

const copyBlobOperation = {
  id: 'CopyFile_V2',
  name: 'CopyFile_V2',
  type: 'Microsoft.Web/locations/managedApis/apiOperations',
  properties: {
    summary: 'Copy blob (V2)',
    description: 'Copies a blob',
    visibility: '',
    trigger: undefined,
    api: { id: blobApiId, name: 'azureblob', displayName: 'Azure Blob Storage', iconUri: '', brandColor: '' },
  },
} as unknown as DiscoveryOperation<DiscoveryResultTypes>;

const renderPanel = () => render(<RecommendationPanelContext {...({ toggleCollapse: vi.fn() } as any)} />);

describe('RecommendationPanelContext - operation click from connector detail view', () => {
  beforeEach(() => {
    vi.mocked(useDiscoveryPanelSelectedOperationGroupId).mockReturnValue(blobApiId);
    vi.mocked(useAllConnectors).mockReturnValue({ data: [{ id: blobApiId, properties: {} }] } as any);
    vi.mocked(useOperationsByConnector).mockReturnValue({ data: [copyBlobOperation], isLoading: false } as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('adds the operation when the full operations preload has completed', async () => {
    vi.mocked(useAllOperations).mockReturnValue({ data: [copyBlobOperation], isLoading: false });

    renderPanel();
    fireEvent.click(await screen.findByTestId('op-CopyFile_V2'));

    await waitFor(() => expect(addOperation).toHaveBeenCalledTimes(1));
  });

  test('adds the operation while the full operations preload is still in progress', async () => {
    // Large tenants page through thousands of operations; the connector view renders before preload finishes.
    vi.mocked(useAllOperations).mockReturnValue({ data: [], isLoading: true });

    renderPanel();
    fireEvent.click(await screen.findByTestId('op-CopyFile_V2'));

    await waitFor(() => expect(addOperation).toHaveBeenCalledTimes(1));
  });
});
