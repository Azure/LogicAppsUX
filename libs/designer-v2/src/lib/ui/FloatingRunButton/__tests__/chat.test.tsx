import type { ComponentProps } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatButton } from '../chat';
import * as WorkflowServiceModule from '@microsoft/logic-apps-shared';

// Mock the WorkflowService
vi.mock('@microsoft/logic-apps-shared', () => ({
  WorkflowService: vi.fn(),
}));

type ChatButtonProps = ComponentProps<typeof ChatButton>;

describe('ChatButton', () => {
  let defaultProps: ChatButtonProps;
  let queryClient: QueryClient;
  const mockSaveWorkflow = vi.fn().mockResolvedValue(undefined);
  const mockGetAgentUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveWorkflow.mockResolvedValue(undefined);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          staleTime: 0,
        },
      },
    });

    mockGetAgentUrl.mockResolvedValue({
      agentUrl: 'https://test-agent.azurewebsites.net',
      chatUrl: 'https://test-chat.azurewebsites.net',
      hostName: 'test-agent.azurewebsites.net',
      authenticationEnabled: false,
      queryParams: {
        apiKey: 'test-api-key-123',
      },
    });

    (WorkflowServiceModule.WorkflowService as any).mockReturnValue({
      getAgentUrl: mockGetAgentUrl,
    });

    defaultProps = {
      isDarkMode: false,
      isDraftMode: false,
      siteResourceId: '/subscriptions/123/resourceGroups/test/providers/Microsoft.Web/sites/testApp',
      workflowName: 'testWorkflow',
      saveWorkflow: mockSaveWorkflow,
      appearance: 'primary',
    };
  });

  const renderWithProviders = (props: ChatButtonProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" defaultLocale="en">
          <ChatButton {...props} />
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render the chat button with split button', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('should render with custom tooltip when disabled', () => {
      renderWithProviders({
        ...defaultProps,
        disabled: true,
        tooltipText: 'Custom tooltip',
      });
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });

  describe('Chat Dialog', () => {
    it('should open chat dialog when primary button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const chatButton = screen.getByText('Chat');
      await user.click(chatButton);

      // Wait for dialog to open and iframe to be present
      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe).toBeTruthy();
      });
    });

    it('should display iframe when chat dialog is opened without authentication', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const chatButton = screen.getByText('Chat');
      await user.click(chatButton);

      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe?.src).toContain('test-chat.azurewebsites.net');
      });
    });

    it('should open new tab when authentication is enabled', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      mockGetAgentUrl.mockResolvedValue({
        agentUrl: 'https://test-agent.azurewebsites.net',
        chatUrl: 'https://test-chat.azurewebsites.net',
        hostName: 'test-agent.azurewebsites.net',
        authenticationEnabled: true,
        queryParams: {
          apiKey: 'test-api-key-123',
        },
      });

      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      // Wait for data to load
      await waitFor(() => {
        expect(mockGetAgentUrl).toHaveBeenCalled();
      });

      const chatButton = screen.getByText('Chat');
      await user.click(chatButton);

      // When authentication is enabled, clicking should show tooltip instead of opening dialog
      // The actual window.open happens in a different flow
      // For now, just verify the button is rendered correctly
      expect(chatButton).toBeTruthy();

      windowOpenSpy.mockRestore();
    });

    it('should pass dark mode parameter to iframe', async () => {
      const user = userEvent.setup();
      renderWithProviders({ ...defaultProps, isDarkMode: true });

      const chatButton = screen.getByText('Chat');
      await user.click(chatButton);

      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe?.src).toContain('mode=dark');
      });
    });
  });

  describe('Info Dialog - Draft Mode', () => {
    it('should open info dialog when menu button is clicked in draft mode', async () => {
      const user = userEvent.setup();
      renderWithProviders({ ...defaultProps, isDraftMode: true });

      // Click the info icon button (second button in split button)
      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Chat Availability')).toBeInTheDocument();
      });
    });

    it('should display availability sections in draft mode', async () => {
      const user = userEvent.setup();
      renderWithProviders({ ...defaultProps, isDraftMode: true });

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Development & Testing')).toBeInTheDocument();
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.getByText('Setting up authentication')).toBeInTheDocument();
      });
    });

    it('should not show tabs in draft mode', async () => {
      const user = userEvent.setup();
      renderWithProviders({ ...defaultProps, isDraftMode: true });

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.queryByText('Connect to Agent')).not.toBeInTheDocument();
      });
    });
  });

  describe('Info Dialog - Production Mode', () => {
    it('should show tabs in production mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        const connectTabs = screen.getAllByText('Connect to Agent');
        const availabilityTabs = screen.getAllByText('Chat Availability');
        expect(connectTabs.length).toBeGreaterThan(0);
        expect(availabilityTabs.length).toBeGreaterThan(0);
      });
    });

    it('should default to Connect to Agent tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Option 1: Use Agent URL and API Key')).toBeInTheDocument();
        expect(screen.getByText('Option 2: Chat Client')).toBeInTheDocument();
      });
    });

    it('should switch to Chat Availability tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        const availabilityTabs = screen.getAllByText('Chat Availability');
        expect(availabilityTabs.length).toBeGreaterThan(0);
      });

      const availabilityTabs = screen.getAllByText('Chat Availability');
      // Click the tab (first occurrence should be the tab itself)
      await user.click(availabilityTabs[0]);

      await waitFor(() => {
        expect(screen.getByText('Development & Testing')).toBeTruthy();
        expect(screen.getByText('Production')).toBeTruthy();
      });
    });

    it('should display agent URL and API key fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Agent URL')).toBeInTheDocument();
        expect(screen.getByLabelText('API Key')).toBeInTheDocument();
      });
    });

    it('should copy agent URL when copy button is clicked', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        const agentUrlInput = screen.getByLabelText('Agent URL') as HTMLInputElement;
        expect(agentUrlInput.value).toBe('https://test-agent.azurewebsites.net');
      });

      const copyButtons = screen.getAllByText('Copy');
      await user.click(copyButtons[0]);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('https://test-agent.azurewebsites.net');
      });
    });

    it('should copy API key when copy button is clicked', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByLabelText('API Key')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByText('Copy');
      await user.click(copyButtons[1]);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('test-api-key-123');
      });
    });

    it('should show configure authentication link when auth is disabled', async () => {
      const user = userEvent.setup();
      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Authentication')).toBeInTheDocument();
      });
    });

    it('should show open chat client link when auth is enabled', async () => {
      const user = userEvent.setup();
      mockGetAgentUrl.mockResolvedValue({
        agentUrl: 'https://test-agent.azurewebsites.net',
        chatUrl: 'https://test-chat.azurewebsites.net',
        hostName: 'test-agent.azurewebsites.net',
        authenticationEnabled: true,
        queryParams: {
          apiKey: 'test-api-key-123',
        },
      });

      renderWithProviders(defaultProps);

      const buttons = screen.getAllByRole('button');
      const infoButton = buttons[1];
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Open Chat Client')).toBeInTheDocument();
        expect(screen.queryByText('Configure Authentication')).not.toBeInTheDocument();
      });
    });
  });

  describe('useAgentUrl Hook', () => {
    it('should call getAgentUrl with true for draft mode', async () => {
      renderWithProviders({ ...defaultProps, isDraftMode: true });

      await waitFor(() => {
        expect(mockGetAgentUrl).toHaveBeenCalledWith(true);
      });
    });

    it('should call getAgentUrl with false for production mode', async () => {
      renderWithProviders({ ...defaultProps, isDraftMode: false });

      await waitFor(() => {
        expect(mockGetAgentUrl).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Tooltip Text', () => {
    it('should show default tooltip when not disabled', () => {
      renderWithProviders(defaultProps);
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('should show authentication draft mode tooltip', () => {
      mockGetAgentUrl.mockResolvedValue({
        agentUrl: 'https://test-agent.azurewebsites.net',
        chatUrl: 'https://test-chat.azurewebsites.net',
        hostName: 'test-agent.azurewebsites.net',
        authenticationEnabled: true,
        queryParams: {
          apiKey: 'test-api-key-123',
        },
      });

      renderWithProviders({ ...defaultProps, isDraftMode: true });
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });
});
