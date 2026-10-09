/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInstructionEditor } from '../index';

vi.mock('../../editor/string', () => ({
  StringEditor: () => <div data-testid="system-instruction-editor" />,
}));

const renderEditor = (hideSystemInstructions = false) =>
  render(
    <FluentProvider theme={webLightTheme}>
      <IntlProvider locale="en" messages={{}}>
        <AgentInstructionEditor
          initialValue={[]}
          onCastParameter={vi.fn()}
          hideUserInstructions={true}
          hideSystemInstructions={hideSystemInstructions}
        />
      </IntlProvider>
    </FluentProvider>
  );

describe('AgentInstructionEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows guidance and documentation for system instructions', () => {
    renderEditor();

    expect(
      screen.getByText(
        'Add instructions so the agent understands its role and tasks. Include helpful information about workflow structure, restrictions, tools, and interactions in specific scenarios.'
      )
    ).toBeInTheDocument();

    const documentationLink = screen.getByRole('link', { name: /tips for writing agent instructions/i });
    expect(documentationLink).toHaveAttribute('href', 'https://aka.ms/LogicApps/Agents');
    expect(documentationLink).toHaveAttribute('target', '_blank');
    expect(documentationLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('hides system guidance when system instructions are hidden', () => {
    renderEditor(true);

    expect(screen.queryByText(/add instructions so the agent understands its role and tasks/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tips for writing agent instructions/i })).not.toBeInTheDocument();
  });
});
