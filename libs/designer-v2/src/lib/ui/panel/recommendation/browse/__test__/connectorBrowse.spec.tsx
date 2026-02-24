// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectorBrowse } from '../connectorBrowse';
import type { Connector } from '@microsoft/logic-apps-shared';

// --- Mocks ---

const mockDispatch = vi.fn();
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return { ...actual, useDispatch: () => mockDispatch };
});

const mockUseAllConnectors = vi.fn();
vi.mock('../../../../../core/queries/browse', () => ({
  useAllConnectors: () => mockUseAllConnectors(),
}));

vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'root',
    parentId: undefined,
    childId: undefined,
  })),
}));

vi.mock('../../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: vi.fn(() => false),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id: string) => ({ type: 'panel/selectOperationGroupId', payload: id })),
}));

vi.mock('@microsoft/designer-ui', () => ({
  isBuiltInConnector: vi.fn((c: Connector) => c.id.includes('builtin')),
  isCustomConnector: vi.fn((c: Connector) => c.id.includes('custom')),
}));

vi.mock('../connectorCard', () => ({
  ConnectorCard: vi.fn(({ connector }: { connector: Connector }) => (
    <div data-testid={`connector-card-${connector.id}`}>{connector.properties.displayName}</div>
  )),
}));

vi.mock('../styles/ConnectorBrowse.styles', () => ({
  useConnectorBrowseStyles: vi.fn(() => ({
    loadingContainer: 'loading-container',
    emptyStateContainer: 'empty-state-container',
  })),
}));

vi.mock('react-window', () => ({
  List: vi.fn(({ rowCount, rowComponent: Row }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: rowCount }, (_, i) => (
        <Row key={i} index={i} style={{}} />
      ))}
    </div>
  )),
}));

// --- Helpers ---

const makeConnector = (id: string, displayName: string, overrides?: Partial<Connector>): Connector =>
  ({
    id,
    name: id.split('/').pop() ?? id,
    type: 'Microsoft.Web/locations/managedApis',
    properties: {
      displayName,
      capabilities: [],
      ...overrides?.properties,
    },
    ...overrides,
  }) as unknown as Connector;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = configureStore({ reducer: { stub: (s = {}) => s } });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <IntlProvider locale="en">{children}</IntlProvider>
      </Provider>
    </QueryClientProvider>
  );
};

// --- Tests ---

describe('ConnectorBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('renders loading spinner when data is loading', () => {
    mockUseAllConnectors.mockReturnValue({ data: undefined, isLoading: true });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading connectors...')).toBeInTheDocument();
  });

  test('renders empty state when no connectors match', () => {
    mockUseAllConnectors.mockReturnValue({ data: [], isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.getByText('No connectors found for this category')).toBeInTheDocument();
  });

  test('renders connector cards when connectors are available', () => {
    const connectors = [makeConnector('shared/sql', 'SQL'), makeConnector('shared/outlook', 'Outlook')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.getByText('SQL')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
  });

  test('filters out agent connector', () => {
    const connectors = [makeConnector('connectionProviders/agent', 'Agent'), makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('connector-card-connectionProviders/agent')).not.toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  test('filters out ACA session connector', () => {
    const connectors = [makeConnector('/serviceProviders/acasession', 'ACA Session'), makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('connector-card-/serviceProviders/acasession')).not.toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  test('filters by runtime=inapp to show only built-in connectors', () => {
    const connectors = [makeConnector('builtin/http', 'HTTP'), makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ runtime: 'inapp' }} />, { wrapper: createWrapper() });

    expect(screen.getByText('HTTP')).toBeInTheDocument();
    expect(screen.queryByText('SQL')).not.toBeInTheDocument();
  });

  test('filters by runtime=custom to show only custom connectors', () => {
    const connectors = [makeConnector('custom/myConnector', 'My Custom'), makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ runtime: 'custom' }} />, { wrapper: createWrapper() });

    expect(screen.getByText('My Custom')).toBeInTheDocument();
    expect(screen.queryByText('SQL')).not.toBeInTheDocument();
  });

  test('filters by runtime=shared to exclude built-in and custom connectors', () => {
    const connectors = [
      makeConnector('builtin/http', 'HTTP'),
      makeConnector('custom/myConnector', 'My Custom'),
      makeConnector('shared/sql', 'SQL'),
    ];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ runtime: 'shared' }} />, { wrapper: createWrapper() });

    expect(screen.queryByText('HTTP')).not.toBeInTheDocument();
    expect(screen.queryByText('My Custom')).not.toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  test('filters by actionType=triggers', () => {
    const triggersConnector = makeConnector('shared/trigger', 'Trigger Connector', {
      properties: { displayName: 'Trigger Connector', capabilities: ['triggers'] },
    } as any);
    const actionsConnector = makeConnector('shared/action', 'Action Connector', {
      properties: { displayName: 'Action Connector', capabilities: ['actions'] },
    } as any);

    mockUseAllConnectors.mockReturnValue({ data: [triggersConnector, actionsConnector], isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ actionType: 'triggers' }} />, { wrapper: createWrapper() });

    expect(screen.getByText('Trigger Connector')).toBeInTheDocument();
    expect(screen.queryByText('Action Connector')).not.toBeInTheDocument();
  });

  test('filters by actionType=actions', () => {
    const triggersConnector = makeConnector('shared/trigger', 'Trigger Connector', {
      properties: { displayName: 'Trigger Connector', capabilities: ['triggers'] },
    } as any);
    const actionsConnector = makeConnector('shared/action', 'Action Connector', {
      properties: { displayName: 'Action Connector', capabilities: ['actions'] },
    } as any);

    mockUseAllConnectors.mockReturnValue({ data: [triggersConnector, actionsConnector], isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ actionType: 'actions' }} />, { wrapper: createWrapper() });

    expect(screen.queryByText('Trigger Connector')).not.toBeInTheDocument();
    expect(screen.getByText('Action Connector')).toBeInTheDocument();
  });

  test('connectors with no capabilities pass actionType filter', () => {
    const noCapsConnector = makeConnector('shared/nocaps', 'No Caps', {
      properties: { displayName: 'No Caps', capabilities: [] },
    } as any);

    mockUseAllConnectors.mockReturnValue({ data: [noCapsConnector], isLoading: false });

    render(<ConnectorBrowse categoryKey="all" filters={{ actionType: 'triggers' }} />, { wrapper: createWrapper() });

    expect(screen.getByText('No Caps')).toBeInTheDocument();
  });

  test('sorts priority connectors before others', () => {
    const regularConnector = makeConnector('shared/random', 'Random');
    const priorityConnector = makeConnector('shared/managedApis/office365', 'Office 365');

    mockUseAllConnectors.mockReturnValue({ data: [regularConnector, priorityConnector], isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    const cards = screen.getAllByTestId(/connector-card-/);
    expect(cards[0]).toHaveTextContent('Office 365');
    expect(cards[1]).toHaveTextContent('Random');
  });

  test('uses virtualized list for rendering', () => {
    const connectors = [makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId('virtualized-list').length).toBeGreaterThan(0);
  });

  test('does not render loading spinner after data has loaded', () => {
    const connectors = [makeConnector('shared/sql', 'SQL')];
    mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

    render(<ConnectorBrowse categoryKey="all" />, { wrapper: createWrapper() });

    expect(screen.queryByText('Loading connectors...')).not.toBeInTheDocument();
  });
});
