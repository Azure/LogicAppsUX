import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, expect, it } from 'vitest';
import { AgentChatHeader } from '../agentChatHeader';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('AgentChatHeader', () => {
  const mockToggleCollapse = vi.fn();

  it('renders correctly and matches snapshot', () => {
    const { asFragment } = render(
      <IntlProvider locale="en">
        <AgentChatHeader title="Test Title" toggleCollapse={mockToggleCollapse} />
      </IntlProvider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('calls toggleCollapse when button is clicked', () => {
    render(
      <IntlProvider locale="en">
        <AgentChatHeader title="Test Title" toggleCollapse={mockToggleCollapse} />
      </IntlProvider>
    );
    const button = screen.getByRole('button', { name: /collapse chat panel/i });
    fireEvent.click(button);
    expect(mockToggleCollapse).toHaveBeenCalled();
  });
});
