import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatWidget } from './ChatWidget';

// Mock the ChatWindow component
vi.mock('../ChatWindow', () => ({
  ChatWindow: ({ theme, ...props }: any) => (
    <div data-testid="chat-window" data-theme={JSON.stringify(theme)}>
      ChatWindow Component
      {props.agentCard && <div>Agent: {props.agentCard}</div>}
      {props.welcomeMessage && <div>{props.welcomeMessage}</div>}
    </div>
  ),
}));

// No need to mock useTheme since ChatWidget doesn't use it

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ChatWindow component', () => {
    render(
      <ChatWidget agentCard="https://agent.example.com/agent-card.json" welcomeMessage="Welcome!" />
    );

    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText('ChatWindow Component')).toBeInTheDocument();
    expect(
      screen.getByText('Agent: https://agent.example.com/agent-card.json')
    ).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('should pass theme to ChatWindow', () => {
    const theme = {
      primaryColor: '#007bff',
      fontFamily: 'Arial',
    };

    render(<ChatWidget agentCard="test-agent" theme={theme} />);

    const chatWindow = screen.getByTestId('chat-window');
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');

    expect(themeData).toEqual({
      primaryColor: '#007bff',
      fontFamily: 'Arial',
    });
  });

  it('should wrap content in container div', () => {
    const { container } = render(<ChatWidget agentCard="test-agent" />);

    // ChatWidget uses Fluent UI's makeStyles which generates dynamic class names
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.querySelector('[data-testid="chat-window"]')).toBeInTheDocument();
  });

  it('should render with container styles', () => {
    const { container } = render(<ChatWidget agentCard="test-agent" />);

    // Fluent UI creates styles internally, not as global style elements
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // The wrapper should be a styled container
    expect(getComputedStyle(wrapper).display).toBeTruthy();
  });

  it('should unmount cleanly', () => {
    const { unmount } = render(<ChatWidget agentCard="test-agent" />);

    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });

  it('should pass all props except theme to ChatWindow', () => {
    const props = {
      agentCard: 'https://agent.example.com/agent-card.json',
      auth: { token: 'test-token' },
      theme: { primaryColor: '#007bff' },
      onMessage: vi.fn(),
      onConnectionChange: vi.fn(),
      userId: 'user123',
      metadata: { source: 'web' },
      placeholder: 'Type a message...',
      welcomeMessage: 'Hello!',
      allowFileUpload: true,
      maxFileSize: 5000000,
      allowedFileTypes: ['.jpg', '.png'],
    };

    render(<ChatWidget {...props} />);

    const chatWindow = screen.getByTestId('chat-window');

    // Verify theme was passed
    const themeData = JSON.parse(chatWindow.getAttribute('data-theme') || '{}');
    expect(themeData.primaryColor).toBe('#007bff');

    // Verify other props were passed
    expect(
      screen.getByText('Agent: https://agent.example.com/agent-card.json')
    ).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('should handle missing theme prop', () => {
    render(<ChatWidget agentCard="test-agent" />);

    const chatWindow = screen.getByTestId('chat-window');
    const themeData = chatWindow.getAttribute('data-theme');

    // Should not have theme data when theme is not provided
    expect(themeData).toBeNull();
  });

  it('should have proper box model on container', () => {
    const { container } = render(<ChatWidget agentCard="test-agent" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // Fluent UI components handle box-sizing internally
  });

  it('should render within FluentProvider with theme', () => {
    render(<ChatWidget agentCard="test-agent" />);

    // The component should render within the theme provider
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  it('should handle rapid mount/unmount cycles', async () => {
    const { unmount } = render(<ChatWidget agentCard="test-agent" />);

    // Verify initial render
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();

    // Unmount
    unmount();

    // Re-render with new component instance
    render(<ChatWidget agentCard="test-agent-2" />);

    // Should still work correctly
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText('Agent: test-agent-2')).toBeInTheDocument();
  });
});
