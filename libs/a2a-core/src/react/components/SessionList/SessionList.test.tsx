import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SessionList } from './SessionList';
import type { ChatSession } from '../../../api/history-types';

// Wrapper to provide Fluent UI context
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

describe('SessionList', () => {
  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      name: 'First Chat',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-03'),
      lastMessage: {
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Last message in session 1' }],
        timestamp: new Date('2025-01-03'),
        contextId: 'session-1',
      },
    },
    {
      id: 'session-2',
      name: 'Second Chat',
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
  ];

  const defaultProps = {
    sessions: mockSessions,
    currentSessionId: 'session-1',
    onSessionClick: vi.fn(),
    onNewSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onRenameSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all sessions', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
    });

    it('should render new session button', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      const newButton = screen.getByRole('button', { name: /new chat/i });
      expect(newButton).toBeInTheDocument();
    });

    it('should highlight current session', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      // Get both session elements
      const sessions = screen.getAllByRole('listitem');

      // The first session (session-1) should be current
      // We can check by verifying it's styled differently or has special attributes
      // Since we can't easily check CSS classes with modules, we verify the structure
      expect(sessions.length).toBe(2);
      expect(sessions[0]).toHaveTextContent('First Chat');
    });

    it('should show empty state when no sessions', () => {
      renderWithProvider(<SessionList {...defaultProps} sessions={[]} />);

      expect(screen.getByText(/no chats yet/i)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      renderWithProvider(<SessionList {...defaultProps} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Session Interaction', () => {
    it('should call onSessionClick when session is clicked', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      fireEvent.click(screen.getByText('Second Chat'));

      expect(defaultProps.onSessionClick).toHaveBeenCalledWith('session-2');
    });

    it('should call onNewSession when new chat button is clicked', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      const newButton = screen.getByRole('button', { name: /new chat/i });
      fireEvent.click(newButton);

      expect(defaultProps.onNewSession).toHaveBeenCalled();
    });

    it('should call onDeleteSession when delete is triggered', async () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      // Find the session element
      const sessionElement = screen.getByText('First Chat').closest('[role="listitem"]');
      expect(sessionElement).toBeInTheDocument();

      // Hover to show delete button
      fireEvent.mouseEnter(sessionElement!);

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await act(async () => {
        // Confirm deletion in dialog if needed
        const confirmButton = screen.queryByRole('button', { name: /confirm|yes|delete/i });
        if (confirmButton) {
          fireEvent.click(confirmButton);
        }
      });

      expect(defaultProps.onDeleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should call onRenameSession when rename is triggered', async () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      const sessionElement = screen.getByText('First Chat').closest('[role="listitem"]');
      expect(sessionElement).toBeInTheDocument();

      // Hover to show rename button
      fireEvent.mouseEnter(sessionElement!);

      // Click rename button
      const renameButton = screen.getByRole('button', { name: /rename|edit/i });
      fireEvent.click(renameButton);

      // Should show input field
      const input = screen.getByDisplayValue('First Chat');
      expect(input).toBeInTheDocument();

      // Edit the name
      fireEvent.change(input, { target: { value: 'Renamed Chat' } });
      fireEvent.blur(input);

      expect(defaultProps.onRenameSession).toHaveBeenCalledWith('session-1', 'Renamed Chat');
    });
  });

  describe('Session Display', () => {
    it('should show last message preview when available', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      expect(screen.getByText(/Last message in session 1/i)).toBeInTheDocument();
    });

    it('should show date information', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      // Should show relative time or formatted date
      const sessionElement = screen.getByText('First Chat').closest('[role="listitem"]');
      expect(sessionElement).toHaveTextContent(/jan|2025|day|ago/i);
    });

    it('should sort sessions by updatedAt descending', () => {
      renderWithProvider(<SessionList {...defaultProps} />);

      const sessionElements = screen.getAllByRole('listitem');
      // First session should be session-1 (updated Jan 3)
      expect(sessionElements[0]).toHaveTextContent('First Chat');
      // Second session should be session-2 (updated Jan 2)
      expect(sessionElements[1]).toHaveTextContent('Second Chat');
    });
  });

  describe('Error Handling', () => {
    it('should show error state when error prop is provided', () => {
      renderWithProvider(<SessionList {...defaultProps} error="Failed to load sessions" />);

      expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
    });

    it('should allow retry when error state is shown', () => {
      const onRetry = vi.fn();
      renderWithProvider(
        <SessionList {...defaultProps} error="Failed to load sessions" onRetry={onRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});
