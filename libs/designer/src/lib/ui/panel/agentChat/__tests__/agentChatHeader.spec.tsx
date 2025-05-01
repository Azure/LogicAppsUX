import { IntlProvider } from 'react-intl';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import { AgentChatHeader } from '../agentChatHeader';
// biome-ignore lint/correctness/noUnusedImports: using react for render intlProvider
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
import { renderWithRedux } from '../../../../__test__/redux-test-helper';

// Create a mock function for useIsDarkMode that can be reset for each test
const mockIsDarkMode = vi.fn();

// Mock the useIsDarkMode hook
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useIsDarkMode: () => mockIsDarkMode(),
}));

describe('AgentChatHeader', () => {
  const mockOnToggleCollapse = vi.fn();
  const mockOnStopChat = vi.fn();
  const mockOnRefreshChat = vi.fn();

  const renderComponent = ({ showStopButton }) => {
    const queryClient = getReactQueryClient();

    return renderWithRedux(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">
          <AgentChatHeader
            title="Test Title"
            onStopChat={mockOnStopChat}
            onRefreshChat={mockOnRefreshChat}
            onToggleCollapse={mockOnToggleCollapse}
            showStopButton={showStopButton}
          />
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockOnToggleCollapse.mockReset();
    mockIsDarkMode.mockReset();
  });

  it('renders correctly and matches snapshot with dark mode off', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent({ showStopButton: false });
    expect(header).toMatchSnapshot();
    getReactQueryClient;
  });

  it('renders correctly and matches snapshot when showing stop button', () => {
    const header = renderComponent({ showStopButton: true });
    expect(header).toMatchSnapshot();
    getReactQueryClient;
  });

  it('renders correctly when dark mode is on', () => {
    mockIsDarkMode.mockReturnValue(true);
    const header = renderComponent({ showStopButton: false });
    expect(header).toMatchSnapshot();
  });

  it('calls onToggleCollapse when button is clicked', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent({ showStopButton: false });

    const container = header.root;
    container.findByProps({ id: 'msla-agent-chat-header-collapse' }).props.onClick();
    expect(mockOnToggleCollapse).toHaveBeenCalled();
  });

  it('calls onRefresh when button is clicked', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent({ showStopButton: false });

    const container = header.root;
    container.findByProps({ id: 'msla-agent-chat-header-refresh' }).props.onClick();
    expect(mockOnRefreshChat).toHaveBeenCalled();
  });

  it('calls onStopChat when button is clicked', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent({ showStopButton: true });

    const container = header.root;
    container.findByProps({ id: 'msla-agent-chat-header-stop' }).props.onClick();
    expect(mockOnStopChat).toHaveBeenCalled();
  });
});
