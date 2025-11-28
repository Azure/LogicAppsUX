import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { MessageList } from './MessageList';
import { useChatStore } from '../../store/chatStore';
import type { Message as MessageType } from '../../types';

// Mock dependencies
vi.mock('../../store/chatStore');
vi.mock('../Message', () => ({
  Message: ({ message, agentName, userName }: any) => (
    <div data-testid={`message-${message.id}`}>
      <span>{message.content}</span>
      <span>{message.sender}</span>
      <span>{agentName}</span>
      <span>{userName}</span>
    </div>
  ),
}));
vi.mock('../TypingIndicator', () => ({
  TypingIndicator: ({ agentName }: any) => (
    <div data-testid="typing-indicator">{agentName} is typing...</div>
  ),
}));

describe('MessageList', () => {
  const mockUseChatStore = vi.mocked(useChatStore);
  const mockMessages: MessageType[] = [
    {
      id: '1',
      content: 'Hello',
      sender: 'user',
      timestamp: new Date('2024-01-01T10:00:00'),
      status: 'sent',
    },
    {
      id: '2',
      content: 'Hi there!',
      sender: 'assistant',
      timestamp: new Date('2024-01-01T10:01:00'),
      status: 'sent',
    },
  ];

  // Helper to setup mock store state
  const setupMockStore = (overrides: Partial<any> = {}) => {
    const mockState = {
      messages: [],
      isTyping: false,
      isConnected: true,
      pendingUploads: new Map(),
      sessionMessages: new Map(),
      typingByContext: new Map(),
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      setMessages: vi.fn(),
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      addPendingUpload: vi.fn(),
      updatePendingUpload: vi.fn(),
      removePendingUpload: vi.fn(),
      clearMessages: vi.fn(),
      ...overrides,
    };
    mockUseChatStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockStore();
  });

  it('renders empty list with no messages', () => {
    render(<MessageList />);

    const messageElements = screen.queryAllByTestId(/^message-/);
    expect(messageElements).toHaveLength(0);
  });

  it('renders welcome message when no messages and welcomeMessage provided', () => {
    render(<MessageList welcomeMessage="Welcome to the chat!" />);

    expect(screen.getByText('Welcome to the chat!')).toBeInTheDocument();
  });

  it('does not render welcome message when messages exist', () => {
    setupMockStore({ messages: mockMessages });

    render(<MessageList welcomeMessage="Welcome to the chat!" />);

    expect(screen.queryByText('Welcome to the chat!')).not.toBeInTheDocument();
  });

  it('renders all messages', () => {
    setupMockStore({ messages: mockMessages });

    render(<MessageList />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('passes agentName to Message components', () => {
    setupMockStore({ messages: mockMessages });

    render(<MessageList agentName="Support Bot" />);

    const message2 = screen.getByTestId('message-2');
    expect(message2).toHaveTextContent('Support Bot');
  });

  it('uses default agentName when not provided', () => {
    setupMockStore({ messages: [mockMessages[1]] }); // Only assistant message

    render(<MessageList />);

    const message = screen.getByTestId('message-2');
    expect(message).toHaveTextContent('Agent');
  });

  it('passes userName to Message components', () => {
    setupMockStore({ messages: mockMessages });

    render(<MessageList userName="John" />);

    const message1 = screen.getByTestId('message-1');
    expect(message1).toHaveTextContent('John');
  });

  it('shows typing indicator when isTyping is true', () => {
    setupMockStore({ isTyping: true });

    render(<MessageList />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
  });

  it('does not show typing indicator when isTyping is false', () => {
    render(<MessageList />);

    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('passes agentName to typing indicator', () => {
    setupMockStore({ isTyping: true });

    render(<MessageList agentName="AI Assistant" />);

    expect(screen.getByText('AI Assistant is typing...')).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<MessageList />);

    const messageList = container.firstChild as HTMLElement;
    // Test that it's rendered as a scrollable container
    expect(messageList).toBeInTheDocument();
    expect(getComputedStyle(messageList).overflowY).toBe('auto');
  });

  it.skip('scrolls to bottom when messages change', () => {
    const mockScrollElement = document.createElement('div');
    mockScrollElement.scrollTop = 0;
    Object.defineProperty(mockScrollElement, 'scrollHeight', {
      value: 1000,
      writable: false,
    });

    const scrollSpy = vi.spyOn(mockScrollElement, 'scrollTop', 'set');

    vi.spyOn(React, 'useRef').mockReturnValue({ current: mockScrollElement });

    const { rerender } = render(<MessageList />);

    // Update messages
    setupMockStore({ messages: mockMessages });

    rerender(<MessageList />);

    expect(scrollSpy).toHaveBeenCalledWith(1000);
  });

  it.skip('scrolls to bottom when typing status changes', () => {
    const mockScrollElement = document.createElement('div');
    mockScrollElement.scrollTop = 0;
    Object.defineProperty(mockScrollElement, 'scrollHeight', {
      value: 800,
      writable: false,
    });

    const scrollSpy = vi.spyOn(mockScrollElement, 'scrollTop', 'set');

    vi.spyOn(React, 'useRef').mockReturnValue({ current: mockScrollElement });

    const { rerender } = render(<MessageList />);

    // Update typing status
    setupMockStore({ isTyping: true });

    rerender(<MessageList />);

    expect(scrollSpy).toHaveBeenCalledWith(800);
  });

  it('renders welcome message with correct styling', () => {
    render(<MessageList welcomeMessage="Welcome!" />);

    const welcomeDiv = screen.getByText('Welcome!');
    expect(welcomeDiv).toBeInTheDocument();
    // Test computed styles instead of class names
    const styles = getComputedStyle(welcomeDiv);
    expect(styles.textAlign).toBe('center');
  });

  it('maintains message order', () => {
    const orderedMessages: MessageType[] = [
      {
        id: '1',
        content: 'First',
        sender: 'user',
        timestamp: new Date('2024-01-01T10:00:00'),
        status: 'sent',
      },
      {
        id: '2',
        content: 'Second',
        sender: 'assistant',
        timestamp: new Date('2024-01-01T10:01:00'),
        status: 'sent',
      },
      {
        id: '3',
        content: 'Third',
        sender: 'user',
        timestamp: new Date('2024-01-01T10:02:00'),
        status: 'sent',
      },
    ];

    setupMockStore({ messages: orderedMessages });

    render(<MessageList />);

    const messageElements = screen.getAllByTestId(/^message-/);
    expect(messageElements).toHaveLength(3);
    expect(messageElements[0]).toHaveTextContent('First');
    expect(messageElements[1]).toHaveTextContent('Second');
    expect(messageElements[2]).toHaveTextContent('Third');
  });

  it('handles empty welcomeMessage prop', () => {
    const { container } = render(<MessageList welcomeMessage="" />);

    // Empty welcome message should not render
    const welcomeDiv = container.querySelector('.welcomeMessage');
    expect(welcomeDiv).not.toBeInTheDocument();
  });

  it('renders both messages and typing indicator when both present', () => {
    setupMockStore({ messages: mockMessages, isTyping: true });

    render(<MessageList />);

    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });
});
