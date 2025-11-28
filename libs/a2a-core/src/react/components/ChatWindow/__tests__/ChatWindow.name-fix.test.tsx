import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatWindow } from '../ChatWindow';
import type { ChatWindowProps } from '../ChatWindow';

// Mock the useChatWidget hook
const mockUseChatWidget = vi.fn();
vi.mock('../../hooks/useChatWidget', () => ({
  useChatWidget: (props: any) => mockUseChatWidget(props),
}));

// Mock the components that ChatWindow uses
vi.mock('../../MessageList', () => ({
  MessageList: ({ agentName = 'Agent', userName = 'You', ...props }: any) => (
    <div data-testid="message-list">
      <div data-testid="agent-name">{agentName}</div>
      <div data-testid="user-name">{userName}</div>
    </div>
  ),
}));

vi.mock('../../MessageInput', () => ({
  MessageInput: () => <div data-testid="message-input">Message Input</div>,
}));

vi.mock('../../CompanyLogo', () => ({
  CompanyLogo: () => <div data-testid="company-logo">Logo</div>,
}));

describe('ChatWindow - Agent Name Display Fix', () => {
  const defaultProps: ChatWindowProps = {
    agentCard: {
      id: 'test-agent',
      name: 'My Custom Agent',
      description: 'A test agent',
      url: 'https://example.com',
      capabilities: {
        streaming: { enabled: true },
      },
    },
  };

  beforeEach(() => {
    // Reset the mock before each test
    mockUseChatWidget.mockReset();
  });

  it('should pass agent name from useChatWidget to MessageList', () => {
    // Set up the mock to return the agent name
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'My Custom Agent',
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    render(<ChatWindow {...defaultProps} />);

    // Check that the MessageList received the correct agentName prop
    const agentNameElement = screen.getByTestId('agent-name');
    expect(agentNameElement).toHaveTextContent('My Custom Agent');
  });

  it('should pass "You" as default userName to MessageList when not provided', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'My Custom Agent',
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    render(<ChatWindow {...defaultProps} />);

    // Check that the MessageList received "You" as default userName
    const userNameElement = screen.getByTestId('user-name');
    expect(userNameElement).toHaveTextContent('You');
  });

  it('should pass custom userName to MessageList when provided', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'My Custom Agent',
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    const propsWithUserName = {
      ...defaultProps,
      userName: 'John Doe',
    };

    render(<ChatWindow {...propsWithUserName} />);

    // Check that the MessageList received the custom userName
    const userNameElement = screen.getByTestId('user-name');
    expect(userNameElement).toHaveTextContent('John Doe');
  });

  it('should use "Agent" as default when agent card has no name', () => {
    // When the agent card has no name, useChatWidget returns 'Agent' as default
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'Agent', // This is what the real hook returns
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    const propsWithoutName = {
      agentCard: {
        ...defaultProps.agentCard,
        name: undefined,
      },
    };

    render(<ChatWindow {...propsWithoutName} />);

    // Check that the MessageList received "Agent" (from the hook)
    const agentNameElement = screen.getByTestId('agent-name');
    expect(agentNameElement).toHaveTextContent('Agent');
  });

  it('should never pass agent name as user name', () => {
    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: 'My Custom Agent',
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    render(<ChatWindow {...defaultProps} />);

    // The user name should default to "You", not the agent name
    const userNameElement = screen.getByTestId('user-name');
    expect(userNameElement).not.toHaveTextContent('My Custom Agent');
    expect(userNameElement).toHaveTextContent('You');
  });

  it('regression test: should not pass agentName as userName prop', () => {
    // This is the specific bug that was fixed
    const testAgentName = 'Test Agent';

    mockUseChatWidget.mockReturnValue({
      isConnected: true,
      agentName: testAgentName,
      sendMessage: vi.fn(),
      clearSession: vi.fn(),
      handleAuthCompleted: vi.fn(),
    });

    const propsWithTestAgent = {
      agentCard: {
        ...defaultProps.agentCard,
        name: testAgentName,
      },
    };

    render(<ChatWindow {...propsWithTestAgent} />);

    // Before the fix, userName was receiving the agentName value
    // After the fix, userName should default to "You" when not provided
    const userNameElement = screen.getByTestId('user-name');
    expect(userNameElement).toHaveTextContent('You');

    // And agentName should receive the actual agent name
    const agentNameElement = screen.getByTestId('agent-name');
    expect(agentNameElement).toHaveTextContent(testAgentName);
  });
});
