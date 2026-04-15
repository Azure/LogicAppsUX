/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock dependencies
const mockHostOptions = vi.fn();
const mockActionMetadata = vi.fn();

vi.mock('../../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useHostOptions: () => mockHostOptions(),
}));

vi.mock('../../../../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (nodeId: string) => mockActionMetadata(nodeId),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  WorkflowService: vi.fn(() => ({
    getSandboxConfigurations: undefined,
  })),
}));

import { AgentHarnessTab, agentHarnessTab } from '../agentHarnessTab';

const TEST_NODE_ID = 'agent-node-1';

/**
 * Creates a mock raw operation definition as stored in state.workflow.operations[nodeId].
 * The agentHarness data lives at operation.inputs.parameters.agentModelSettings.agentHarness.
 */
const createOperation = (agentHarness?: any) => ({
  type: 'Agent',
  inputs: {
    parameters: {
      agentModelType: 'AzureOpenAI',
      messages: [],
      ...(agentHarness !== undefined ? { agentModelSettings: { agentHarness } } : {}),
    },
  },
});

const createStore = () =>
  configureStore({
    reducer: {
      // Minimal store - the component now reads via useActionMetadata (mocked)
      placeholder: (state = {}) => state,
    },
  });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (nodeId: string) => {
  const store = createStore();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </IntlProvider>
    </Provider>
  );
  return render(<AgentHarnessTab nodeId={nodeId} />, { wrapper: Wrapper });
};

describe('AgentHarnessTab', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockHostOptions.mockReturnValue({});
    mockActionMetadata.mockReturnValue(undefined);
  });

  describe('Info MessageBar', () => {
    it('renders info message bar', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText(/Agent Harness configures the sandbox environment/i)).toBeTruthy();
    });

    it('renders learn more link', () => {
      renderWithProviders(TEST_NODE_ID);
      const links = screen.getAllByText('Learn more about Agent Harness');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Execution Environment section', () => {
    it('renders execution environment section title', () => {
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Execution Environment');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders subtitle', () => {
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Choose the harness runtime for agent execution.');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders harness type label with required indicator', () => {
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Harness Type');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders dropdown for harness type', () => {
      renderWithProviders(TEST_NODE_ID);
      const dropdowns = screen.getAllByRole('combobox');
      expect(dropdowns.length).toBeGreaterThanOrEqual(1);
    });

    it('displays GHCP type from operation data', () => {
      mockActionMetadata.mockReturnValue(createOperation({ type: 'GHCP' }));
      renderWithProviders(TEST_NODE_ID);
      const dropdowns = screen.getAllByRole('combobox');
      // The first dropdown (harness type) should show the GHCP display value
      expect(dropdowns[0].getAttribute('value')).toBe('GHCP (GitHub Copilot)');
    });
  });

  describe('Sandbox Configuration section', () => {
    it('renders sandbox configuration section title', () => {
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Sandbox Configuration (Optional)');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders integration account field as disabled', () => {
      mockHostOptions.mockReturnValue({ integrationAccount: { id: '/test/ia', name: 'TestIA' } });
      renderWithProviders(TEST_NODE_ID);
      const input = screen.getByDisplayValue('TestIA');
      expect(input).toBeTruthy();
      expect((input as HTMLInputElement).disabled).toBe(true);
    });

    it('renders empty integration account when not set', () => {
      mockHostOptions.mockReturnValue({});
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Integration Account');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders sandbox configuration dropdown', () => {
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Sandbox Configuration');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sandbox mismatch warning', () => {
    it('shows warning when sandboxConfigurationId does not match integration account', () => {
      mockHostOptions.mockReturnValue({
        integrationAccount: { id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/ia1' },
      });
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          sandboxConfigurationId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/differentIA/sandboxConfigurations/sc1',
        })
      );
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText(/sandbox configuration belongs to a different integration account/i)).toBeTruthy();
    });

    it('does not show warning when sandboxConfigurationId matches integration account', () => {
      const iaId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/ia1';
      mockHostOptions.mockReturnValue({ integrationAccount: { id: iaId } });
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          sandboxConfigurationId: `${iaId}/sandboxConfigurations/sc1`,
        })
      );
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText(/sandbox configuration belongs to a different integration account/i)).toBeNull();
    });

    it('does not show warning when no sandboxConfigurationId is set', () => {
      mockHostOptions.mockReturnValue({
        integrationAccount: { id: '/test/ia' },
      });
      mockActionMetadata.mockReturnValue(createOperation({ type: 'GHCP' }));
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText(/sandbox configuration belongs to a different integration account/i)).toBeNull();
    });
  });

  describe('Input Files section', () => {
    it('does not render input files section when no files present', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText('Input Files')).toBeNull();
    });

    it('renders input files DataGrid when files present', () => {
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          inputFiles: [
            { name: 'data.csv', content: '@triggerBody()' },
            { name: 'config.json', content: '{"key": "value"}' },
          ],
        })
      );
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Input Files');
      expect(elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('data.csv')).toBeTruthy();
      // Expression content is rendered as a token pill with the @-prefix stripped
      expect(screen.getByText('triggerBody()')).toBeTruthy();
      expect(screen.getByText('config.json')).toBeTruthy();
    });

    it('renders expression content as token pill with extracted variable name', () => {
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          inputFiles: [{ name: 'doc.txt', content: "@{variables('documentContent')}" }],
        })
      );
      renderWithProviders(TEST_NODE_ID);
      // variables('documentContent') is extracted to just 'documentContent'
      expect(screen.getByText('documentContent')).toBeTruthy();
    });

    it('renders non-expression content as plain text', () => {
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          inputFiles: [{ name: 'static.txt', content: 'plain text value' }],
        })
      );
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText('plain text value')).toBeTruthy();
    });
  });

  describe('Skills section', () => {
    it('does not render skills section when no skills present', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText('Skills')).toBeNull();
    });

    it('renders skill cards when skills present', () => {
      mockActionMetadata.mockReturnValue(
        createOperation({
          type: 'GHCP',
          skills: [{ repository: 'contoso/repo', folders: ['src', 'lib'] }],
        })
      );
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Skills');
      expect(elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('contoso/repo')).toBeTruthy();
      // Folders are now rendered as individual badges
      expect(screen.getByText('src')).toBeTruthy();
      expect(screen.getByText('lib')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('renders gracefully when operation has no data', () => {
      mockActionMetadata.mockReturnValue(undefined);
      renderWithProviders(TEST_NODE_ID);
      const execEnvElements = screen.getAllByText('Execution Environment');
      expect(execEnvElements.length).toBeGreaterThanOrEqual(1);
      const sandboxElements = screen.getAllByText('Sandbox Configuration (Optional)');
      expect(sandboxElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders gracefully when agentModelSettings has no agentHarness', () => {
      mockActionMetadata.mockReturnValue({
        type: 'Agent',
        inputs: { parameters: { agentModelSettings: {} } },
      });
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Execution Environment');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders gracefully when inputs has no agentModelSettings', () => {
      mockActionMetadata.mockReturnValue({
        type: 'Agent',
        inputs: { parameters: { messages: [] } },
      });
      renderWithProviders(TEST_NODE_ID);
      const elements = screen.getAllByText('Execution Environment');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('agentHarnessTab factory', () => {
  it('returns correct tab metadata', () => {
    const intl = {
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    } as any;
    const props = { nodeId: 'test-node' };

    const tab = agentHarnessTab(intl, props);

    expect(tab.id).toBe('AGENT_HARNESS');
    expect(tab.title).toBe('Agent Harness');
    expect(tab.visible).toBe(true);
    expect(tab.order).toBe(0);
    expect(tab.content).toBeTruthy();
  });
});
