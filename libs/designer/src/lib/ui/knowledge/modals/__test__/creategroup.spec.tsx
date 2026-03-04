/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { CreateGroup } from '../creategroup';

const mockCreateKnowledgeHub = vi.fn();

vi.mock('../../../../core/knowledge/utils/helper', () => ({
  createKnowledgeHub: (...args: any[]) => mockCreateKnowledgeHub(...args),
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
    const dialogs = screen.getAllByRole('dialog');
    return dialogs.find((d) => !d.closest('[aria-hidden="true"]'))!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateKnowledgeHub.mockResolvedValue({});
  });

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

  it('calls onCreate callback with group name after successful creation', async () => {
    const mockOnCreate = vi.fn();
    renderComponent({ ...defaultProps, onCreate: mockOnCreate });

    const dialog = getDialog();
    const nameInput = within(dialog).getByRole('textbox', { name: /name/i });
    fireEvent.change(nameInput, { target: { value: 'NewGroup' } });

    const createButton = within(dialog).getByRole('button', { name: 'Create' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('NewGroup');
    });
  });

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
