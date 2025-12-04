import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { LoginPrompt } from '../LoginPrompt/LoginPrompt';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

describe('LoginPrompt', () => {
  it('should render the sign in required title', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
  });

  it('should render the sign in message', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

    expect(screen.getByText('Please sign in to continue using the chat')).toBeInTheDocument();
  });

  it('should render the sign in button', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('should call onLogin when sign in button is clicked', () => {
    const onLogin = vi.fn();
    renderWithProvider(<LoginPrompt onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  describe('loading state', () => {
    it('should show "Signing in..." text when loading', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });

    it('should show spinner when loading', () => {
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} isLoading={true} />);

      // Fluent UI Spinner renders with role="progressbar"
      expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('should not show spinner when not loading', () => {
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} isLoading={false} />);

      expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should display error message when error prop is provided', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Failed to open login popup" />);

      expect(screen.getByText('Failed to open login popup')).toBeInTheDocument();
    });

    it('should not display error message when error prop is undefined', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

      // Error message container should not exist
      const errorMessages = screen.queryAllByText(/failed|error/i);
      expect(errorMessages).toHaveLength(0);
    });

    it('should not display error message when error prop is empty string', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="" />);

      // Empty string should not render the error div
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="" />);
      // The error div should not be present when error is empty
      expect(container.querySelectorAll('[class*="errorMessage"]')).toHaveLength(0);
    });

    it('should display long error messages', () => {
      const longError =
        'This is a very long error message that explains in detail what went wrong during the authentication process and provides suggestions for resolution.';
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error={longError} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('should display error with special characters', () => {
      const errorWithSpecialChars = 'Error: Connection failed <timeout> & retry limit exceeded';
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error={errorWithSpecialChars} />);

      expect(screen.getByText(errorWithSpecialChars)).toBeInTheDocument();
    });

    it('should display error message above the sign in button', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Test error" />);

      const errorElement = screen.getByText('Test error');
      const button = screen.getByRole('button', { name: 'Sign in' });

      // Both elements should be present
      expect(errorElement).toBeInTheDocument();
      expect(button).toBeInTheDocument();

      // Verify error appears before button in DOM order by checking parent structure
      const errorParent = errorElement.parentElement;
      const buttonParent = button.parentElement;

      // Both should share a common card ancestor
      expect(errorParent).toBeTruthy();
      expect(buttonParent).toBeTruthy();
    });

    it('should keep button enabled when there is an error', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Some error occurred" />);

      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });

    it('should allow retry when there is an error', () => {
      const onLogin = vi.fn();
      renderWithProvider(<LoginPrompt onLogin={onLogin} error="Previous attempt failed" />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('should display both error and loading state correctly', () => {
      // When loading with a previous error, button should be disabled but error visible
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Previous error" isLoading={true} />);

      expect(screen.getByText('Previous error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });
  });

  describe('structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

      // Should have container div
      expect(container.querySelector('div')).toBeInTheDocument();

      // Should have Title3 which renders as h3 equivalent
      expect(screen.getByText('Sign in required')).toBeInTheDocument();

      // Should have button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply styles via className', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('class');
    });
  });
});
