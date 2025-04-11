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
  const mockToggleCollapse = vi.fn();

  const renderComponent = () => {
    const queryClient = getReactQueryClient();

    return renderWithRedux(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">
          <AgentChatHeader title="Test Title" toggleCollapse={mockToggleCollapse} />
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockToggleCollapse.mockReset();
    mockIsDarkMode.mockReset();
  });

  it('renders correctly and matches snapshot with dark mode off', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent();
    expect(header).toMatchSnapshot();
    getReactQueryClient;
  });

  it('renders correctly when dark mode is on', () => {
    mockIsDarkMode.mockReturnValue(true);
    const header = renderComponent();
    expect(header).toMatchSnapshot();
  });

  it('calls toggleCollapse when button is clicked', () => {
    mockIsDarkMode.mockReturnValue(false);
    const header = renderComponent();

    const container = header.root;
    container.findByProps({ id: 'msla-agent-chat-header-collapse' }).props.onClick();
    expect(mockToggleCollapse).toHaveBeenCalled();
  });
});
