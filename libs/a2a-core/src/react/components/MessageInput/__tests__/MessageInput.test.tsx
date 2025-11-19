import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../MessageInput';
import { useChatStore } from '../../../store/chatStore';

// Mock the store
vi.mock('../../../store/chatStore');

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn();
  const mockUseChatStore = useChatStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock - connected and not loading
    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: false,
      authRequired: null,
      getIsTypingForContext: () => false,
      getAuthRequiredForContext: () => null,
    });
  });

  it('should be disabled when not connected', () => {
    mockUseChatStore.mockReturnValue({
      isConnected: false,
      isTyping: false,
      authRequired: null,
      getIsTypingForContext: vi.fn().mockReturnValue(false),
      getAuthRequiredForContext: vi.fn().mockReturnValue(null),
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should be disabled when SSE stream is active (isTyping is true)', () => {
    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: true,
      authRequired: null,
      getIsTypingForContext: vi.fn().mockReturnValue(true),
      getAuthRequiredForContext: vi.fn().mockReturnValue(null),
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should be disabled when auth is required (pending)', () => {
    const mockAuthEvent = {
      taskId: 'test-task',
      contextId: 'test-context',
      authParts: [
        {
          serviceName: 'Test Service',
          consentLink: 'https://example.com/auth',
          status: 'pending',
        },
      ],
      messageType: 'auth-required',
    };

    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: false,
      authRequired: mockAuthEvent,
      getIsTypingForContext: vi.fn().mockReturnValue(false),
      getAuthRequiredForContext: vi.fn().mockReturnValue(mockAuthEvent),
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should be enabled when connected, not streaming, and no auth required', async () => {
    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: false,
      authRequired: null,
      getIsTypingForContext: () => false,
      getAuthRequiredForContext: () => null,
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(textarea).not.toBeDisabled();

    // Type a message
    await userEvent.type(textarea, 'Hello');

    expect(sendButton).not.toBeDisabled();

    // Send the message
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello', []);
    });
  });

  it('should show appropriate status message when streaming', () => {
    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: true,
      authRequired: null,
      getIsTypingForContext: () => true,
      getAuthRequiredForContext: () => null,
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} contextId="test-context" />);

    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
  });

  it('should show appropriate status message when auth is required', () => {
    const mockAuthEvent = {
      taskId: 'test-task',
      contextId: 'test-context',
      authParts: [
        {
          serviceName: 'Test Service',
          consentLink: 'https://example.com/auth',
          status: 'pending',
        },
      ],
      messageType: 'auth-required',
    };

    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: false,
      authRequired: mockAuthEvent,
      getIsTypingForContext: () => false,
      getAuthRequiredForContext: () => mockAuthEvent,
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} contextId="test-context" />);

    expect(screen.getByText('Authentication in progress...')).toBeInTheDocument();
  });

  it('should prioritize "Agent is typing..." over "Authentication in progress..."', () => {
    const mockAuthEvent = {
      taskId: 'test-task',
      contextId: 'test-context',
      authParts: [
        {
          serviceName: 'Test Service',
          consentLink: 'https://example.com/auth',
          status: 'pending',
        },
      ],
      messageType: 'auth-required',
    };

    mockUseChatStore.mockReturnValue({
      isConnected: true,
      isTyping: true,
      authRequired: mockAuthEvent,
      getIsTypingForContext: () => true,
      getAuthRequiredForContext: () => mockAuthEvent,
    });

    render(<MessageInput onSendMessage={mockOnSendMessage} contextId="test-context" />);

    // Should only show "Agent is typing..." due to priority
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
    expect(screen.queryByText('Authentication in progress...')).not.toBeInTheDocument();
  });
});
