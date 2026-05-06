/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { FoundryAgentPicker } from '../index';
import type { FoundryAgent } from '@microsoft/logic-apps-shared';

const mockAgents: FoundryAgent[] = [
  {
    id: 'agent-1',
    name: 'Agent One',
    model: 'gpt-4.1',
    instructions: 'Be helpful',
    tools: [],
    metadata: {},
    created_at: 1,
    object: 'agent',
    description: null,
  },
  {
    id: 'agent-2',
    name: 'Agent Two',
    model: 'gpt-4',
    instructions: '',
    tools: [{ type: 'code_interpreter' }],
    metadata: {},
    created_at: 2,
    object: 'agent',
    description: null,
  },
];

const mockModels = [
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-4', name: 'GPT-4' },
];

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <FluentProvider theme={webLightTheme}>
      <IntlProvider locale="en" messages={{}}>
        {ui}
      </IntlProvider>
    </FluentProvider>
  );

describe('FoundryAgentPicker', () => {
  afterEach(() => {
    cleanup();
  });

  it('should not show create button when onCreateAgent is not provided', () => {
    renderWithProviders(<FoundryAgentPicker agents={mockAgents} isLoading={false} onAgentSelect={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /create new agent/i })).not.toBeInTheDocument();
  });

  it('should show create button when onCreateAgent is provided', () => {
    renderWithProviders(
      <FoundryAgentPicker agents={mockAgents} isLoading={false} onAgentSelect={vi.fn()} onCreateAgent={vi.fn()} models={mockModels} />
    );

    expect(screen.getByRole('button', { name: /create new agent/i })).toBeInTheDocument();
  });

  it('should show create form when create button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FoundryAgentPicker agents={mockAgents} isLoading={false} onAgentSelect={vi.fn()} onCreateAgent={vi.fn()} models={mockModels} />
    );

    await user.click(screen.getByRole('button', { name: /create new agent/i }));

    expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /model/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/instructions/i)).toBeInTheDocument();
  });

  it('should hide create form when cancel is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FoundryAgentPicker agents={mockAgents} isLoading={false} onAgentSelect={vi.fn()} onCreateAgent={vi.fn()} models={mockModels} />
    );

    await user.click(screen.getByRole('button', { name: /create new agent/i }));
    expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByLabelText(/agent name/i)).not.toBeInTheDocument();
  });

  it('should create a new agent and select it after submit', async () => {
    const user = userEvent.setup();
    const onAgentSelect = vi.fn();
    const createdAgent: FoundryAgent = {
      id: 'agent-3',
      name: 'New Agent',
      model: 'gpt-4.1',
      instructions: 'Help users',
      tools: [],
      metadata: {},
      created_at: 3,
      object: 'agent',
      description: null,
    };
    const onCreateAgent = vi.fn().mockResolvedValue(createdAgent);

    renderWithProviders(
      <FoundryAgentPicker
        agents={mockAgents}
        isLoading={false}
        onAgentSelect={onAgentSelect}
        onCreateAgent={onCreateAgent}
        models={mockModels}
      />
    );

    await user.click(screen.getByRole('button', { name: /create new agent/i }));
    await user.type(screen.getByLabelText(/agent name/i), '  New Agent  ');
    await user.type(screen.getByLabelText(/instructions/i), '  Help users  ');

    const modelCombobox = screen.getByRole('combobox', { name: /model/i });
    await user.click(modelCombobox);
    await user.click(await screen.findByRole('option', { name: 'GPT-4.1' }));

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(onCreateAgent).toHaveBeenCalledWith({
        name: 'New Agent',
        model: 'gpt-4.1',
        instructions: 'Help users',
      });
    });
    expect(onAgentSelect).toHaveBeenCalledWith(createdAgent);
    expect(screen.queryByLabelText(/agent name/i)).not.toBeInTheDocument();
  });

  it('should show create errors from onCreateAgent', async () => {
    const user = userEvent.setup();
    const onCreateAgent = vi.fn().mockRejectedValue(new Error('Creation failed'));

    renderWithProviders(
      <FoundryAgentPicker agents={mockAgents} isLoading={false} onAgentSelect={vi.fn()} onCreateAgent={onCreateAgent} models={mockModels} />
    );

    await user.click(screen.getByRole('button', { name: /create new agent/i }));
    await user.type(screen.getByLabelText(/agent name/i), 'New Agent');

    const modelCombobox = screen.getByRole('combobox', { name: /model/i });
    await user.click(modelCombobox);
    await user.click(await screen.findByRole('option', { name: 'GPT-4.1' }));

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Creation failed')).toBeInTheDocument();
    expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument();
  });
});
