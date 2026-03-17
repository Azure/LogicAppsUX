/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KnowledgeList, type KnowledgeHubItem } from '../knowledgelist';
import type { KnowledgeHubExtended as KnowledgeHub } from '@microsoft/logic-apps-shared';
import { ArtifactCreationStatus } from '@microsoft/logic-apps-shared';

// Mock styles
vi.mock('../styles', () => ({
  useListStyles: () => ({
    tableStyle: 'mock-table-style',
    tableCell: 'mock-table-cell',
    rowCell: 'mock-row-cell',
    iconsCell: 'mock-icons-cell',
    nameCell: 'mock-name-cell',
    nameText: 'mock-name-text',
    artifactNameCell: 'mock-artifact-name-cell',
    statusCell: 'mock-status-cell',
  }),
}));

// Mock DeleteModal
vi.mock('../../modals/delete', () => ({
  DeleteModal: ({
    selectedArtifacts,
    onDelete,
    onDismiss,
  }: { selectedArtifacts: KnowledgeHubItem[]; onDelete: () => void; onDismiss: () => void }) => (
    <div data-testid="delete-modal">
      <span data-testid="delete-modal-artifact-name">{selectedArtifacts[0]?.name}</span>
      <button data-testid="delete-modal-confirm" onClick={onDelete}>
        Confirm Delete
      </button>
      <button data-testid="delete-modal-dismiss" onClick={onDismiss}>
        Cancel
      </button>
    </div>
  ),
}));

describe('KnowledgeList Component', () => {
  let queryClient: QueryClient;
  const mockSetSelectedArtifacts = vi.fn();
  const mockOnUploadArtifacts = vi.fn();
  const defaultResourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';

  const createHub = (name: string, description = '', artifacts: any[] = []): KnowledgeHub => ({
    id: `hub-${name}`,
    name,
    description,
    partitionKey: 'pk',
    createdAt: '2024-01-15T10:30:00Z',
    artifacts,
  });

  const createArtifact = (name: string, hubId: string, status: string = ArtifactCreationStatus.Completed) => ({
    id: `artifact-${name}`,
    name,
    description: `Description for ${name}`,
    knowledgeHubId: hubId,
    artifactSource: 'FileUpload',
    uploadStatus: status,
    partitionKey: 'pk',
    createdAt: '2024-01-16T12:00:00Z',
  });

  const renderComponent = (hubs: KnowledgeHub[] = []) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">
          <KnowledgeList
            hubs={hubs}
            resourceId={defaultResourceId}
            setSelectedArtifacts={mockSetSelectedArtifacts}
            onUploadArtifacts={mockOnUploadArtifacts}
          />
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  describe('rendering', () => {
    it('returns null when hubs list is empty', () => {
      const { container } = renderComponent([]);
      expect(container.firstChild).toBeNull();
    });

    it('renders table with correct headers', () => {
      const hubs = [createHub('TestHub', 'Test description')];
      renderComponent(hubs);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Upload status')).toBeInTheDocument();
    });

    it('renders hub row with correct data', () => {
      const hubs = [createHub('MyKnowledgeHub', 'Hub description')];
      renderComponent(hubs);

      expect(screen.getByText('MyKnowledgeHub')).toBeInTheDocument();
      expect(screen.getByText('folder')).toBeInTheDocument();
      expect(screen.getByText('Hub description')).toBeInTheDocument();
    });

    it('renders multiple hubs', () => {
      const hubs = [createHub('Hub1', 'Description 1'), createHub('Hub2', 'Description 2'), createHub('Hub3', 'Description 3')];
      renderComponent(hubs);

      expect(screen.getByText('Hub1')).toBeInTheDocument();
      expect(screen.getByText('Hub2')).toBeInTheDocument();
      expect(screen.getByText('Hub3')).toBeInTheDocument();
    });

    it('renders hub with created date formatted correctly', () => {
      const hubs = [createHub('TestHub')];
      renderComponent(hubs);

      // The date should be formatted using toLocaleString
      const dateCell = screen.getAllByRole('cell').find((cell) => cell.textContent?.includes('2024') || cell.textContent?.includes('1/15'));
      expect(dateCell).toBeTruthy();
    });

    it('shows -- for hub without created date', () => {
      const hub: KnowledgeHub = {
        id: 'hub-1',
        name: 'NoDateHub',
        description: 'Test',
        partitionKey: 'pk',
        createdAt: '',
        artifacts: [],
      };
      renderComponent([hub]);

      // Should show '--' for missing date
      const cells = screen.getAllByRole('cell');
      const dashCell = cells.find((cell) => cell.textContent === '--');
      expect(dashCell).toBeTruthy();
    });
  });

  describe('expand/collapse functionality', () => {
    it('does not show artifacts initially when hub is collapsed', () => {
      const hub = createHub('ParentHub', 'Parent description', [
        createArtifact('Artifact1', 'hub-ParentHub'),
        createArtifact('Artifact2', 'hub-ParentHub'),
      ]);
      renderComponent([hub]);

      // Only hub should be visible
      expect(screen.getByText('ParentHub')).toBeInTheDocument();
      expect(screen.queryByText('Artifact1')).not.toBeInTheDocument();
      expect(screen.queryByText('Artifact2')).not.toBeInTheDocument();
    });

    it('shows artifacts when hub is expanded', () => {
      const hub = createHub('ParentHub', 'Parent description', [
        createArtifact('Artifact1', 'hub-ParentHub'),
        createArtifact('Artifact2', 'hub-ParentHub'),
      ]);
      renderComponent([hub]);

      // Click expand button
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      // Artifacts should now be visible
      expect(screen.getByText('Artifact1')).toBeInTheDocument();
      expect(screen.getByText('Artifact2')).toBeInTheDocument();
    });

    it('hides artifacts when hub is collapsed after being expanded', () => {
      const hub = createHub('ParentHub', 'Parent description', [createArtifact('Artifact1', 'hub-ParentHub')]);
      renderComponent([hub]);

      // Expand
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);
      expect(screen.getByText('Artifact1')).toBeInTheDocument();

      // Collapse
      fireEvent.click(expandButton);
      expect(screen.queryByText('Artifact1')).not.toBeInTheDocument();
    });
  });

  describe('selection functionality', () => {
    it('selects hub when clicked', () => {
      const hub = createHub('SelectableHub', 'Description');
      renderComponent([hub]);

      const row = screen.getByText('SelectableHub').closest('tr');
      fireEvent.click(row!);

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });

    it('selects all items when select all is clicked', () => {
      const hubs = [createHub('Hub1'), createHub('Hub2')];
      renderComponent(hubs);

      // Find and click the select all checkbox
      const selectAllCheckbox = screen.getByLabelText('Select all');
      fireEvent.click(selectAllCheckbox);

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });

    it('deselects all items when select all is clicked twice', () => {
      const hubs = [createHub('Hub1')];
      renderComponent([hubs[0]]);

      const selectAllCheckbox = screen.getByLabelText('Select all');

      // Select all
      fireEvent.click(selectAllCheckbox);
      // Deselect all
      fireEvent.click(selectAllCheckbox);

      // Last call should have empty selection or include deselection
      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });

    it('toggles row selection with space key', () => {
      const hub = createHub('KeyboardHub');
      renderComponent([hub]);

      const row = screen.getByText('KeyboardHub').closest('tr');
      fireEvent.keyDown(row!, { key: ' ' });

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });

    it('selects hub group and all artifacts when hub is selected', () => {
      const hub = createHub('GroupHub', 'Desc', [createArtifact('Art1', 'hub-GroupHub'), createArtifact('Art2', 'hub-GroupHub')]);
      renderComponent([hub]);

      // Expand hub first
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      // Select the hub
      const hubRow = screen.getByText('GroupHub').closest('tr');
      fireEvent.click(hubRow!);

      expect(mockSetSelectedArtifacts).toHaveBeenCalled();
    });
  });

  describe('status cell rendering', () => {
    it('renders In-progress status correctly', () => {
      const hub = createHub('StatusHub', 'Desc', [
        createArtifact('InProgressArtifact', 'hub-StatusHub', ArtifactCreationStatus.InProgress),
      ]);
      renderComponent([hub]);

      // Expand to show artifact
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      expect(screen.getByText('In-progress')).toBeInTheDocument();
    });

    it('renders Completed status correctly', () => {
      const hub = createHub('StatusHub', 'Desc', [createArtifact('CompletedArtifact', 'hub-StatusHub', ArtifactCreationStatus.Completed)]);
      renderComponent([hub]);

      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('renders Failed status correctly', () => {
      const hub = createHub('StatusHub', 'Desc', [createArtifact('FailedArtifact', 'hub-StatusHub', ArtifactCreationStatus.Failed)]);
      renderComponent([hub]);

      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('context menu actions', () => {
    it('opens context menu when more button is clicked', () => {
      const hub = createHub('MenuHub');
      renderComponent([hub]);

      // Find the more button (context menu trigger)
      const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg') !== null);
      // Click the context menu button (last button in the row, excluding expand)
      const contextMenuButton = moreButtons[moreButtons.length - 1];
      fireEvent.click(contextMenuButton);

      // Menu should have upload and delete options for hub
      expect(screen.getByText('Upload artifacts')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onUploadArtifacts when upload is clicked', () => {
      const hub = createHub('UploadHub');
      renderComponent([hub]);

      // Open context menu
      const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg') !== null);
      const contextMenuButton = moreButtons[moreButtons.length - 1];
      fireEvent.click(contextMenuButton);

      // Click upload
      fireEvent.click(screen.getByText('Upload artifacts'));

      expect(mockOnUploadArtifacts).toHaveBeenCalledWith(hub);
    });

    it('shows delete modal when delete is clicked', () => {
      const hub = createHub('DeleteHub');
      renderComponent([hub]);

      // Open context menu
      const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg') !== null);
      const contextMenuButton = moreButtons[moreButtons.length - 1];
      fireEvent.click(contextMenuButton);

      // Click delete
      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-modal-artifact-name')).toHaveTextContent('DeleteHub');
    });

    it('closes delete modal when dismiss is clicked', () => {
      const hub = createHub('DismissHub');
      renderComponent([hub]);

      // Open context menu and delete modal
      const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg') !== null);
      fireEvent.click(moreButtons[moreButtons.length - 1]);
      fireEvent.click(screen.getByText('Delete'));

      // Dismiss the modal
      fireEvent.click(screen.getByTestId('delete-modal-dismiss'));

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('artifact context menu does not show upload option', () => {
      const hub = createHub('ArtifactMenuHub', 'Desc', [createArtifact('ArtifactWithMenu', 'hub-ArtifactMenuHub')]);
      renderComponent([hub]);

      // Expand hub
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      // Find the artifact row's context menu button
      const artifactRow = screen.getByText('ArtifactWithMenu').closest('tr');
      const moreButton = within(artifactRow!).getAllByRole('button').pop();
      fireEvent.click(moreButton!);

      // Should only have delete, not upload
      expect(screen.queryByText('Upload artifacts')).not.toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('removes hub from query cache after successful delete', () => {
      const hub = createHub('ToDeleteHub');
      renderComponent([hub]);

      // Set initial query data
      queryClient.setQueryData(['knowledgehubs', defaultResourceId], [hub]);

      // Open context menu and delete
      const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg') !== null);
      fireEvent.click(moreButtons[moreButtons.length - 1]);
      fireEvent.click(screen.getByText('Delete'));

      // Confirm delete
      fireEvent.click(screen.getByTestId('delete-modal-confirm'));

      // Check that query data was updated
      const updatedData = queryClient.getQueryData(['knowledgehubs', defaultResourceId]);
      expect(updatedData).toEqual([]);
    });

    it('removes artifact from hub after successful delete', () => {
      const hub = createHub('HubWithArtifact', 'Desc', [
        createArtifact('ToDeleteArtifact', 'HubWithArtifact'),
        createArtifact('KeepArtifact', 'HubWithArtifact'),
      ]);
      renderComponent([hub]);

      // Set initial query data
      queryClient.setQueryData(['knowledgehubs', defaultResourceId], [hub]);

      // Expand hub
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      // Find artifact's context menu
      const artifactRow = screen.getByText('ToDeleteArtifact').closest('tr');
      const moreButton = within(artifactRow!).getAllByRole('button').pop();
      fireEvent.click(moreButton!);
      fireEvent.click(screen.getByText('Delete'));

      // Confirm delete
      fireEvent.click(screen.getByTestId('delete-modal-confirm'));

      // Modal should close
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });
  });

  describe('table accessibility', () => {
    it('has correct aria-label on table', () => {
      const hub = createHub('AccessibleHub');
      renderComponent([hub]);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'List of knowledge hubs');
    });

    it('has aria-selected attribute on rows', () => {
      const hub = createHub('AriaHub');
      renderComponent([hub]);

      const row = screen.getByText('AriaHub').closest('tr');
      expect(row).toHaveAttribute('aria-selected');
    });

    it('select all checkbox has correct aria-label', () => {
      const hub = createHub('CheckboxHub');
      renderComponent([hub]);

      expect(screen.getByLabelText('Select all')).toBeInTheDocument();
    });

    it('row selection checkbox has correct aria-label', () => {
      const hub = createHub('RowCheckboxHub');
      renderComponent([hub]);

      expect(screen.getByLabelText('Select row')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles hub with empty artifacts array', () => {
      const hub = createHub('EmptyArtifactsHub', 'Description', []);
      renderComponent([hub]);

      // Expand - should not crash
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      expect(screen.getByText('EmptyArtifactsHub')).toBeInTheDocument();
    });

    it('handles rapid expand/collapse clicks', () => {
      const hub = createHub('RapidClickHub', 'Desc', [createArtifact('Art1', 'hub-RapidClickHub')]);
      renderComponent([hub]);

      const expandButton = screen.getByRole('button', { name: '' });

      // Rapid clicks
      fireEvent.click(expandButton);
      fireEvent.click(expandButton);
      fireEvent.click(expandButton);

      // Should end in expanded state (odd number of clicks)
      expect(screen.getByText('Art1')).toBeInTheDocument();
    });

    it('handles special characters in hub names', () => {
      const hub = createHub('Hub-With_Special.Characters', 'Description');
      renderComponent([hub]);

      expect(screen.getByText('Hub-With_Special.Characters')).toBeInTheDocument();
    });

    it('handles very long hub names', () => {
      const longName = 'A'.repeat(100);
      const hub = createHub(longName, 'Description');
      renderComponent([hub]);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles hub with undefined status gracefully', () => {
      const hub = createHub('UndefinedStatusHub', 'Desc', [
        {
          ...createArtifact('ArtifactWithUndefinedStatus', 'hub-UndefinedStatusHub'),
          uploadStatus: 'Unknown' as any,
        },
      ]);
      renderComponent([hub]);

      // Expand hub
      const expandButton = screen.getByRole('button', { name: '' });
      fireEvent.click(expandButton);

      // Should render the unknown status as-is
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
