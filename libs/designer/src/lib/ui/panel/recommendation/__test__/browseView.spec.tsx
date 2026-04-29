// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Connector } from '@microsoft/logic-apps-shared';

// --- Mocks ---

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../../../../core/queries/browse', () => ({
  useAllConnectors: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id: string) => ({ type: 'panel/selectOperationGroupId', payload: id })),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({ graphId: 'root', parentId: undefined, childId: undefined })),
}));

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: vi.fn(() => false),
}));

vi.mock('@microsoft/designer-ui', () => ({
  BrowseGrid: vi.fn(({ operationsData, isLoading, onConnectorSelected }) => (
    <div data-testid="browse-grid" data-loading={String(isLoading)} data-count={operationsData?.length ?? 0}>
      {operationsData?.map((c: Connector) => (
        <button key={c.id} data-testid={`connector-${c.id}`} onClick={() => onConnectorSelected(c.id)}>
          {c.properties.displayName}
        </button>
      ))}
    </div>
  )),
  isBuiltInConnector: vi.fn((c: Connector) => c.id.startsWith('builtin/')),
  isCustomConnector: vi.fn((c: Connector) => c.id.startsWith('custom/')),
  RuntimeFilterTagList: vi.fn(() => <div data-testid="runtime-filter-tag-list" />),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    equals: (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase(),
    getRecordEntry: (record: Record<string, string> | undefined, key: string) => record?.[key],
  };
});

// --- Imports after mocks ---

import { BrowseView } from '../browseView';
import { useAllConnectors } from '../../../../core/queries/browse';
import { useIsA2AWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { useDiscoveryPanelRelationshipIds } from '../../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../../core/state/panel/panelSlice';
import { fireEvent } from '@testing-library/react';

const mockUseAllConnectors = vi.mocked(useAllConnectors);
const mockUseIsA2AWorkflow = vi.mocked(useIsA2AWorkflow);
const mockUseDiscoveryPanelRelationshipIds = vi.mocked(useDiscoveryPanelRelationshipIds);
const mockSelectOperationGroupId = vi.mocked(selectOperationGroupId);

// --- Test helpers ---

const makeConnector = (overrides: Partial<Connector> & { id: string }): Connector =>
  ({
    id: overrides.id,
    name: overrides.name ?? overrides.id.split('/').pop(),
    type: overrides.type ?? 'Microsoft.Web/locations/managedApis',
    properties: {
      displayName: overrides.properties?.displayName ?? overrides.id,
      capabilities: overrides.properties?.capabilities ?? [],
      ...(overrides.properties ?? {}),
    },
  }) as unknown as Connector;

const defaultProps = {
  filters: {} as Record<string, string>,
  displayRuntimeInfo: false,
  setFilters: vi.fn(),
  onConnectorCardSelected: vi.fn(),
};

describe('BrowseView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllConnectors.mockReturnValue({ data: [], isLoading: false });
    mockUseIsA2AWorkflow.mockReturnValue(false);
    mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
      graphId: 'root',
      parentId: undefined,
      childId: undefined,
    });
  });

  afterEach(() => {
    cleanup();
  });

  // --- Rendering ---

  describe('Rendering', () => {
    test('should render BrowseGrid and RuntimeFilterTagList', () => {
      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid')).toBeDefined();
      expect(screen.getByTestId('runtime-filter-tag-list')).toBeDefined();
    });

    test('should pass isLoading from useAllConnectors to BrowseGrid', () => {
      mockUseAllConnectors.mockReturnValue({ data: [], isLoading: true });
      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.loading).toBe('true');
    });

    test('should show connectors returned by useAllConnectors', () => {
      const connectors = [makeConnector({ id: 'shared/sql' }), makeConnector({ id: 'shared/office365' })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('2');
    });
  });

  // --- Agent connector filter ---

  describe('Agent connector filter', () => {
    test('should filter out the agent connector', () => {
      const connectors = [
        makeConnector({ id: 'connectionProviders/agent', name: 'agent' }),
        makeConnector({ id: 'shared/sql', name: 'sql' }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.queryByTestId('connector-connectionProviders/agent')).toBeNull();
      expect(screen.getByTestId('connector-shared/sql')).toBeDefined();
    });
  });

  // --- Runtime filter ---

  describe('Runtime filter', () => {
    const connectors = [
      makeConnector({ id: 'builtin/compose', properties: { displayName: 'Compose' } as any }),
      makeConnector({ id: 'shared/sql', properties: { displayName: 'SQL' } as any }),
      makeConnector({ id: 'custom/myConnector', properties: { displayName: 'My Custom' } as any }),
    ];

    beforeEach(() => {
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });
    });

    test('should show all connectors when no runtime filter is set', () => {
      render(<BrowseView {...defaultProps} filters={{}} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('3');
    });

    test('should show only built-in connectors when inapp filter is set', () => {
      render(<BrowseView {...defaultProps} filters={{ runtime: 'inapp' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.getByTestId('connector-builtin/compose')).toBeDefined();
    });

    test('should show only custom connectors when custom filter is set', () => {
      render(<BrowseView {...defaultProps} filters={{ runtime: 'custom' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.getByTestId('connector-custom/myConnector')).toBeDefined();
    });

    test('should show only shared connectors when shared filter is set', () => {
      render(<BrowseView {...defaultProps} filters={{ runtime: 'shared' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.getByTestId('connector-shared/sql')).toBeDefined();
    });
  });

  // --- ActionType filter ---

  describe('ActionType filter', () => {
    test('should show all connectors when no actionType filter is set', () => {
      const connectors = [
        makeConnector({ id: 'shared/a', properties: { displayName: 'A', capabilities: ['actions'] } as any }),
        makeConnector({ id: 'shared/b', properties: { displayName: 'B', capabilities: ['triggers'] } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{}} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('2');
    });

    test('should filter to only triggers when actionType filter is triggers', () => {
      const connectors = [
        makeConnector({ id: 'shared/a', properties: { displayName: 'A', capabilities: ['actions'] } as any }),
        makeConnector({ id: 'shared/b', properties: { displayName: 'B', capabilities: ['triggers'] } as any }),
        makeConnector({ id: 'shared/c', properties: { displayName: 'C', capabilities: ['actions', 'triggers'] } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{ actionType: 'triggers' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('2');
      expect(screen.queryByTestId('connector-shared/a')).toBeNull();
      expect(screen.getByTestId('connector-shared/b')).toBeDefined();
      expect(screen.getByTestId('connector-shared/c')).toBeDefined();
    });

    test('should filter to only actions when actionType filter is actions', () => {
      const connectors = [
        makeConnector({ id: 'shared/a', properties: { displayName: 'A', capabilities: ['actions'] } as any }),
        makeConnector({ id: 'shared/b', properties: { displayName: 'B', capabilities: ['triggers'] } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{ actionType: 'actions' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.getByTestId('connector-shared/a')).toBeDefined();
    });

    test('should include connectors with no capabilities (assume supports both)', () => {
      const connectors = [makeConnector({ id: 'shared/a', properties: { displayName: 'A', capabilities: [] } as any })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{ actionType: 'triggers' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
    });

    test('should include connectors with non-action capabilities (assume supports both)', () => {
      const connectors = [makeConnector({ id: 'shared/a', properties: { displayName: 'A', capabilities: ['blob'] } as any })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{ actionType: 'actions' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
    });
  });

  // --- A2A workflow filter ---

  describe('A2A workflow filter', () => {
    test('should not filter connectors when not an A2A workflow', () => {
      mockUseIsA2AWorkflow.mockReturnValue(false);
      const connectors = [makeConnector({ id: 'shared/someRandom', name: 'someRandom', type: 'SomeOtherType' })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
    });

    test('should not filter connectors when A2A but not adding to root', () => {
      mockUseIsA2AWorkflow.mockReturnValue(true);
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'someSubgraph',
        parentId: undefined,
        childId: undefined,
      });
      const connectors = [makeConnector({ id: 'shared/someRandom', name: 'someRandom', type: 'SomeOtherType' })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
    });

    test('should allow connectors with allowed A2A names in A2A workflow', () => {
      mockUseIsA2AWorkflow.mockReturnValue(true);
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'root',
        parentId: undefined,
        childId: undefined,
      });
      const connectors = [
        makeConnector({ id: 'some/http', name: 'http', type: 'SomeOtherType' }),
        makeConnector({ id: 'some/variable', name: 'variable', type: 'SomeOtherType' }),
        makeConnector({ id: 'some/agent', name: 'agent', type: 'SomeOtherType' }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      // 'agent' is in ALLOWED_A2A_CONNECTOR_NAMES but also filtered by isAgentConnectorAllowed
      // since id is 'some/agent' not 'connectionProviders/agent', agent filter won't exclude it
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('3');
    });

    test('should allow ManagedApi and ServiceProvider types in A2A workflow', () => {
      mockUseIsA2AWorkflow.mockReturnValue(true);
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'root',
        parentId: undefined,
        childId: undefined,
      });
      const connectors = [
        makeConnector({ id: 'shared/sql', name: 'sql', type: 'Microsoft.Web/locations/managedApis' }),
        makeConnector({ id: 'builtin/sb', name: 'sb', type: 'ServiceProvider' }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('2');
    });

    test('should exclude connectors with disallowed type and name in A2A workflow', () => {
      mockUseIsA2AWorkflow.mockReturnValue(true);
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'root',
        parentId: undefined,
        childId: undefined,
      });
      const connectors = [makeConnector({ id: 'shared/something', name: 'something', type: 'SomeOtherType' })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('0');
    });
  });

  // --- Sorting ---

  describe('Sorting', () => {
    test('should sort priority connectors first', () => {
      const connectors = [
        makeConnector({ id: 'shared/random', properties: { displayName: 'Random' } as any }),
        makeConnector({ id: '/managedApis/sql', properties: { displayName: 'SQL' } as any }),
        makeConnector({ id: 'connectionproviders/request', properties: { displayName: 'Request' } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      const grid = screen.getByTestId('browse-grid');
      const buttons = grid.querySelectorAll('button');
      // Request has priority index 0, SQL has priority index 4, Random has no priority
      expect(buttons[0].textContent).toBe('Request');
      expect(buttons[1].textContent).toBe('SQL');
      expect(buttons[2].textContent).toBe('Random');
    });

    test('should sort built-in before shared for same priority', () => {
      const connectors = [
        makeConnector({ id: 'shared/aaa', properties: { displayName: 'AAA Shared' } as any }),
        makeConnector({ id: 'builtin/aaa', properties: { displayName: 'AAA BuiltIn' } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      const grid = screen.getByTestId('browse-grid');
      const buttons = grid.querySelectorAll('button');
      expect(buttons[0].textContent).toBe('AAA BuiltIn');
      expect(buttons[1].textContent).toBe('AAA Shared');
    });

    test('should sort alphabetically by displayName when priority and runtime are same', () => {
      const connectors = [
        makeConnector({ id: 'shared/zebra', properties: { displayName: 'Zebra' } as any }),
        makeConnector({ id: 'shared/apple', properties: { displayName: 'Apple' } as any }),
        makeConnector({ id: 'shared/mango', properties: { displayName: 'Mango' } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      const grid = screen.getByTestId('browse-grid');
      const buttons = grid.querySelectorAll('button');
      expect(buttons[0].textContent).toBe('Apple');
      expect(buttons[1].textContent).toBe('Mango');
      expect(buttons[2].textContent).toBe('Zebra');
    });

    test('should handle null displayName gracefully during sorting', () => {
      const connectors = [
        makeConnector({ id: 'shared/b', properties: { displayName: 'B' } as any }),
        makeConnector({ id: 'shared/a', properties: { displayName: undefined } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      // Should not throw
      render(<BrowseView {...defaultProps} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('2');
    });
  });

  // --- Connector selection ---

  describe('Connector selection', () => {
    test('should dispatch selectOperationGroupId when connector card is clicked', () => {
      const connectors = [makeConnector({ id: 'shared/sql', properties: { displayName: 'SQL' } as any })];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('connector-shared/sql'));

      expect(mockSelectOperationGroupId).toHaveBeenCalledWith('shared/sql');
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // --- Combined filters ---

  describe('Combined filters', () => {
    test('should apply both runtime and actionType filters', () => {
      const connectors = [
        makeConnector({ id: 'builtin/a', properties: { displayName: 'A', capabilities: ['actions'] } as any }),
        makeConnector({ id: 'builtin/b', properties: { displayName: 'B', capabilities: ['triggers'] } as any }),
        makeConnector({ id: 'shared/c', properties: { displayName: 'C', capabilities: ['actions'] } as any }),
      ];
      mockUseAllConnectors.mockReturnValue({ data: connectors, isLoading: false });

      render(<BrowseView {...defaultProps} filters={{ runtime: 'inapp', actionType: 'actions' }} />);
      expect(screen.getByTestId('browse-grid').dataset.count).toBe('1');
      expect(screen.getByTestId('connector-builtin/a')).toBeDefined();
    });
  });
});
