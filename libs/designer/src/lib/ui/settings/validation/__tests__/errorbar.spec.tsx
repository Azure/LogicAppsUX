import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { CustomizableMessageBar } from '../errorbar';
import { describe, expect, it, vi, beforeAll } from 'vitest';

// Mock ResizeObserver for Fluent UI MessageBar
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider locale="en">{component}</IntlProvider>);
};

describe('CustomizableMessageBar', () => {
  it('should render the message', () => {
    renderWithIntl(<CustomizableMessageBar type="info" message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should have role="alert" for error type', () => {
    const { container } = renderWithIntl(<CustomizableMessageBar type="error" message="Error message" />);
    const messageBar = container.querySelector('[role="alert"]');
    expect(messageBar).toBeInTheDocument();
  });

  it('should have role="alert" for warning type', () => {
    const { container } = renderWithIntl(<CustomizableMessageBar type="warning" message="Warning message" />);
    const messageBar = container.querySelector('[role="alert"]');
    expect(messageBar).toBeInTheDocument();
  });

  it('should not have role="alert" for info type', () => {
    const { container } = renderWithIntl(<CustomizableMessageBar type="info" message="Info message" />);
    const messageBar = container.querySelector('[role="alert"]');
    expect(messageBar).toBeNull();
  });

  it('should not have role="alert" for success type', () => {
    const { container } = renderWithIntl(<CustomizableMessageBar type="success" message="Success message" />);
    const messageBar = container.querySelector('[role="alert"]');
    expect(messageBar).toBeNull();
  });

  it('should render dismiss button when onWarningDismiss is provided', () => {
    const onDismiss = vi.fn();
    renderWithIntl(<CustomizableMessageBar type="warning" message="Warning" onWarningDismiss={onDismiss} />);
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should not render dismiss button when onWarningDismiss is not provided', () => {
    renderWithIntl(<CustomizableMessageBar type="warning" message="Warning" />);
    const dismissButton = screen.queryByRole('button', { name: 'Dismiss' });
    expect(dismissButton).toBeNull();
  });

  it('should call onWarningDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    renderWithIntl(<CustomizableMessageBar type="warning" message="Warning" onWarningDismiss={onDismiss} />);
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
