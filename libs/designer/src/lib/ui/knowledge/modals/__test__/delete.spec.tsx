/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { DeleteModal } from '../delete';
import type { KnowledgeHubItem } from '../../wizard/knowledgelist';

const mockDeleteKnowledgeHubArtifacts = vi.fn();

vi.mock('../../../../core/knowledge/utils/helper', () => ({
  deleteKnowledgeHubArtifacts: (...args: any[]) => mockDeleteKnowledgeHubArtifacts(...args),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  LoggerService: () => ({
    log: vi.fn(),
  }),
  LogEntryLevel: {
    Error: 'Error',
  },
}));

describe('DeleteModal Component', () => {
  const mockOnDelete = vi.fn();
  const mockOnDismiss = vi.fn();
  const defaultResourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';

  const createHubItem = (name: string): KnowledgeHubItem => ({
    id: `hub-${name}`,
    name,
    type: 'hub',
    description: `Description for ${name}`,
    createdDate: '2024-01-01',
    status: 'active',
    parentId: null,
    isExpanded: false,
  });

  const createArtifactItem = (name: string, parentId: string): KnowledgeHubItem => ({
    id: `artifact-${name}`,
    name,
    type: 'artifact',
    description: `Description for ${name}`,
    createdDate: '2024-01-01',
    status: 'active',
    parentId,
    isExpanded: false,
  });

  const defaultProps = {
    resourceId: defaultResourceId,
    onDelete: mockOnDelete,
    onDismiss: mockOnDismiss,
  };

  const renderComponent = (selectedArtifacts: KnowledgeHubItem[], props = {}) => {
    const finalProps = { ...defaultProps, selectedArtifacts, ...props };
    return render(
      <IntlProvider locale="en">
        <DeleteModal {...finalProps} />
      </IntlProvider>
    );
  };

  // Helper to get elements within the non-hidden dialog
  const getDialog = () => {
    const dialogs = screen.getAllByRole('dialog');
    return dialogs.find((d) => !d.closest('[aria-hidden="true"]'))!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteKnowledgeHubArtifacts.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    // Clear any portal elements created by Fluent UI Dialog
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('renders with correct title', () => {
      renderComponent([createHubItem('TestHub')]);

      expect(screen.getByText('Delete hub artifacts')).toBeInTheDocument();
    });

    it('renders hub content when deleting a single hub', () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      expect(
        within(dialog).getByText(
          `Confirm that you want to delete this hub? This action also deletes all the hub's artifacts. You can't undo this action.`
        )
      ).toBeInTheDocument();
    });

    it('renders artifact content when deleting a single artifact', () => {
      renderComponent([createArtifactItem('TestArtifact', 'ParentHub')]);

      const dialog = getDialog();
      expect(within(dialog).getByText("Confirm that you want to delete this artifact? You can't undo this action.")).toBeInTheDocument();
    });

    it('renders multi-artifacts content when deleting multiple items', () => {
      renderComponent([createHubItem('Hub1'), createArtifactItem('Artifact1', 'OtherHub')]);

      const dialog = getDialog();
      expect(
        within(dialog).getByText(
          "Confirm that you want to delete these hub artifacts? You can't undo this action. Deleting the hub will delete all artifacts under it."
        )
      ).toBeInTheDocument();
    });

    it('displays hub names when deleting hubs', () => {
      renderComponent([createHubItem('Hub1'), createHubItem('Hub2')]);

      const dialog = getDialog();
      expect(within(dialog).getByText('Hubs: hub1, hub2')).toBeInTheDocument();
    });

    it('displays artifact names with parent hub when deleting artifacts', () => {
      renderComponent([createArtifactItem('Artifact1', 'ParentHub1'), createArtifactItem('Artifact2', 'ParentHub2')]);

      const dialog = getDialog();
      expect(within(dialog).getByText('Artifacts: artifact1 (hub: ParentHub1), artifact2 (hub: ParentHub2)')).toBeInTheDocument();
    });

    it('does not display artifacts that belong to hubs being deleted', () => {
      // If deleting a hub and its child artifact, the artifact should not be shown separately
      renderComponent([createHubItem('ParentHub'), createArtifactItem('ChildArtifact', 'ParentHub')]);

      const dialog = getDialog();
      expect(within(dialog).getByText('Hubs: parenthub')).toBeInTheDocument();
      expect(within(dialog).queryByText(/Artifact\(s\):/)).not.toBeInTheDocument();
    });

    it('renders delete and continue editing buttons', () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Continue editing' })).toBeInTheDocument();
    });
  });

  describe('Delete functionality', () => {
    it('calls deleteKnowledgeHubArtifacts with correct parameters when deleting a hub', async () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalledWith(defaultResourceId, ['testhub'], {});
      });
    });

    it('calls deleteKnowledgeHubArtifacts with correct parameters when deleting an artifact', async () => {
      renderComponent([createArtifactItem('TestArtifact', 'ParentHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalledWith(defaultResourceId, [], { testartifact: 'ParentHub' });
      });
    });

    it('calls deleteKnowledgeHubArtifacts with both hubs and artifacts', async () => {
      renderComponent([createHubItem('Hub1'), createArtifactItem('Artifact1', 'OtherHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalledWith(defaultResourceId, ['hub1'], { artifact1: 'OtherHub' });
      });
    });

    it('calls onDelete callback with notification data after successful deletion', async () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith({
          title: 'Successfully deleted the hub artifacts.',
          content: 'Deleted the following hub artifacts:\ntesthub',
        });
      });
    });

    it('calls onDelete with artifact names when deleting artifacts', async () => {
      renderComponent([createArtifactItem('TestArtifact', 'ParentHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith({
          title: 'Successfully deleted the hub artifacts.',
          content: 'Deleted the following hub artifacts:\n\ntestartifact (hub: ParentHub)',
        });
      });
    });

    it('calls onDismiss after successful deletion', async () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Loading state', () => {
    it('shows deleting text while deletion is in progress', async () => {
      // Create a promise that we can control
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteKnowledgeHubArtifacts.mockReturnValue(deletePromise);

      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(within(dialog).getByRole('button', { name: 'Deleting...' })).toBeInTheDocument();
      });

      // Resolve to clean up
      resolveDelete!();
    });

    it('disables buttons while deletion is in progress', async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteKnowledgeHubArtifacts.mockReturnValue(deletePromise);

      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const deletingButton = within(dialog).getByRole('button', { name: 'Deleting...' });
        expect(deletingButton).toBeDisabled();
        expect(within(dialog).getByRole('button', { name: 'Continue editing' })).toBeDisabled();
      });

      // Resolve to clean up
      resolveDelete!();
    });
  });

  describe('Error handling', () => {
    it('does not call onDelete or onDismiss when deletion fails', async () => {
      mockDeleteKnowledgeHubArtifacts.mockRejectedValue({ error: { message: 'Delete failed' } });

      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalled();
      });

      // Wait a bit to ensure callbacks are not called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOnDelete).not.toHaveBeenCalled();
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('resets isDeleting state after error', async () => {
      mockDeleteKnowledgeHubArtifacts.mockRejectedValue({ error: { message: 'Delete failed' } });

      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      // Wait for the error to be processed
      await waitFor(() => {
        expect(within(dialog).getByRole('button', { name: 'Delete' })).not.toBeDisabled();
      });
    });
  });

  describe('Dismiss functionality', () => {
    it('calls onDismiss when continue editing button is clicked', () => {
      renderComponent([createHubItem('TestHub')]);

      const dialog = getDialog();
      const continueButton = within(dialog).getByRole('button', { name: 'Continue editing' });
      fireEvent.click(continueButton);

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles artifacts with case-insensitive hub matching', async () => {
      // Hub with lowercase name should match parent with different casing
      renderComponent([createHubItem('PARENTHUB'), createArtifactItem('Artifact', 'parenthub')]);

      const dialog = getDialog();
      // Artifact should not appear since its parent hub is being deleted
      expect(within(dialog).queryByText(/Artifact\(s\):/)).not.toBeInTheDocument();
    });

    it('handles multiple hubs correctly', async () => {
      renderComponent([createHubItem('Hub1'), createHubItem('Hub2'), createHubItem('Hub3')]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalledWith(defaultResourceId, ['hub1', 'hub2', 'hub3'], {});
      });
    });

    it('handles multiple artifacts from different hubs', async () => {
      renderComponent([
        createArtifactItem('Artifact1', 'Hub1'),
        createArtifactItem('Artifact2', 'Hub2'),
        createArtifactItem('Artifact3', 'Hub1'),
      ]);

      const dialog = getDialog();
      const deleteButton = within(dialog).getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteKnowledgeHubArtifacts).toHaveBeenCalledWith(defaultResourceId, [], {
          artifact1: 'Hub1',
          artifact2: 'Hub2',
          artifact3: 'Hub1',
        });
      });
    });
  });
});
