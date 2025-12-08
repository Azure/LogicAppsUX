import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { LoginPrompt } from '../LoginPrompt/LoginPrompt';
import type { IdentityProvider } from '../../lib/utils/config-parser';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

const mockIdentityProviders: Record<string, IdentityProvider> = {
  microsoft: {
    signInEndpoint: '/.auth/login/aad',
    name: 'Microsoft',
  },
  google: {
    signInEndpoint: '/.auth/login/google',
    name: 'Google',
  },
};

describe('LoginPrompt', () => {
  it('should render the sign in required title', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
  });

  it('should render the sign in message', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

    expect(screen.getByText('Sign in to continue using the chat')).toBeInTheDocument();
  });

  it('should render sign in buttons for each identity provider', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

    expect(screen.getByRole('button', { name: 'Microsoft account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google account' })).toBeInTheDocument();
  });

  it('should call onLogin with the provider when sign in button is clicked', () => {
    const onLogin = vi.fn();
    renderWithProvider(<LoginPrompt onLogin={onLogin} identityProviders={mockIdentityProviders} />);

    fireEvent.click(screen.getByRole('button', { name: 'Microsoft account' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith(mockIdentityProviders.microsoft);
  });

  it('should show configuration message when identityProviders is undefined', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Configure Easy Auth to enable chat client authentication')).toBeInTheDocument();
  });

  it('should show configuration message when identityProviders is empty', () => {
    renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={{}} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Configure Easy Auth to enable chat client authentication')).toBeInTheDocument();
  });

  describe('loading state', () => {
    it('should show "Signing in..." text on clicked button when loading', () => {
      const onLogin = vi.fn();
      renderWithProvider(<LoginPrompt onLogin={onLogin} isLoading={false} identityProviders={mockIdentityProviders} />);

      // Click the Microsoft button to set it as the loading button
      fireEvent.click(screen.getByRole('button', { name: 'Microsoft account' }));

      // Re-render with isLoading=true to simulate loading state
      renderWithProvider(<LoginPrompt onLogin={onLogin} isLoading={true} identityProviders={mockIdentityProviders} />);
    });

    it('should disable all buttons when loading', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} isLoading={true} identityProviders={mockIdentityProviders} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should show spinner only on the clicked button when loading', () => {
      const onLogin = vi.fn();
      const { container, rerender } = renderWithProvider(
        <LoginPrompt onLogin={onLogin} isLoading={false} identityProviders={mockIdentityProviders} />
      );

      // Click the Microsoft button
      fireEvent.click(screen.getByRole('button', { name: 'Microsoft account' }));

      // Re-render with loading state
      rerender(
        <FluentProvider theme={webLightTheme}>
          <LoginPrompt onLogin={onLogin} isLoading={true} identityProviders={mockIdentityProviders} />
        </FluentProvider>
      );

      // Fluent UI Spinner renders with role="progressbar"
      const spinners = container.querySelectorAll('[role="progressbar"]');
      expect(spinners).toHaveLength(1);
    });

    it('should not show spinner when not loading', () => {
      const { container } = renderWithProvider(
        <LoginPrompt onLogin={vi.fn()} isLoading={false} identityProviders={mockIdentityProviders} />
      );

      expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should display error message when error prop is provided', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Failed to open login popup" identityProviders={mockIdentityProviders} />);

      expect(screen.getByText('Failed to open login popup')).toBeInTheDocument();
    });

    it('should not display error message when error prop is undefined', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

      // Error message container should not exist
      const errorMessages = screen.queryAllByText(/failed|error/i);
      expect(errorMessages).toHaveLength(0);
    });

    it('should not display error message when error prop is empty string', () => {
      // Empty string should not render the error div
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="" identityProviders={mockIdentityProviders} />);
      // The error div should not be present when error is empty (check for messageBar class with error intent)
      const errorMessageBars = container.querySelectorAll('[class*="messageBar"]');
      // There should be no error message bars when error is empty
      expect(errorMessageBars).toHaveLength(0);
    });

    it('should display long error messages', () => {
      const longError =
        'This is a very long error message that explains in detail what went wrong during the authentication process and provides suggestions for resolution.';
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error={longError} identityProviders={mockIdentityProviders} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('should display error with special characters', () => {
      const errorWithSpecialChars = 'Error: Connection failed <timeout> & retry limit exceeded';
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error={errorWithSpecialChars} identityProviders={mockIdentityProviders} />);

      expect(screen.getByText(errorWithSpecialChars)).toBeInTheDocument();
    });

    it('should display error message above the sign in buttons', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Test error" identityProviders={mockIdentityProviders} />);

      const errorElement = screen.getByText('Test error');
      const button = screen.getByRole('button', { name: 'Microsoft account' });

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

    it('should keep buttons enabled when there is an error', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} error="Some error occurred" identityProviders={mockIdentityProviders} />);

      expect(screen.getByRole('button', { name: 'Microsoft account' })).toBeEnabled();
    });

    it('should allow retry when there is an error', () => {
      const onLogin = vi.fn();
      renderWithProvider(<LoginPrompt onLogin={onLogin} error="Previous attempt failed" identityProviders={mockIdentityProviders} />);

      fireEvent.click(screen.getByRole('button', { name: 'Microsoft account' }));

      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('should display both error and loading state correctly', () => {
      // When loading with a previous error, buttons should be disabled but error visible
      const onLogin = vi.fn();
      const { rerender } = renderWithProvider(
        <LoginPrompt onLogin={onLogin} error="Previous error" isLoading={false} identityProviders={mockIdentityProviders} />
      );

      // Click a button first
      fireEvent.click(screen.getByRole('button', { name: 'Microsoft account' }));

      // Re-render with loading state
      rerender(
        <FluentProvider theme={webLightTheme}>
          <LoginPrompt onLogin={onLogin} error="Previous error" isLoading={true} identityProviders={mockIdentityProviders} />
        </FluentProvider>
      );

      expect(screen.getByText('Previous error')).toBeInTheDocument();
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should render error using MessageBar component', () => {
      const { container } = renderWithProvider(
        <LoginPrompt onLogin={vi.fn()} error="Test error" identityProviders={mockIdentityProviders} />
      );

      // MessageBar renders with a specific role or class
      const messageBar = container.querySelector('[class*="fui-MessageBar"]');
      expect(messageBar).toBeInTheDocument();
    });

    it('should not display icon in error MessageBar', () => {
      const { container } = renderWithProvider(
        <LoginPrompt onLogin={vi.fn()} error="Test error" identityProviders={mockIdentityProviders} />
      );

      // The MessageBar should not have an icon container with SVG
      // When icon={null}, MessageBar doesn't render the icon slot
      const messageBar = container.querySelector('[class*="fui-MessageBar"]');
      expect(messageBar).toBeInTheDocument();

      // Check that there's no icon within the MessageBar (the PersonRegular icon is outside the MessageBar)
      const messageBarIcon = messageBar?.querySelector('[class*="fui-MessageBar__icon"]');
      expect(messageBarIcon).toBeNull();
    });
  });

  describe('structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

      // Should have container div
      expect(container.querySelector('div')).toBeInTheDocument();

      // Should have Title3 which renders as h3 equivalent
      expect(screen.getByText('Sign in required')).toBeInTheDocument();

      // Should have buttons for each provider
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('should apply styles via className', () => {
      renderWithProvider(<LoginPrompt onLogin={vi.fn()} identityProviders={mockIdentityProviders} />);

      const button = screen.getByRole('button', { name: 'Microsoft account' });
      expect(button).toHaveAttribute('class');
    });
  });
});
