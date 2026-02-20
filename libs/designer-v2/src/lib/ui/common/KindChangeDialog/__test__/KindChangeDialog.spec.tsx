import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { KindChangeDialog } from '../KindChangeDialog';

// Mock react-redux
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}));

// Mock react-intl
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
    }),
  };
});

// Mock the modal selectors
let mockKindChangeDialogType: string | null = null;
const mockCloseKindChangeDialogAction = { type: 'modal/closeKindChangeDialog' };
vi.mock('../../../../core', () => ({
  useKindChangeDialogType: () => mockKindChangeDialogType,
  closeKindChangeDialog: () => mockCloseKindChangeDialogAction,
}));

describe('KindChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKindChangeDialogType = null;
  });

  it('should not render dialog content when kindChangeDialogType is null', () => {
    mockKindChangeDialogType = null;

    render(<KindChangeDialog />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render dialog with toA2A description when kindChangeDialogType is toA2A', () => {
    mockKindChangeDialogType = 'toA2A';

    render(<KindChangeDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Update workflow before using this trigger')).toBeInTheDocument();
    expect(screen.getByText(/Using a chat message trigger means your workflow will be conversational/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('should render dialog with toStateful description when kindChangeDialogType is toStateful', () => {
    mockKindChangeDialogType = 'toStateful';

    render(<KindChangeDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Update workflow before using this trigger')).toBeInTheDocument();
    expect(screen.getByText(/Using this trigger changes your workflow to a type that doesn.t support handoffs/)).toBeInTheDocument();
  });

  it('should render dialog with fromStateless description when kindChangeDialogType is fromStateless', () => {
    mockKindChangeDialogType = 'fromStateless';

    render(<KindChangeDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Invalid trigger for stateless workflow')).toBeInTheDocument();
    expect(screen.getByText(/This preview version of logic apps does not yet support stateless logic apps/)).toBeInTheDocument();
  });

  it('should dispatch closeKindChangeDialog action when Close button is clicked', () => {
    mockKindChangeDialogType = 'toA2A';

    render(<KindChangeDialog />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith(mockCloseKindChangeDialogAction);
  });
});
