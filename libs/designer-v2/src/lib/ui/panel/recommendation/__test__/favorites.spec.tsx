import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { composeOperation, type Connector } from '@microsoft/logic-apps-shared';
import { Favorites } from '../categories/Favorites';

const mockGrid = vi.fn((props: any) => (
  <div data-testid="favorites-grid" data-loading={String(props.isLoading)}>
    {props.items.map((item: any) => (
      <div key={item.id ?? item.apiId} data-testid={`favorite-item-${item.id ?? item.apiId}`} data-has-icon={String(Boolean(item.icon))}>
        {item.title ?? item.connectorName}
      </div>
    ))}
  </div>
));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    Grid: (props: any) => mockGrid(props),
  };
});

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelFavoriteOperations: vi.fn(() => []),
}));

vi.mock('../../../../core/queries/browse', () => ({
  useFavoriteOperations: vi.fn(),
}));

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsAgenticWorkflow: vi.fn(() => false),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: vi.fn(() => false),
}));

import { useFavoriteOperations } from '../../../../core/queries/browse';
import { useIsAgenticWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';

const mockUseFavoriteOperations = vi.mocked(useFavoriteOperations);
const mockUseIsAgenticWorkflow = vi.mocked(useIsAgenticWorkflow);
const mockUseSharedNodeUi = vi.mocked(useSharedNodeUi);

const sampleConnector = {
  id: 'connectionProviders/http',
  name: 'http',
  type: 'ServiceProvider',
  properties: {
    displayName: 'HTTP',
    description: 'HTTP connector',
    iconUri: 'https://example.test/http.png',
    brandColor: '#0078d4',
  },
} as unknown as Connector;

const agentConnector = {
  id: 'connectionProviders/agent',
  name: 'agent',
  type: 'ServiceProvider',
  properties: {
    displayName: 'Agent',
    description: 'Agent connector',
    iconUri: 'https://example.test/agent.png',
    brandColor: '#0078d4',
  },
} as unknown as Connector;

const renderFavorites = () =>
  render(
    <IntlProvider locale="en">
      <Favorites onConnectorSelected={vi.fn()} onOperationSelected={vi.fn()} />
    </IntlProvider>
  );

describe('Favorites', () => {
  const fetchNextPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsAgenticWorkflow.mockReturnValue(false);
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseFavoriteOperations.mockReturnValue({
      favoriteConnectorsData: [sampleConnector, agentConnector],
      isLoadingFavoriteConnectors: false,
      favoriteActionsData: [composeOperation],
      favoriteActionsFetchNextPage: fetchNextPage,
      favoriteActionsHasNextPage: false,
      favoriteActionsIsFetching: false,
      favoriteActionsIsFetchingNextPage: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  test('threads shared built-in glyph icons only when useSharedNodeUi is enabled and filters agent connectors outside agentic workflows', () => {
    const { rerender } = renderFavorites();

    expect(screen.getByTestId(`favorite-item-${composeOperation.id}`)).toHaveAttribute('data-has-icon', 'false');
    expect(screen.getByTestId('favorite-item-connectionProviders/http')).toHaveAttribute('data-has-icon', 'false');
    expect(screen.queryByTestId('favorite-item-connectionProviders/agent')).not.toBeInTheDocument();

    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsAgenticWorkflow.mockReturnValue(true);
    rerender(
      <IntlProvider locale="en">
        <Favorites onConnectorSelected={vi.fn()} onOperationSelected={vi.fn()} />
      </IntlProvider>
    );

    expect(screen.getByTestId(`favorite-item-${composeOperation.id}`)).toHaveAttribute('data-has-icon', 'true');
    expect(screen.getByTestId('favorite-item-connectionProviders/http')).toHaveAttribute('data-has-icon', 'false');
    expect(screen.getByTestId('favorite-item-connectionProviders/agent')).toBeInTheDocument();
  });

  test('renders Load more / Loading more link and triggers pagination', () => {
    mockUseFavoriteOperations.mockReturnValue({
      favoriteConnectorsData: [],
      isLoadingFavoriteConnectors: false,
      favoriteActionsData: [composeOperation],
      favoriteActionsFetchNextPage: fetchNextPage,
      favoriteActionsHasNextPage: true,
      favoriteActionsIsFetching: false,
      favoriteActionsIsFetchingNextPage: false,
    });

    const { rerender } = renderFavorites();
    const loadMore = screen.getByText('Load more');
    fireEvent.click(loadMore);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    mockUseFavoriteOperations.mockReturnValue({
      favoriteConnectorsData: [],
      isLoadingFavoriteConnectors: false,
      favoriteActionsData: [composeOperation],
      favoriteActionsFetchNextPage: fetchNextPage,
      favoriteActionsHasNextPage: true,
      favoriteActionsIsFetching: false,
      favoriteActionsIsFetchingNextPage: true,
    });
    rerender(
      <IntlProvider locale="en">
        <Favorites onConnectorSelected={vi.fn()} onOperationSelected={vi.fn()} />
      </IntlProvider>
    );
    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });
});
