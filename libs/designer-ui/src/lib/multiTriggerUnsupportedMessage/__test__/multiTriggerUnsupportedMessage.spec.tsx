/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect, afterEach } from 'vitest';
import { MultiTriggerUnsupportedMessage } from '../index';

function renderWithIntl(component: React.ReactElement) {
  return render(<IntlProvider locale="en">{component}</IntlProvider>);
}

describe('MultiTriggerUnsupportedMessage', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the Consumption message without a Run details button when no click handler is provided', () => {
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={false} />);

    expect(screen.getByText(/does not support workflows with multiple triggers/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run details/i })).not.toBeInTheDocument();
  });

  it('should render the Consumption message with a Run details button that invokes the callback when provided', () => {
    const onRunDetailsClick = vi.fn();
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={false} onRunDetailsClick={onRunDetailsClick} />);

    const button = screen.getByRole('button', { name: /run details/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onRunDetailsClick).toHaveBeenCalledTimes(1);
  });

  it('should render the Standard message and never show a Run details button, even when a click handler is provided', () => {
    const onRunDetailsClick = vi.fn();
    renderWithIntl(<MultiTriggerUnsupportedMessage isStandard={true} onRunDetailsClick={onRunDetailsClick} />);

    expect(screen.getByText(/Logic Apps \(Standard\) does not support workflows with multiple triggers/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run details/i })).not.toBeInTheDocument();
  });
});
