import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthenticationMessage } from '../AuthenticationMessage';
import type { AuthRequiredPart } from '../../../types';

// Mock the popup window utility
vi.mock('../../../../utils/popup-window', () => ({
  openPopupWindow: vi.fn(),
}));

import { openPopupWindow } from '../../../../utils/popup-window';

describe('AuthenticationMessage', () => {
  const mockOpenPopupWindow = openPopupWindow as ReturnType<typeof vi.fn>;
  const mockOnAuthenticate = vi.fn();
  const mockOnCancel = vi.fn();

  const mockAuthParts: AuthRequiredPart[] = [
    {
      serviceName: 'External Service',
      consentLink: 'https://example.com/auth',
      description: 'This action requires authentication with an external service.',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display pending state correctly', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('External Service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByText('Authenticated')).not.toBeInTheDocument();
  });

  it('should display completed state correctly', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="completed"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    expect(screen.getByText('Authentication Completed')).toBeInTheDocument();
    expect(screen.getByText('External Service')).toBeInTheDocument();
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('All services authenticated successfully')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it('should display failed state correctly', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="failed"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    // Failed state doesn't show additional text, just the title and auth parts
  });

  it('should show cancel button when onCancel is provided and status is pending', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Cancel Authentication')).toBeInTheDocument();
  });

  it('should show canceled state when cancel button is clicked', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel Authentication');
    fireEvent.click(cancelButton);

    expect(screen.getByText('Authentication Canceled')).toBeInTheDocument();
    expect(screen.getByText('Authentication request was canceled.')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should not show cancel button when status is completed', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="completed"
        onAuthenticate={mockOnAuthenticate}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Cancel Authentication')).not.toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel Authentication');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should handle successful authentication', async () => {
    mockOpenPopupWindow.mockResolvedValueOnce({ closed: true, error: null });

    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockOpenPopupWindow).toHaveBeenCalledWith('https://example.com/auth', 'auth-0', {
        width: 800,
        height: 600,
      });
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
      expect(mockOnAuthenticate).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable cancel button while authentication is in progress', async () => {
    mockOpenPopupWindow.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
        onCancel={mockOnCancel}
      />
    );

    const signInButton = screen.getByText('Sign In');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel Authentication');
    expect(cancelButton).toBeDisabled();
  });

  it('should initialize auth states correctly based on status', () => {
    const { rerender } = render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="pending"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    // Initially pending
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();

    // Rerender with completed status
    rerender(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="completed"
        onAuthenticate={mockOnAuthenticate}
      />
    );

    // Should now show completed state
    expect(screen.getByText('Authentication Completed')).toBeInTheDocument();
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });
});
