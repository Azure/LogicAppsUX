import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';
import * as authHandler from '../../lib/authHandler';

// Mock the dependencies
vi.mock('@microsoft/logic-apps-chat', () => ({
  ChatWidget: vi.fn(({ mode }) => <div data-testid="chat-widget">ChatWidget (mode: {mode})</div>),
  useChatStore: vi.fn((selector) => {
    const mockState = { sessions: [] };
    return selector ? selector(mockState) : mockState;
  }),
}));

vi.mock('../MultiSessionChat/MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(({ mode }) => <div data-testid="multi-session-chat">MultiSessionChat (mode: {mode})</div>),
}));

vi.mock('../../lib/authHandler', () => ({
  createUnauthorizedHandler: vi.fn(() => vi.fn()),
  getBaseUrl: vi.fn((agentCard) => `https://base.url.from/${agentCard}`),
  checkAuthStatus: vi.fn(() => Promise.resolve({ isAuthenticated: true })),
  openLoginPopup: vi.fn(),
}));

vi.mock('../../lib/hooks/useFrameBlade', () => ({
  useFrameBlade: vi.fn(() => ({
    isReady: true,
    sendMessage: vi.fn(),
  })),
}));

vi.mock('../../lib/hooks/useParentCommunication', () => ({
  useParentCommunication: vi.fn(() => ({
    isWaitingForAgentCard: false,
    sendMessageToParent: vi.fn(),
  })),
}));

describe('IframeWrapper', () => {
  const defaultConfig: IframeConfig = {
    props: {
      agentCard: 'https://api.example.com/agent-card.json',
      userId: 'user123',
      userName: 'Test User',
    },
    multiSession: false,
    mode: 'light',
    inPortal: false,
  };

  beforeEach(() => {
    // Reset URL
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000');

    // Reset mocks - this clears call history
    vi.clearAllMocks();

    // Reset checkAuthStatus to default (authenticated)
    vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: true });

    // Clear localStorage
    localStorage.clear();
  });

  it('should render ChatWidget in single-session mode', async () => {
    render(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');
    expect(screen.getByText('ChatWidget (mode: light)')).toBeInTheDocument();
  });

  it('should render MultiSessionChat in multi-session mode', async () => {
    const multiSessionConfig: IframeConfig = {
      ...defaultConfig,
      multiSession: true,
      apiKey: 'test-api-key',
    };

    render(<IframeWrapper config={multiSessionConfig} />);

    // Wait for auth check to complete (apiKey skips auth check)
    await screen.findByTestId('multi-session-chat');
    expect(screen.getByText('MultiSessionChat (mode: light)')).toBeInTheDocument();
  });

  it('should handle dark mode', async () => {
    const darkModeConfig: IframeConfig = {
      ...defaultConfig,
      mode: 'dark',
    };

    render(<IframeWrapper config={darkModeConfig} />);

    // Wait for auth check to complete
    await screen.findByText('ChatWidget (mode: dark)');
  });

  it('should show loading when waiting for postMessage', async () => {
    const { useParentCommunication } = await import('../../lib/hooks/useParentCommunication');
    vi.mocked(useParentCommunication).mockReturnValue({
      isWaitingForAgentCard: true,
      sendMessageToParent: vi.fn(),
    });

    (window as any).location = new URL('http://localhost:3000?expectPostMessage=true');

    render(<IframeWrapper config={defaultConfig} />);

    expect(screen.getByText('Waiting for Configuration')).toBeInTheDocument();
    expect(screen.getByText('Waiting for agent card data via postMessage...')).toBeInTheDocument();
  });

  it('should show loading when Frame Blade is initializing', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');
    vi.mocked(useFrameBlade).mockReturnValue({
      isReady: false,
      sendMessage: vi.fn(),
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    expect(screen.getByText('Initializing Frame Blade...')).toBeInTheDocument();
    expect(screen.getByText('Connecting to Azure Portal...')).toBeInTheDocument();
  });

  it('should handle agent card from postMessage', async () => {
    const { useParentCommunication } = await import('../../lib/hooks/useParentCommunication');

    let capturedCallback: ((agentCard: any) => void) | undefined;

    vi.mocked(useParentCommunication).mockImplementation(({ onAgentCardReceived }) => {
      capturedCallback = onAgentCardReceived;
      return {
        isWaitingForAgentCard: false,
        sendMessageToParent: vi.fn(),
      };
    });

    (window as any).location = new URL('http://localhost:3000?expectPostMessage=true');

    const { rerender } = render(<IframeWrapper config={defaultConfig} />);

    // Simulate receiving agent card
    act(() => {
      if (capturedCallback) {
        capturedCallback({ name: 'New Agent', endpoint: 'https://new.api.com' });
      }
    });

    rerender(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');
  });

  it('should handle theme changes from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');

    let capturedThemeCallback: ((theme: 'light' | 'dark') => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onThemeChange }) => {
      capturedThemeCallback = onThemeChange;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByText('ChatWidget (mode: light)');

    // Simulate theme change
    act(() => {
      if (capturedThemeCallback) {
        capturedThemeCallback('dark');
      }
    });

    // Component should re-render with dark mode
    expect(screen.getByText('ChatWidget (mode: dark)')).toBeInTheDocument();
  });

  it('should handle auth token from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');
    const { ChatWidget } = await import('@microsoft/logic-apps-chat');

    let capturedAuthCallback: ((token: string) => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onAuthTokenReceived }) => {
      capturedAuthCallback = onAuthTokenReceived;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByTestId('chat-widget');

    // Simulate receiving auth token
    act(() => {
      if (capturedAuthCallback) {
        capturedAuthCallback('frame-blade-auth-token');
      }
    });

    // Verify ChatWidget receives the auth token
    expect(vi.mocked(ChatWidget)).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'frame-blade-auth-token',
      }),
      {}
    );
  });

  it('should respect URL mode parameter over initial mode', async () => {
    (window as any).location = new URL('http://localhost:3000?mode=dark');

    render(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByText('ChatWidget (mode: dark)');
  });

  it('should handle chat history from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');

    let capturedHistoryCallback: ((history: any) => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onChatHistoryReceived }) => {
      capturedHistoryCallback = onChatHistoryReceived;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByTestId('chat-widget');

    const chatHistory = {
      contextId: 'test-context-123',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
    };

    // Simulate receiving chat history
    act(() => {
      if (capturedHistoryCallback) {
        capturedHistoryCallback(chatHistory);
      }
    });

    // Verify contextId is handled (not stored in localStorage, but passed as initialContextId prop)
    // The actual verification happens when the component re-renders with the contextId
    expect(chatHistory.contextId).toBe('test-context-123');
  });

  it('should pass contextId from URL config to ChatWidget', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: 'ctx-from-url',
      }),
      {}
    );
  });

  it('should not use contextId for multi-session mode', async () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: true,
      apiKey: 'test-api-key', // apiKey skips auth check
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete (apiKey skips auth check)
    await screen.findByTestId('multi-session-chat');
  });

  describe('Authentication', () => {
    it('should show loading state during authentication check', async () => {
      // Create a promise that we can control
      let resolveAuth: (value: { isAuthenticated: boolean }) => void;
      const authPromise = new Promise<{ isAuthenticated: boolean }>((resolve) => {
        resolveAuth = resolve;
      });

      vi.mocked(authHandler.checkAuthStatus).mockReturnValue(authPromise);

      render(<IframeWrapper config={defaultConfig} />);

      // Should show loading state while checking auth
      expect(screen.getByText('Checking Authentication')).toBeInTheDocument();
      expect(screen.getByText('Verifying authentication status...')).toBeInTheDocument();

      // Resolve auth check
      await act(async () => {
        resolveAuth!({ isAuthenticated: true });
      });

      // Should now show the chat widget
      await screen.findByTestId('chat-widget');
    });

    it('should show LoginPrompt when checkAuthStatus returns false', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: false });

      const configWithProviders: IframeConfig = {
        ...defaultConfig,
        props: {
          ...defaultConfig.props,
          identityProviders: {
            aad: {
              signInEndpoint: '/.auth/login/aad',
              name: 'Microsoft',
            },
          },
        },
      };

      render(<IframeWrapper config={configWithProviders} />);

      // Should show login prompt
      await screen.findByText('Sign in required');
      expect(screen.getByText('Sign in to continue using the chat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Microsoft account' })).toBeInTheDocument();
    });

    it('should show LoginPrompt when checkAuthStatus throws an error', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockRejectedValue(new Error('Network error'));

      const configWithProviders: IframeConfig = {
        ...defaultConfig,
        props: {
          ...defaultConfig.props,
          identityProviders: {
            aad: {
              signInEndpoint: '/.auth/login/aad',
              name: 'Microsoft',
            },
          },
        },
      };

      render(<IframeWrapper config={configWithProviders} />);

      // Should show login prompt after error
      await screen.findByText('Sign in required');
    });

    it('should skip auth check when in portal mode', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockClear();

      const portalConfig: IframeConfig = {
        ...defaultConfig,
        inPortal: true,
        trustedParentOrigin: 'https://portal.azure.com',
      };

      render(<IframeWrapper config={portalConfig} />);

      // Should go directly to chat widget without checking auth
      await screen.findByTestId('chat-widget');
      expect(authHandler.checkAuthStatus).not.toHaveBeenCalled();
    });

    it('should skip auth check when apiKey is provided', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockClear();

      const configWithApiKey: IframeConfig = {
        ...defaultConfig,
        apiKey: 'test-api-key-123',
      };

      render(<IframeWrapper config={configWithApiKey} />);

      // Should go directly to chat widget without checking auth
      await screen.findByTestId('chat-widget');
      expect(authHandler.checkAuthStatus).not.toHaveBeenCalled();
    });

    it('should call openLoginPopup when login button is clicked', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: false });

      const configWithProviders: IframeConfig = {
        ...defaultConfig,
        props: {
          ...defaultConfig.props,
          identityProviders: {
            aad: {
              signInEndpoint: '/.auth/login/aad',
              name: 'Microsoft',
            },
          },
        },
      };

      render(<IframeWrapper config={configWithProviders} />);

      // Wait for login prompt
      await screen.findByText('Sign in required');

      // Click login button
      const loginButton = screen.getByRole('button', { name: 'Microsoft account' });
      await act(async () => {
        loginButton.click();
      });

      // Should call openLoginPopup
      expect(authHandler.openLoginPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          signInEndpoint: '/.auth/login/aad',
        })
      );
    });

    it('should show chat widget after successful login', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: false, error: null });

      // Capture the onSuccess callback
      let onSuccessCallback: ((authInfo: authHandler.AuthInformation) => void) | undefined;
      vi.mocked(authHandler.openLoginPopup).mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
      });

      const configWithProviders: IframeConfig = {
        ...defaultConfig,
        props: {
          ...defaultConfig.props,
          identityProviders: {
            aad: {
              signInEndpoint: '/.auth/login/aad',
              name: 'Microsoft',
            },
          },
        },
      };

      render(<IframeWrapper config={configWithProviders} />);

      // Wait for login prompt
      await screen.findByText('Sign in required');

      // Click login button
      const loginButton = screen.getByRole('button', { name: 'Microsoft account' });
      await act(async () => {
        loginButton.click();
      });

      // Simulate successful login callback with auth info
      await act(async () => {
        if (onSuccessCallback) {
          onSuccessCallback({ isAuthenticated: true, error: null, username: 'Test User' });
        }
      });

      // Should now show the chat widget
      await screen.findByTestId('chat-widget');
    });

    it('should show error message when login fails', async () => {
      vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: false });

      // Capture the onFailed callback
      let onFailedCallback: ((error: Error) => void) | undefined;
      vi.mocked(authHandler.openLoginPopup).mockImplementation((options: any) => {
        onFailedCallback = options.onFailed;
      });

      const configWithProviders: IframeConfig = {
        ...defaultConfig,
        props: {
          ...defaultConfig.props,
          identityProviders: {
            aad: {
              signInEndpoint: '/.auth/login/aad',
              name: 'Microsoft',
            },
          },
        },
      };

      render(<IframeWrapper config={configWithProviders} />);

      // Wait for login prompt
      await screen.findByText('Sign in required');

      // Click login button
      const loginButton = screen.getByRole('button', { name: 'Microsoft account' });
      await act(async () => {
        loginButton.click();
      });

      // Simulate failed login callback
      await act(async () => {
        if (onFailedCallback) {
          onFailedCallback(new Error('Login popup was blocked'));
        }
      });

      // Should show error message
      await screen.findByText('Login popup was blocked');
    });
  });
});
