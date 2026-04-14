/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock dependencies
const mockHostOptions = vi.fn();

vi.mock('../../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useHostOptions: () => mockHostOptions(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  getRecordEntry: vi.fn((_map: any, key: string) => _map?.[key]),
  WorkflowService: vi.fn(() => ({
    getSandboxConfigurations: undefined,
  })),
}));

vi.mock('../../../../../../core/state/operation/operationMetadataSlice', () => ({
  updateNodeParameters: vi.fn((payload: any) => ({ type: 'test/updateNodeParameters', payload })),
}));

import { AgentHarnessTab, agentHarnessTab } from '../agentHarnessTab';

const TEST_NODE_ID = 'agent-node-1';

const createAgentModelSettingsParameter = (agentHarness: any) => ({
  parameterGroups: {
    default: {
      parameters: [
        {
          id: 'param-1',
          parameterName: 'inputs.$.agentModelSettings',
          value: [{ id: 'seg-1', type: 'literal', value: JSON.stringify({ agentHarness }) }],
        },
      ],
    },
  },
});

const createStore = (inputParameters: Record<string, any> = {}) =>
  configureStore({
    reducer: {
      operations: (state = { inputParameters: {} }) => state,
      designerOptions: (state = { hostOptions: {} }) => state,
    },
    preloadedState: {
      operations: { inputParameters },
      designerOptions: { hostOptions: {} },
    },
  });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (nodeId: string, inputParameters: Record<string, any> = {}) => {
  const store = createStore(inputParameters);
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
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockHostOptions.mockReturnValue({});
  });

  describe('Info MessageBar', () => {
    it('renders info message bar', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText(/Agent Harness configures the sandbox environment/i)).toBeTruthy();
    });
  });

  describe('Execution Environment section', () => {
    it('renders execution environment section title', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText('Execution Environment')).toBeTruthy();
    });

    it('renders subtitle', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText('Choose the harness runtime for agent execution.')).toBeTruthy();
    });

    it('renders dropdown for harness type', () => {
      renderWithProviders(TEST_NODE_ID);
      // The Fluent v9 Dropdown renders with role="combobox"
      const dropdowns = screen.getAllByRole('combobox');
      expect(dropdowns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sandbox Configuration section', () => {
    it('renders sandbox configuration section title', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText('Sandbox Configuration (Optional)')).toBeTruthy();
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
      expect(screen.getByText('Integration Account')).toBeTruthy();
    });

    it('renders sandbox configuration dropdown', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.getByText('Sandbox Configuration')).toBeTruthy();
    });
  });

  describe('Sandbox mismatch warning', () => {
    it('shows warning when sandboxConfigurationId does not match integration account', () => {
      mockHostOptions.mockReturnValue({
        integrationAccount: { id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/ia1' },
      });
      const inputParameters = {
        [TEST_NODE_ID]: createAgentModelSettingsParameter({
          type: 'GHCP',
          sandboxConfigurationId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/differentIA/sandboxConfigurations/sc1',
        }),
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.getByText(/sandbox configuration belongs to a different integration account/i)).toBeTruthy();
    });

    it('does not show warning when sandboxConfigurationId matches integration account', () => {
      const iaId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/integrationAccounts/ia1';
      mockHostOptions.mockReturnValue({ integrationAccount: { id: iaId } });
      const inputParameters = {
        [TEST_NODE_ID]: createAgentModelSettingsParameter({
          type: 'GHCP',
          sandboxConfigurationId: `${iaId}/sandboxConfigurations/sc1`,
        }),
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.queryByText(/sandbox configuration belongs to a different integration account/i)).toBeNull();
    });

    it('does not show warning when no sandboxConfigurationId is set', () => {
      mockHostOptions.mockReturnValue({
        integrationAccount: { id: '/test/ia' },
      });
      const inputParameters = {
        [TEST_NODE_ID]: createAgentModelSettingsParameter({ type: 'GHCP' }),
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.queryByText(/sandbox configuration belongs to a different integration account/i)).toBeNull();
    });
  });

  describe('Input Files section', () => {
    it('does not render input files section when no files present', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText('Input Files')).toBeNull();
    });

    it('renders input files DataGrid when files present', () => {
      const inputParameters = {
        [TEST_NODE_ID]: createAgentModelSettingsParameter({
          type: 'GHCP',
          inputFiles: [
            { name: 'data.csv', content: '@triggerBody()' },
            { name: 'config.json', content: '{"key": "value"}' },
          ],
        }),
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.getByText('Input Files')).toBeTruthy();
      expect(screen.getByText('data.csv')).toBeTruthy();
      expect(screen.getByText('@triggerBody()')).toBeTruthy();
      expect(screen.getByText('config.json')).toBeTruthy();
    });
  });

  describe('Skills section', () => {
    it('does not render skills section when no skills present', () => {
      renderWithProviders(TEST_NODE_ID);
      expect(screen.queryByText('Skills')).toBeNull();
    });

    it('renders skills DataGrid when skills present', () => {
      const inputParameters = {
        [TEST_NODE_ID]: createAgentModelSettingsParameter({
          type: 'GHCP',
          skills: [{ repository: 'contoso/repo', folders: ['src', 'lib'] }],
        }),
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.getByText('Skills')).toBeTruthy();
      expect(screen.getByText('contoso/repo')).toBeTruthy();
      expect(screen.getByText('src, lib')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('renders gracefully when no agentModelSettings parameter exists', () => {
      renderWithProviders(TEST_NODE_ID);
      // Should render without errors, showing the info bar and section headers
      expect(screen.getByText('Execution Environment')).toBeTruthy();
      expect(screen.getByText('Sandbox Configuration (Optional)')).toBeTruthy();
    });

    it('renders gracefully when agentModelSettings has no agentHarness', () => {
      const inputParameters = {
        [TEST_NODE_ID]: {
          parameterGroups: {
            default: {
              parameters: [
                {
                  id: 'param-1',
                  parameterName: 'inputs.$.agentModelSettings',
                  value: [{ id: 'seg-1', type: 'literal', value: '{}' }],
                },
              ],
            },
          },
        },
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      expect(screen.getByText('Execution Environment')).toBeTruthy();
    });

    it('handles malformed JSON in agentModelSettings gracefully', () => {
      const inputParameters = {
        [TEST_NODE_ID]: {
          parameterGroups: {
            default: {
              parameters: [
                {
                  id: 'param-1',
                  parameterName: 'inputs.$.agentModelSettings',
                  value: [{ id: 'seg-1', type: 'literal', value: 'not-valid-json' }],
                },
              ],
            },
          },
        },
      };
      renderWithProviders(TEST_NODE_ID, inputParameters);
      // Should render without errors
      expect(screen.getByText('Execution Environment')).toBeTruthy();
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
