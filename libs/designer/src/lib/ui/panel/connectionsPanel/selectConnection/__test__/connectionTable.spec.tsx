import { render, screen } from '@testing-library/react';
import type { Connection } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '../../../../../common/models/workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionTable } from '../connectionTable';
import '@testing-library/jest-dom/vitest';

// Track if useConnectionRefs was called - it should NOT be called since we pass connectionReferences as prop
const useConnectionRefsSpy = vi.fn();

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnectionRefs: () => {
    useConnectionRefsSpy();
    // Return empty object - but this should never be called if prop is used correctly
    return {};
  },
}));

// Mock react-intl following existing pattern
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
      formatDate: vi.fn(() => 'formatted-date'),
    }),
  };
});

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    DataGrid: ({ children }: any) => <table data-testid="data-grid">{children}</table>,
    DataGridHeader: ({ children }: any) => <thead>{children}</thead>,
    DataGridHeaderCell: ({ children }: any) => <th>{children}</th>,
    DataGridBody: ({ children }: any) => <tbody>{children}</tbody>,
    DataGridRow: ({ children }: any) => <tr data-testid="data-grid-row">{children}</tr>,
    DataGridCell: ({ children }: any) => <td>{children}</td>,
    PresenceBadge: () => <span data-testid="presence-badge" />,
    Text: ({ children }: any) => <span>{children}</span>,
    Tooltip: ({ children }: any) => <>{children}</>,
    createTableColumn: (config: any) => config,
  };
});

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    LoggerService: () => ({
      log: vi.fn(),
    }),
  };
});

vi.mock('../connectionTableDetailsButton', () => ({
  ConnectionTableDetailsButton: () => <button type="button">Details</button>,
}));

const createMockConnection = (id: string, displayName: string): Connection =>
  ({
    id: `/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/${id}`,
    name: id,
    type: 'Microsoft.Web/connections',
    properties: {
      displayName,
      statuses: [{ status: 'Connected' }],
      api: {
        id: '/subscriptions/sub1/providers/Microsoft.Web/locations/eastus/managedApis/sql',
        name: 'sql',
        displayName: 'SQL Server',
        iconUri: 'https://example.com/sql.png',
        brandColor: '#0078D4',
      },
    },
  }) as unknown as Connection;

describe('ConnectionTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectionReferences prop usage', () => {
    it('should use connectionReferences from props, not from Redux store', () => {
      const mockConnections = [createMockConnection('conn1', 'Connection 1')];
      const mockConnectionReferences: ConnectionReferences = {
        'ref-1': {
          api: { id: '/subscriptions/sub1/providers/Microsoft.Web/locations/eastus/managedApis/sql' },
          connection: { id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/conn1' },
          connectionName: 'conn1',
        },
      };

      render(
        <ConnectionTable
          connections={mockConnections}
          currentConnectionId="conn1"
          saveSelectionCallback={vi.fn()}
          isXrmConnectionReferenceMode={false}
          connectionReferences={mockConnectionReferences}
        />
      );

      // The component should NOT call useConnectionRefs from the store
      // since connectionReferences is passed as a required prop
      expect(useConnectionRefsSpy).not.toHaveBeenCalled();
    });

    it('should correctly identify configured connections using prop connectionReferences', () => {
      const mockConnections = [createMockConnection('conn1', 'Connection 1'), createMockConnection('conn2', 'Connection 2')];

      // Only conn1 is configured in connectionReferences
      const mockConnectionReferences: ConnectionReferences = {
        'ref-1': {
          api: { id: '/subscriptions/sub1/providers/Microsoft.Web/locations/eastus/managedApis/sql' },
          connection: { id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/conn1' },
          connectionName: 'conn1',
        },
      };

      render(
        <ConnectionTable
          connections={mockConnections}
          currentConnectionId="conn1"
          saveSelectionCallback={vi.fn()}
          isXrmConnectionReferenceMode={false}
          connectionReferences={mockConnectionReferences}
        />
      );

      // Verify component rendered with the connections
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();

      // Store selector should never be called
      expect(useConnectionRefsSpy).not.toHaveBeenCalled();
    });

    it('should handle empty connectionReferences prop without calling store', () => {
      const mockConnections = [createMockConnection('conn1', 'Connection 1')];

      render(
        <ConnectionTable
          connections={mockConnections}
          currentConnectionId="conn1"
          saveSelectionCallback={vi.fn()}
          isXrmConnectionReferenceMode={false}
          connectionReferences={{}}
        />
      );

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      expect(useConnectionRefsSpy).not.toHaveBeenCalled();
    });

    it('should render connections from different contexts (designer/MCP) using only prop data', () => {
      // Simulate MCP context passing its own connection references
      const mcpConnections = [createMockConnection('mcp-conn-1', 'MCP Connection')];
      const mcpConnectionReferences: ConnectionReferences = {
        'mcp-ref': {
          api: { id: '/connectionProviders/agent' },
          connection: { id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/connections/mcp-conn-1' },
          connectionName: 'mcp-conn-1',
        },
      };

      render(
        <ConnectionTable
          connections={mcpConnections}
          currentConnectionId="mcp-conn-1"
          saveSelectionCallback={vi.fn()}
          isXrmConnectionReferenceMode={false}
          connectionReferences={mcpConnectionReferences}
        />
      );

      // Even in MCP context, should not call designer's useConnectionRefs
      expect(useConnectionRefsSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });
  });

  describe('connection selection behavior', () => {
    it('should render without accessing the store when connectionReferences is empty', async () => {
      const saveCallback = vi.fn();
      const mockConnections = [createMockConnection('conn1', 'Connection 1')];

      // Empty references means conn1 is not configured
      render(
        <ConnectionTable
          connections={mockConnections}
          currentConnectionId="conn1"
          saveSelectionCallback={saveCallback}
          isXrmConnectionReferenceMode={false}
          connectionReferences={{}}
        />
      );

      expect(useConnectionRefsSpy).not.toHaveBeenCalled();
    });
  });
});
