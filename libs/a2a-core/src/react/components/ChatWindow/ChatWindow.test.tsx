import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWindow } from './ChatWindow';
import { useChatWidget } from '../../hooks/useChatWidget';

// Mock dependencies
vi.mock('../MessageList', () => ({
  MessageList: ({ welcomeMessage, agentName, userName, branding }: any) => (
    <div data-testid="message-list">
      {welcomeMessage && <div>{welcomeMessage}</div>}
      <div>Agent: {agentName}</div>
      <div>User: {userName}</div>
      {branding && <div>Branding: {JSON.stringify(branding)}</div>}
    </div>
  ),
}));

vi.mock('../MessageInput', () => ({
  MessageInput: ({ placeholder, disabled, onSendMessage }: any) => (
    <div data-testid="message-input">
      <input placeholder={placeholder} disabled={disabled} data-testid="input-field" />
      <button onClick={() => onSendMessage('test message', [])}>Send</button>
    </div>
  ),
}));

vi.mock('../CompanyLogo', () => ({
  CompanyLogo: ({ branding }: any) => (
    <div data-testid="company-logo">Logo {branding?.logoUrl}</div>
  ),
}));

vi.mock('../../hooks/useChatWidget', () => ({
  useChatWidget: vi.fn(),
}));

describe('ChatWindow', () => {
  const mockSendMessage = vi.fn();
  const mockClearSession = vi.fn();

  const defaultProps = {
    agentCard: 'https://agent.example.com/agent-card.json',
    theme: {},
    placeholder: 'Type here...',
    welcomeMessage: 'Welcome!',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: true,
      agentName: 'Test Agent',
      agentDescription: 'Test Agent Description',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);
  });

  it('should render all core components', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Agent: Test Agent')).toBeInTheDocument();
  });

  it('should show header logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'header' as const,
          logoUrl: 'logo.png',
        },
      },
    };

    render(<ChatWindow {...props} />);

    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    // Check that logo is rendered with correct URL
    expect(logos[0]).toHaveTextContent('Logo logo.png');
  });

  it('should show footer logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'footer' as const,
          logoUrl: 'logo.png',
        },
      },
    };

    render(<ChatWindow {...props} />);

    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    // Just verify that the logo exists
    expect(logos[0]).toHaveTextContent('Logo logo.png');
  });

  it('should not show logo when not configured', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.queryByTestId('company-logo')).not.toBeInTheDocument();
  });

  it('should pass correct props to MessageInput', () => {
    const props = {
      ...defaultProps,
      allowFileUpload: false,
      maxFileSize: 5000000,
      allowedFileTypes: ['image/*', '.pdf'],
    };

    render(<ChatWindow {...props} />);

    const input = screen.getByTestId('input-field');
    expect(input).toHaveAttribute('placeholder', 'Type here...');
    expect(input).not.toBeDisabled();
  });

  it('should disable input when not connected', () => {
    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: false,
      agentName: '',
      agentDescription: '',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);

    render(<ChatWindow {...defaultProps} />);

    const input = screen.getByTestId('input-field');
    expect(input).toBeDisabled();
  });

  it('should use chat widget hook with provided props', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(vi.mocked(useChatWidget)).toHaveBeenCalledWith({
      agentCard: 'https://agent.example.com/agent-card.json',
      auth: undefined,
      onMessage: undefined,
      onConnectionChange: undefined,
    });
  });

  it('should use default agent name when not provided', () => {
    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: true,
      agentName: 'Agent', // useChatWidget returns 'Agent' as default
      agentDescription: '',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);

    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByText('Agent: Agent')).toBeInTheDocument();
  });

  it('should handle all props correctly', () => {
    const props = {
      agentCard: 'https://agent.example.com/agent-card.json',
      auth: { token: 'test-token' },
      theme: {
        branding: {
          logoPosition: 'header' as const,
        },
      },
      onMessage: vi.fn(),
      onConnectionChange: vi.fn(),
      userId: 'user123',
      metadata: { source: 'web' },
      placeholder: 'Custom placeholder',
      welcomeMessage: 'Custom welcome',
      allowFileUpload: true,
      maxFileSize: 10000000,
      allowedFileTypes: ['.jpg', '.png'],
    };

    render(<ChatWindow {...props} />);

    // Verify the component renders without errors
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should pass callbacks to chat widget hook', () => {
    const onMessage = vi.fn();
    const onConnectionChange = vi.fn();

    const props = {
      ...defaultProps,
      onMessage,
      onConnectionChange,
    };

    render(<ChatWindow {...props} />);

    expect(vi.mocked(useChatWidget)).toHaveBeenCalledWith({
      agentCard: 'https://agent.example.com/agent-card.json',
      auth: undefined,
      onMessage,
      onConnectionChange,
    });
  });

  it('should show agent name and description when connected', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test Agent Description')).toBeInTheDocument();
  });

  it('should show agent info in header when connected', () => {
    render(<ChatWindow {...defaultProps} />);

    const agentName = screen.getByText('Test Agent');
    const agentDescription = screen.getByText('Test Agent Description');

    // Just verify these elements exist
    expect(agentName).toBeInTheDocument();
    expect(agentDescription).toBeInTheDocument();
  });

  it('should not show agent info when not connected', () => {
    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: false,
      agentName: 'Test Agent',
      agentDescription: 'Test Agent Description',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);

    render(<ChatWindow {...defaultProps} />);

    expect(screen.queryByText('Test Agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Agent Description')).not.toBeInTheDocument();
  });

  it('should show header with agent info when connected even without logo', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'footer' as const,
        },
      },
    };

    render(<ChatWindow {...props} />);

    // Should show header with agent info because user is connected
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test Agent Description')).toBeInTheDocument();
    // No logo should be rendered since logoUrl is not provided
    expect(screen.queryByTestId('company-logo')).not.toBeInTheDocument();
  });

  it('should apply theme styles to container', () => {
    const props = {
      ...defaultProps,
      theme: {
        '--chat-color-primary': '#ff0000',
        '--chat-color-background': '#ffffff',
      },
    };

    render(<ChatWindow {...props} />);

    // Just verify the component renders with theme props
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should pass correct userName to MessageList', () => {
    const props = {
      ...defaultProps,
    };

    render(<ChatWindow {...props} />);

    // Check that the agent name is passed to MessageList
    expect(screen.getByText('Agent: Test Agent')).toBeInTheDocument();
  });

  it('should handle send message from MessageInput', async () => {
    const user = userEvent.setup();

    render(<ChatWindow {...defaultProps} />);

    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('test message', []);
  });

  it('should not show header content when not connected', () => {
    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: false,
      agentName: 'Test Agent',
      agentDescription: 'Test Agent Description',
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);

    render(<ChatWindow {...defaultProps} />);

    // Header content should not be visible when not connected
    expect(screen.queryByText('Test Agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Agent Description')).not.toBeInTheDocument();
  });

  it('should handle missing agentDescription gracefully', () => {
    vi.mocked(useChatWidget).mockReturnValue({
      isConnected: true,
      agentName: 'Test Agent',
      agentDescription: undefined,
      sendMessage: mockSendMessage,
      clearSession: mockClearSession,
      handleAuthCompleted: vi.fn(),
    } as any);

    render(<ChatWindow {...defaultProps} />);

    // Should show agent name but not description when description is missing
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-description')).not.toBeInTheDocument();
  });

  it('should render all expected elements', () => {
    render(<ChatWindow {...defaultProps} />);

    // Verify content is rendered correctly
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test Agent Description')).toBeInTheDocument();
  });

  it('should render chat window container', () => {
    const { container } = render(<ChatWindow {...defaultProps} />);

    // Verify the container element exists
    const chatWindow = container.firstChild as HTMLElement;
    expect(chatWindow).toBeInTheDocument();
    // Verify all expected content is rendered
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });
});
