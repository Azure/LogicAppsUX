/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { CreateGroup } from '../creategroup';

const mockCreateKnowledgeHub = vi.fn();
const mockValidateHubNameAvailability = vi.fn();

vi.mock('../../../../core/knowledge/utils/helper', () => ({
  createKnowledgeHub: (...args: any[]) => mockCreateKnowledgeHub(...args),
  validateHubNameAvailability: (...args: any[]) => mockValidateHubNameAvailability(...args),
}));

const mockUseAllKnowledgeHubs = vi.fn();

vi.mock('../../../../core/knowledge/utils/queries', () => ({
  useAllKnowledgeHubs: (...args: any[]) => mockUseAllKnowledgeHubs(...args),
}));

// Mock styles
vi.mock('../styles', () => ({
  useModalStyles: () => ({
    groupContainer: 'mock-group-container',
    groupSection: 'mock-group-section',
    actions: 'mock-actions',
  }),
}));

describe('CreateGroup Component', () => {
  const defaultProps = {
    resourceId: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp',
    onDismiss: vi.fn(),
    onCreate: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    const finalProps = { ...defaultProps, ...props };
    return render(
      <IntlProvider locale="en">
        <CreateGroup {...finalProps} />
      </IntlProvider>
    );
  };

  // Helper to get elements within the non-hidden dialog
  const getDialog = () => {
    const dialogs = screen.getAllByRole('alertdialog');
    return dialogs.find((d) => !d.closest('[aria-hidden="true"]'))!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateKnowledgeHub.mockResolvedValue({});
    mockValidateHubNameAvailability.mockReturnValue(undefined);
    mockUseAllKnowledgeHubs.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders with correct title and subtitle', () => {
      renderComponent();

      expect(screen.getByText('Create a new group')).toBeInTheDocument();
      expect(screen.getByText('Provide details to create a new group.')).toBeInTheDocument();
    });

    it('renders name and description input fields', () => {
      renderComponent();

      const dialog = getDialog();
      expect(within(dialog).getByText('Name')).toBeInTheDocument();
      expect(within(dialog).getByText('Description')).toBeInTheDocument();
    });

    it('renders as an open dialog', () => {
      renderComponent();

      const dialog = getDialog();
      expect(dialog).toBeInTheDocument();
    });

    it('renders Create and Cancel buttons', () => {
      renderComponent();

      const dialog = getDialog();
      expect(within(dialog).getByRole('button', { name: 'Create' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders close button in dialog title', () => {
      renderComponent();

      const dialog = getDialog();
      const closeButton = within(dialog).getByRole('button', { name: 'close' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when hubs are loading', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('hides input fields when loading', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      const dialog = getDialog();
      expect(within(dialog).queryByRole('textbox', { name: /name/i })).not.toBeInTheDocument();
    });

    it('shows input fields when loading completes', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderComponent();

      const dialog = getDialog();
      expect(within(dialog).getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    });
  });

  describe('Create Button State', () => {
    it('disables create button when name is empty', () => {
      renderComponent();

      const dialog = getDialog();
      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      expect(createButton).toBeDisabled();
    });

    it('enables create button when name is provided', () => {
      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'MyGroup' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      expect(createButton).not.toBeDisabled();
    });

    it('disables create button when name has validation error', () => {
      mockValidateHubNameAvailability.mockReturnValue('Name already exists');

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'ExistingGroup' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Name Validation', () => {
    it('calls validateHubNameAvailability when name changes', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'ExistingHub' }],
        isLoading: false,
      });

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'NewGroup' } });

      expect(mockValidateHubNameAvailability).toHaveBeenCalledWith('NewGroup', ['existinghub']);
    });

    it('displays validation error message', () => {
      mockValidateHubNameAvailability.mockReturnValue('Name already exists');

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'ExistingGroup' } });

      expect(screen.getByText('Name already exists')).toBeInTheDocument();
    });

    it('clears validation error when name becomes valid', () => {
      mockValidateHubNameAvailability.mockReturnValueOnce('Name already exists').mockReturnValueOnce(undefined);

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });

      fireEvent.change(nameInput, { target: { value: 'ExistingGroup' } });
      expect(screen.getByText('Name already exists')).toBeInTheDocument();

      fireEvent.change(nameInput, { target: { value: 'ValidGroup' } });
      expect(screen.queryByText('Name already exists')).not.toBeInTheDocument();
    });
  });

  describe('Create Functionality', () => {
    it('calls createKnowledgeHub with correct parameters when create is clicked', async () => {
      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      const descriptionInput = within(dialog).getByRole('textbox', { name: /description/i });

      fireEvent.change(nameInput, { target: { value: 'TestGroup' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateKnowledgeHub).toHaveBeenCalledWith(defaultProps.resourceId, 'TestGroup', 'Test description');
      });
    });

    it('calls onCreate callback with group name and description after successful creation', async () => {
      const mockOnCreate = vi.fn();
      renderComponent({ onCreate: mockOnCreate });

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      const descriptionInput = within(dialog).getByRole('textbox', { name: /description/i });

      fireEvent.change(nameInput, { target: { value: 'NewGroup' } });
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith('NewGroup', 'New description');
      });
    });

    it('shows "Creating..." text while creation is in progress', async () => {
      mockCreateKnowledgeHub.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'TestGroup' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    it('disables cancel button while creation is in progress', async () => {
      mockCreateKnowledgeHub.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'TestGroup' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      fireEvent.click(createButton);

      await waitFor(() => {
        const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
        expect(cancelButton).toBeDisabled();
      });
    });

    it('creates group with empty description when description is not provided', async () => {
      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'GroupWithoutDesc' } });

      const createButton = within(dialog).getByRole('button', { name: 'Create' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateKnowledgeHub).toHaveBeenCalledWith(defaultProps.resourceId, 'GroupWithoutDesc', '');
      });
    });
  });

  describe('Input Changes', () => {
    it('updates name state when input changes', () => {
      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i }) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'UpdatedName' } });

      expect(nameInput.value).toBe('UpdatedName');
    });

    it('updates description state when textarea changes', () => {
      renderComponent();

      const dialog = getDialog();
      const descriptionInput = within(dialog).getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      expect(descriptionInput.value).toBe('Updated description');
    });
  });

  describe('Cancel and Dismiss', () => {
    it('calls onDismiss when cancel button is clicked', () => {
      const mockOnDismiss = vi.fn();
      renderComponent({ onDismiss: mockOnDismiss });

      const dialog = getDialog();
      const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Existing Hubs Integration', () => {
    it('passes existing hub names to validation', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1' }, { name: 'Hub2' }, { name: 'TestHub' }],
        isLoading: false,
      });

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'NewHub' } });

      expect(mockValidateHubNameAvailability).toHaveBeenCalledWith('NewHub', ['hub1', 'hub2', 'testhub']);
    });

    it('handles empty hubs array', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'FirstHub' } });

      expect(mockValidateHubNameAvailability).toHaveBeenCalledWith('FirstHub', []);
    });

    it('handles undefined hubs data', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderComponent();

      const dialog = getDialog();
      const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'NewHub' } });

      expect(mockValidateHubNameAvailability).toHaveBeenCalledWith('NewHub', []);
    });
  });
});
