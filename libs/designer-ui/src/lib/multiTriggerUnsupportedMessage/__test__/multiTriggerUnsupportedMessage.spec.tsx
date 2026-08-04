/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect, afterEach, beforeAll } from 'vitest';
import { MultiTriggerUnsupportedMessage } from '../index';

// Mock ResizeObserver for Fluent UI MessageBar
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderWithIntl(component: React.ReactElement) {
  return render(<IntlProvider locale="en">{component}</IntlProvider>);
}

describe('MultiTriggerUnsupportedMessage', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the Consumption design-mode message without a Run details button or "Use Run details" text when no click handler is provided', () => {
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={false} />);

    expect(screen.getByText(/does not support workflows with multiple triggers/i)).toBeInTheDocument();
    expect(screen.queryByText(/use run details/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run details/i })).not.toBeInTheDocument();
  });

  it('should render the Consumption monitoring message with "Use Run details" text and a Run details button that invokes the callback when provided', () => {
    const onRunDetailsClick = vi.fn();
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={false} onRunDetailsClick={onRunDetailsClick} />);

    expect(screen.getByText(/use run details to view this run/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /run details/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onRunDetailsClick).toHaveBeenCalledTimes(1);
  });

  it('should render the Standard message and never show a Run details button or "Use Run details" text, even when a click handler is provided', () => {
    const onRunDetailsClick = vi.fn();
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={true} onRunDetailsClick={onRunDetailsClick} />);

    expect(screen.getByText(/Logic Apps \(Standard\) does not support workflows with multiple triggers/i)).toBeInTheDocument();
    expect(screen.queryByText(/use run details/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run details/i })).not.toBeInTheDocument();
  });

  it('should allow the centered wrapper and the MessageBar to shrink below their natural content width so they stay within a narrow canvas (e.g. beside an open RunHistoryPanel/drawer) instead of overflowing it', () => {
    const onRunDetailsClick = vi.fn();
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={false} onRunDetailsClick={onRunDetailsClick} />);

    // The MessageBar itself must be allowed to shrink below its `maxWidth: 480px` so it can fit
    // inside canvases narrower than 480px.
    const messageBar = screen.getByRole('group');
    expect(getComputedStyle(messageBar).minWidth).toBe('0');
    expect(getComputedStyle(messageBar).maxWidth).toBe('480px');

    // The outer centered flex container: without `min-width: 0` a flex item's automatic minimum
    // size defaults to its content's min-content/max-content size, which would prevent it (and the
    // MessageBar inside it) from ever becoming narrower than the room needed to render its content
    // on one line -- causing overflow past a narrow canvas region instead of wrapping/shrinking.
    const root = messageBar.parentElement as HTMLElement;
    expect(root).toBeTruthy();
    expect(getComputedStyle(root).minWidth).toBe('0');
  });
});
