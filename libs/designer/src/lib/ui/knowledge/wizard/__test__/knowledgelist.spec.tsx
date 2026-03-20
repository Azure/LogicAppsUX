/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { KnowledgeList, type KnowledgeHubItem } from '../knowledgelist';
import { ArtifactCreationStatus, type KnowledgeHubExtended as KnowledgeHub } from '@microsoft/logic-apps-shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock styles
vi.mock('../styles', () => ({
  useListStyles: () => ({
    tableStyle: 'mock-table',
    tableCell: 'mock-table-cell',
    rowCell: 'mock-row-cell',
    nameCell: 'mock-name-cell',
    nameText: 'mock-name-text',
    artifactNameCell: 'mock-artifact-name-cell',
    statusCell: 'mock-status-cell',
    actionCell: 'mock-action-cell',
    iconsCell: 'mock-icons-cell',
  }),
}));

// Mock DeleteModal
vi.mock('../../modals/delete', () => ({
  DeleteModal: ({
    selectedArtifacts,
    onDelete,
    onDismiss,
  }: {
    selectedArtifacts: KnowledgeHubItem[];
    resourceId: string;
    onDelete: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="delete-modal">
      <span data-testid="delete-modal-count">{selectedArtifacts.length} items selected</span>
      <button data-testid="delete-modal-confirm" onClick={onDelete}>
        Confirm Delete
      </button>
      <button data-testid="delete-modal-cancel" onClick={onDismiss}>
        Cancel
      </button>
    </div>
  ),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <IntlProvider locale="en">{component}</IntlProvider>
    </QueryClientProvider>
  );
};

describe('KnowledgeList', () => {
  const mockSetSelectedArtifacts = vi.fn();
  const mockOnUploadArtifacts = vi.fn();
  const mockResourceId = '/subscriptions/test-sub/resourceGroups/test-rg';

  const createMockHub = (overrides?: Partial<KnowledgeHub>): KnowledgeHub => ({
    name: 'TestHub',
    id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-app/knowledgeHubs/TestHub',
    type: 'Microsoft.Web/sites/knowledgeHubs',
    properties: {
      createdTime: '2024-01-15T10:00:00Z',
      description: 'A test knowledge hub',
    },
    artifacts: [],
    ...overrides,
  });

  const createMockHubWithArtifacts = (): KnowledgeHub => ({
    name: 'HubWithArtifacts',
    id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-app/knowledgeHubs/HubWithArtifacts',
    type: 'Microsoft.Web/sites/knowledgeHubs',
    properties: {
      createdTime: '2024-01-15T10:00:00Z',
      description: 'A hub with artifacts',
    },
    artifacts: [
      {
        name: 'Artifact1',
        description: 'First artifact',
        createdAt: '2024-01-16T10:00:00Z',
        uploadStatus: ArtifactCreationStatus.Completed,
      },
      {
        name: 'Artifact2',
        description: 'Second artifact',
        createdAt: '2024-01-17T10:00:00Z',
        uploadStatus: ArtifactCreationStatus.InProgress,
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render knowledge hub names in the table', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(screen.getByText('TestHub')).toBeInTheDocument();
    });

    it('should render nothing when hubs array is empty', () => {
      const { container } = renderWithProviders(
        <KnowledgeList
          hubs={[]}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    it('should render multiple hubs', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub({ name: 'Hub1' }), createMockHub({ name: 'Hub2' }), createMockHub({ name: 'Hub3' })];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(screen.getByText('Hub1')).toBeInTheDocument();
      expect(screen.getByText('Hub2')).toBeInTheDocument();
      expect(screen.getByText('Hub3')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      renderWithProviders(
        <KnowledgeList
          hubs={[createMockHub()]}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Upload status')).toBeInTheDocument();
    });

    it('should render hub description', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub({ description: 'Custom description' })];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should show artifacts when hub is expanded', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Initially artifacts should not be visible
      expect(screen.queryByText('Artifact1')).not.toBeInTheDocument();

      // Find and click the expand button (first button in the row)
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      // Artifacts should now be visible
      expect(screen.getByText('Artifact1')).toBeInTheDocument();
      expect(screen.getByText('Artifact2')).toBeInTheDocument();
    });

    it('should hide artifacts when hub is collapsed', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand first
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);
      expect(screen.getByText('Artifact1')).toBeInTheDocument();

      // Collapse
      fireEvent.click(expandButton);

      // Artifacts should be hidden
      expect(screen.queryByText('Artifact1')).not.toBeInTheDocument();
    });
  });

  describe('Row Selection', () => {
    it('should call setSelectedArtifacts when a row is clicked', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      const row = screen.getByText('TestHub').closest('tr');
      expect(row).toBeInTheDocument();
      fireEvent.click(row!);

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });

    it('should toggle selection when row is clicked again', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      const row = screen.getByText('TestHub').closest('tr');
      fireEvent.click(row!);
      fireEvent.click(row!);

      // Should be called twice - once to select, once to deselect
      expect(mockSetSelectedArtifacts).toHaveBeenCalledTimes(2);
    });

    it('should select row when space key is pressed', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      const row = screen.getByText('TestHub').closest('tr');
      fireEvent.keyDown(row!, { key: ' ' });

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });
  });

  describe('Status Display', () => {
    it('should display completed status for artifacts', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand to see artifacts
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should display in-progress status for artifacts', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand to see artifacts
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('should display error status for failed artifacts', () => {
      const mockHubs: KnowledgeHub[] = [
        {
          ...createMockHub(),
          artifacts: [
            {
              name: 'FailedArtifact',
              description: 'Failed upload',
              createdAt: '2024-01-16T10:00:00Z',
              uploadStatus: ArtifactCreationStatus.Failed,
            },
          ],
        },
      ];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand to see artifacts
      const hubRow = screen.getByText('TestHub').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Context Menu Actions', () => {
    it('should show delete modal when delete is clicked from context menu', async () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Find the hub row and click the context menu button (last button in the row)
      const hubRow = screen.getByText('TestHub').closest('tr');
      const buttons = within(hubRow!).getAllByRole('button');
      const moreButton = buttons[buttons.length - 1];
      fireEvent.click(moreButton);

      // Click delete option
      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    });

    it('should call onUploadArtifacts when upload is clicked for a hub', async () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Find the hub row and click the context menu button
      const hubRow = screen.getByText('TestHub').closest('tr');
      const buttons = within(hubRow!).getAllByRole('button');
      const moreButton = buttons[buttons.length - 1];
      fireEvent.click(moreButton);

      // Click upload option
      const uploadButton = await screen.findByRole('menuitem', { name: /upload artifacts/i });
      fireEvent.click(uploadButton);

      expect(mockOnUploadArtifacts).toHaveBeenCalledWith(mockHubs[0]);
    });
  });

  describe('Delete Modal', () => {
    it('should close delete modal when cancel is clicked', async () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Open context menu and click delete
      const hubRow = screen.getByText('TestHub').closest('tr');
      const buttons = within(hubRow!).getAllByRole('button');
      const moreButton = buttons[buttons.length - 1];
      fireEvent.click(moreButton);

      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Verify modal is open
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByTestId('delete-modal-cancel');
      fireEvent.click(cancelButton);

      // Modal should be closed
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('should close delete modal after confirm delete', async () => {
      const queryClient = createTestQueryClient();
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />,
        queryClient
      );

      // Open context menu and click delete
      const hubRow = screen.getByText('TestHub').closest('tr');
      const buttons = within(hubRow!).getAllByRole('button');
      const moreButton = buttons[buttons.length - 1];
      fireEvent.click(moreButton);

      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Click confirm
      const confirmButton = screen.getByTestId('delete-modal-confirm');
      fireEvent.click(confirmButton);

      // Modal should be closed
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });
  });

  describe('Select All', () => {
    it('should have a select all checkbox in the header', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Find the select all checkbox by aria-label
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should select all items when select all checkbox is clicked', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub({ name: 'Hub1' }), createMockHub({ name: 'Hub2' })];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      fireEvent.click(selectAllCheckbox);

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });
  });

  describe('Artifact Display', () => {
    it('should display artifact description when expanded', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand hub
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      expect(screen.getByText('First artifact')).toBeInTheDocument();
      expect(screen.getByText('Second artifact')).toBeInTheDocument();
    });

    it('should display file type for artifacts', () => {
      const mockHubs: KnowledgeHub[] = [createMockHubWithArtifacts()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      // Expand hub
      const hubRow = screen.getByText('HubWithArtifacts').closest('tr');
      const expandButton = within(hubRow!).getAllByRole('button')[0];
      fireEvent.click(expandButton);

      // 'file' type should appear for artifacts
      const fileCells = screen.getAllByText('file');
      expect(fileCells.length).toBeGreaterThan(0);
    });

    it('should display folder type for hubs', () => {
      const mockHubs: KnowledgeHub[] = [createMockHub()];

      renderWithProviders(
        <KnowledgeList
          hubs={mockHubs}
          resourceId={mockResourceId}
          setSelectedArtifacts={mockSetSelectedArtifacts}
          onUploadArtifacts={mockOnUploadArtifacts}
        />
      );

      expect(screen.getByText('folder')).toBeInTheDocument();
    });
  });
});
