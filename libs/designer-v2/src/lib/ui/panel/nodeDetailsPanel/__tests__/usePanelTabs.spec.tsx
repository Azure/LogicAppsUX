/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import type { ReactNode } from 'react';
import { usePanelTabs } from '../usePanelTabs';
import constants from '../../../../common/constants';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

// Mock selectors
const mocks = {
  useNodeMetadata: vi.fn(),
  useOperationInfo: vi.fn(),
  useOperationManifest: vi.fn(),
  useIsA2AWorkflow: vi.fn(),
  useIsAgenticWorkflowOnly: vi.fn(),
  usePanelTabHideKeys: vi.fn(),
  useUnitTest: vi.fn(),
  useMonitoringView: vi.fn(),
  useParameterValidationErrors: vi.fn(),
  useIsNodePinnedToOperationPanel: vi.fn(),
  useSettingValidationErrors: vi.fn(),
  useHasSchema: vi.fn(),
  useRetryHistory: vi.fn(),
  isTriggerNode: vi.fn(),
};

vi.mock('../../../../core', () => ({
  useNodeMetadata: (...args: any[]) => mocks.useNodeMetadata(...args),
  useOperationInfo: (...args: any[]) => mocks.useOperationInfo(...args),
}));
vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => mocks.useIsA2AWorkflow(),
  useIsAgenticWorkflowOnly: () => mocks.useIsAgenticWorkflowOnly(),
}));
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  usePanelTabHideKeys: () => mocks.usePanelTabHideKeys(),
  useUnitTest: () => mocks.useUnitTest(),
  useMonitoringView: () => mocks.useMonitoringView(),
}));
vi.mock('../../../../core/state/operation/operationSelector', () => ({
  useParameterValidationErrors: (...args: any[]) => mocks.useParameterValidationErrors(...args),
}));
vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsNodePinnedToOperationPanel: (...args: any[]) => mocks.useIsNodePinnedToOperationPanel(...args),
}));
vi.mock('../../../../core/state/setting/settingSelector', () => ({
  useSettingValidationErrors: (...args: any[]) => mocks.useSettingValidationErrors(...args),
}));
vi.mock('../../../../core/state/staticresultschema/staitcresultsSelector', () => ({
  useHasSchema: (...args: any[]) => mocks.useHasSchema(...args),
}));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useRetryHistory: (...args: any[]) => mocks.useRetryHistory(...args),
}));
vi.mock('../../../../core/utils/graph', () => ({
  isTriggerNode: (...args: any[]) => mocks.isTriggerNode(...args),
}));
vi.mock('../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationManifest: (...args: any[]) => mocks.useOperationManifest(...args),
}));

// Mock tabs - IDs must match constants.PANEL_TAB_NAMES values
vi.mock('../tabs/aboutTab', () => ({
  aboutTab: vi.fn(() => ({ id: 'ABOUT', title: 'About', visible: true, content: null, order: 10 })),
}));
vi.mock('../tabs/codeViewTab', () => ({
  codeViewTab: vi.fn(() => ({ id: 'CODE_VIEW', title: 'Code View', visible: true, content: null, order: 6 })),
}));
vi.mock('../tabs/mockResultsTab/mockResultsTab', () => ({
  mockResultsTab: vi.fn(() => ({ id: 'MOCK_RESULTS', title: 'Mock Results', visible: true, content: null, order: 0 })),
}));
vi.mock('../tabs/monitoringTab/monitoringTab', () => ({
  monitoringTab: vi.fn(() => ({ id: 'MONITORING', title: 'Monitoring', visible: true, content: null, order: 0 })),
}));
vi.mock('../tabs/parametersTab', () => ({
  parametersTab: vi.fn(() => ({ id: 'PARAMETERS', title: 'Parameters', visible: true, content: null, order: 1 })),
}));
vi.mock('../tabs/retryTab', () => ({
  monitorRetryTab: vi.fn(() => ({ id: 'RETRY_HISTORY', title: 'Retry History', visible: true, content: null, order: 11 })),
}));
vi.mock('../tabs/scratchTab', () => ({ scratchTab: { id: 'scratchTab', title: 'Scratch', visible: true, content: null, order: 99 } }));
vi.mock('../tabs/settingsTab', () => ({
  settingsTab: vi.fn(() => ({ id: 'SETTINGS', title: 'Settings', visible: true, content: null, order: 2 })),
}));
vi.mock('../tabs/testingTab', () => ({
  testingTab: vi.fn(() => ({ id: 'TESTING', title: 'Testing', visible: true, content: null, order: 5 })),
}));
vi.mock('../tabs/agentHarnessTab/agentHarnessTab', () => ({
  agentHarnessTab: vi.fn(() => ({ id: 'AGENT_HARNESS', title: 'Agent Harness', visible: true, content: null, order: 3 })),
}));
vi.mock('../tabs/channelsTab', () => ({
  channelsTab: vi.fn(() => ({ id: 'CHANNELS', title: 'Channels', visible: true, content: null, order: 3 })),
}));
vi.mock('../tabs/handoffTab', () => ({
  handoffTab: vi.fn(() => ({ id: 'HANDOFF', title: 'Handoff', visible: true, content: null, order: 4 })),
}));

const createStore = () =>
  configureStore({
    reducer: { workflow: (state = { nodesMetadata: {} }) => state },
    preloadedState: { workflow: { nodesMetadata: {} } },
  });

const wrapper =
  (store: ReturnType<typeof createStore>) =>
  ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    </Provider>
  );

const renderTabs = (nodeId = 'test-node') => renderHook(() => usePanelTabs({ nodeId }), { wrapper: wrapper(createStore()) });
const getTabIds = (result: ReturnType<typeof renderTabs>['result']) => result.current.map((tab) => tab.id);

describe('usePanelTabs', () => {
  beforeEach(() => {
    mocks.useNodeMetadata.mockReturnValue(null);
    mocks.useOperationInfo.mockReturnValue({ type: 'http', kind: 'http', connectorId: 'test', operationId: 'test' });
    mocks.useIsA2AWorkflow.mockReturnValue(false);
    mocks.useIsAgenticWorkflowOnly.mockReturnValue(false);
    mocks.usePanelTabHideKeys.mockReturnValue([]);
    mocks.useUnitTest.mockReturnValue(false);
    mocks.useMonitoringView.mockReturnValue(false);
    mocks.useParameterValidationErrors.mockReturnValue([]);
    mocks.useIsNodePinnedToOperationPanel.mockReturnValue(false);
    mocks.useSettingValidationErrors.mockReturnValue([]);
    mocks.useHasSchema.mockReturnValue(false);
    mocks.useRetryHistory.mockReturnValue(null);
    mocks.isTriggerNode.mockReturnValue(false);
    mocks.useOperationManifest.mockReturnValue({ data: undefined });
  });

  afterEach(() => vi.clearAllMocks());

  it('returns only mockResultsTab in unit test view', () => {
    mocks.useUnitTest.mockReturnValue(true);
    const { result } = renderTabs();
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(constants.PANEL_TAB_NAMES.MOCK_RESULTS);
  });

  it.each([SUBGRAPH_TYPES.SWITCH_CASE, SUBGRAPH_TYPES.AGENT_CONDITION])('returns only parametersTab for %s nodes', (subgraphType) => {
    mocks.useNodeMetadata.mockReturnValue({ subgraphType });
    const { result } = renderTabs();
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(constants.PANEL_TAB_NAMES.PARAMETERS);
  });

  it('returns full tabs (not just parametersTab) for built-in agent tools like code_interpreter', () => {
    mocks.useNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION });
    const { result } = renderTabs('code_interpreter');
    // Built-in tools should NOT be restricted to parametersTab only
    expect(result.current.length).toBeGreaterThan(1);
    const tabIds = result.current.map((tab) => tab.id);
    expect(tabIds).not.toEqual([constants.PANEL_TAB_NAMES.PARAMETERS]);
  });

  it('returns specific tabs for MCP_CLIENT nodes (no settings/channels)', () => {
    mocks.useNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.MCP_CLIENT });
    const tabIds = getTabIds(renderTabs().result);
    expect(tabIds).toContain(constants.PANEL_TAB_NAMES.PARAMETERS);
    expect(tabIds).not.toContain(constants.PANEL_TAB_NAMES.SETTINGS);
    expect(tabIds).not.toContain(constants.PANEL_TAB_NAMES.CHANNELS);
  });

  describe('Monitoring View', () => {
    beforeEach(() => mocks.useMonitoringView.mockReturnValue(true));

    it('shows monitoring tab, hides parameters tab', () => {
      const tabIds = getTabIds(renderTabs().result);
      expect(tabIds).toContain(constants.PANEL_TAB_NAMES.MONITORING);
      expect(tabIds).not.toContain(constants.PANEL_TAB_NAMES.PARAMETERS);
    });

    it('hides monitoring tab for scope nodes', () => {
      mocks.useOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.SCOPE, connectorId: 'test', operationId: 'test' });
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.MONITORING);
    });

    it('shows retry tab only when run history exists', () => {
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.RETRY_HISTORY);
      mocks.useRetryHistory.mockReturnValue([{ id: 'retry-1' }]);
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.RETRY_HISTORY);
    });
  });

  describe('Testing Tab', () => {
    it('shows when node has schema and is not trigger/monitoring', () => {
      mocks.useHasSchema.mockReturnValue(true);
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.TESTING);
    });

    it.each([
      ['trigger node', () => mocks.isTriggerNode.mockReturnValue(true)],
      ['no schema', () => mocks.useHasSchema.mockReturnValue(false)],
      ['monitoring view', () => mocks.useMonitoringView.mockReturnValue(true)],
    ])('hides for %s', (_, setup) => {
      mocks.useHasSchema.mockReturnValue(true);
      setup();
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.TESTING);
    });
  });

  describe('Settings Tab', () => {
    it('hides for Agent REQUEST triggers', () => {
      mocks.isTriggerNode.mockReturnValue(true);
      mocks.useOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.REQUEST, kind: constants.NODE.KIND.AGENT });
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.SETTINGS);
    });

    it('shows for non-agent triggers', () => {
      mocks.isTriggerNode.mockReturnValue(true);
      mocks.useOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.REQUEST, kind: constants.NODE.KIND.HTTP });
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.SETTINGS);
    });
  });

  describe('Agent Tabs', () => {
    const setAgentNode = () => mocks.useOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.AGENT });

    it('shows channels tab for agent nodes in agentic workflow', () => {
      setAgentNode();
      mocks.useIsAgenticWorkflowOnly.mockReturnValue(true);
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.CHANNELS);
    });

    it('shows handoff tab for agent nodes in A2A workflow (not monitoring)', () => {
      setAgentNode();
      mocks.useIsA2AWorkflow.mockReturnValue(true);
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.HANDOFF);

      mocks.useMonitoringView.mockReturnValue(true);
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.HANDOFF);
    });

    it('shows agent harness tab for agent nodes when enableAgentHarness is true', () => {
      setAgentNode();
      mocks.useOperationManifest.mockReturnValue({ data: { properties: { enableAgentHarness: true } } });
      expect(getTabIds(renderTabs().result)).toContain(constants.PANEL_TAB_NAMES.AGENT_HARNESS);
    });

    it('hides agent harness tab when enableAgentHarness is false', () => {
      setAgentNode();
      mocks.useOperationManifest.mockReturnValue({ data: { properties: { enableAgentHarness: false } } });
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.AGENT_HARNESS);
    });

    it('hides agent harness tab for non-agent nodes', () => {
      mocks.useOperationInfo.mockReturnValue({ type: 'http', kind: 'http', connectorId: 'test', operationId: 'test' });
      mocks.useOperationManifest.mockReturnValue({ data: { properties: { enableAgentHarness: true } } });
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.AGENT_HARNESS);
    });

    it('hides agent harness tab in monitoring view', () => {
      setAgentNode();
      mocks.useOperationManifest.mockReturnValue({ data: { properties: { enableAgentHarness: true } } });
      mocks.useMonitoringView.mockReturnValue(true);
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.AGENT_HARNESS);
    });

    it('hides agent harness tab when manifest data is not loaded', () => {
      setAgentNode();
      mocks.useOperationManifest.mockReturnValue({ data: undefined });
      expect(getTabIds(renderTabs().result)).not.toContain(constants.PANEL_TAB_NAMES.AGENT_HARNESS);
    });
  });

  it('filters tabs based on panelTabHideKeys', () => {
    mocks.usePanelTabHideKeys.mockReturnValue([constants.PANEL_TAB_NAMES.SETTINGS, constants.PANEL_TAB_NAMES.CODE_VIEW]);
    const tabIds = getTabIds(renderTabs().result);
    expect(tabIds).not.toContain(constants.PANEL_TAB_NAMES.SETTINGS);
    expect(tabIds).not.toContain(constants.PANEL_TAB_NAMES.CODE_VIEW);
  });

  it('returns tabs sorted by order', () => {
    const { result } = renderTabs();
    const orders = result.current.map((tab) => tab.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('sets hasErrors on tabs with validation errors', () => {
    mocks.useParameterValidationErrors.mockReturnValue([{ key: 'error' }]);
    mocks.useSettingValidationErrors.mockReturnValue([{ key: 'error' }]);
    const { result } = renderTabs();
    expect(result.current.find((t) => t.id === constants.PANEL_TAB_NAMES.PARAMETERS)?.hasErrors).toBe(true);
    expect(result.current.find((t) => t.id === constants.PANEL_TAB_NAMES.SETTINGS)?.hasErrors).toBe(true);
  });
});
