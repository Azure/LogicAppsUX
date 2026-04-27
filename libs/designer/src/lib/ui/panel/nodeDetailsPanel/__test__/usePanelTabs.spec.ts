/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { usePanelTabs } from '../usePanelTabs';
import constants from '../../../../common/constants';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

// Mock all selector hooks
const mockUseMonitoringView = vi.fn();
const mockUseUnitTest = vi.fn();
const mockUsePanelTabHideKeys = vi.fn();
const mockUseIsNodePinnedToOperationPanel = vi.fn();
const mockUseParameterValidationErrors = vi.fn();
const mockUseSettingValidationErrors = vi.fn();
const mockUseHasSchema = vi.fn();
const mockUseRetryHistory = vi.fn();
const mockUseNodeMetadata = vi.fn();
const mockUseOperationInfo = vi.fn();
const mockUseIsA2AWorkflow = vi.fn();
const mockUseIsAgenticWorkflowOnly = vi.fn();
const mockUseOperationManifest = vi.fn();

vi.mock('../../../../core', () => ({
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useOperationInfo: (...args: any[]) => mockUseOperationInfo(...args),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockUseMonitoringView(),
  useUnitTest: () => mockUseUnitTest(),
  usePanelTabHideKeys: () => mockUsePanelTabHideKeys(),
}));

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => mockUseIsA2AWorkflow(),
  useIsAgenticWorkflowOnly: () => mockUseIsAgenticWorkflowOnly(),
}));

vi.mock('../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationManifest: (...args: any[]) => mockUseOperationManifest(...args),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsNodePinnedToOperationPanel: (...args: any[]) => mockUseIsNodePinnedToOperationPanel(...args),
}));

vi.mock('../../../../core/state/operation/operationSelector', () => ({
  useParameterValidationErrors: (...args: any[]) => mockUseParameterValidationErrors(...args),
}));

vi.mock('../../../../core/state/setting/settingSelector', () => ({
  useSettingValidationErrors: (...args: any[]) => mockUseSettingValidationErrors(...args),
}));

vi.mock('../../../../core/state/staticresultschema/staitcresultsSelector', () => ({
  useHasSchema: (...args: any[]) => mockUseHasSchema(...args),
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useRetryHistory: (...args: any[]) => mockUseRetryHistory(...args),
}));

vi.mock('../../../../core/utils/graph', () => ({
  isTriggerNode: vi.fn().mockReturnValue(false),
}));

// Mock tab factory functions to return simple objects with ids and order
vi.mock('../tabs/parametersTab', () => ({
  parametersTab: () => ({ id: 'parameters', title: 'Parameters', order: 0, visible: true, content: null }),
}));

vi.mock('../tabs/monitoringTab/monitoringTab', () => ({
  monitoringTab: () => ({ id: 'monitoring', title: 'Monitoring', order: -1, visible: true, content: null }),
}));

vi.mock('../tabs/codeViewTab', () => ({
  codeViewTab: () => ({ id: 'codeView', title: 'Code View', order: 2, visible: true, content: null }),
}));

vi.mock('../tabs/aboutTab', () => ({
  aboutTab: () => ({ id: 'about', title: 'About', order: 3, visible: true, content: null }),
}));

vi.mock('../tabs/settingsTab', () => ({
  settingsTab: () => ({ id: 'settings', title: 'Settings', order: 1, visible: true, content: null }),
}));

vi.mock('../tabs/testingTab', () => ({
  testingTab: () => ({ id: 'testing', title: 'Testing', order: 4, visible: true, content: null }),
}));

vi.mock('../tabs/retryTab', () => ({
  monitorRetryTab: () => ({ id: 'retry', title: 'Retry', order: 5, visible: true, content: null }),
}));

vi.mock('../tabs/mockResultsTab/mockResultsTab', () => ({
  mockResultsTab: () => ({ id: 'mockResults', title: 'Mock Results', order: 0, visible: true, content: null }),
}));

vi.mock('../tabs/scratchTab', () => ({
  scratchTab: { id: 'scratch', title: 'Scratch', order: 100, visible: true, content: null },
}));

vi.mock('../tabs/channelsTab', () => ({
  channelsTab: () => ({ id: 'channels', title: 'Channels', order: 6, visible: true, content: null }),
}));

vi.mock('../tabs/handoffTab', () => ({
  handoffTab: () => ({ id: 'handoff', title: 'Handoff', order: 7, visible: true, content: null }),
}));

vi.mock('../tabs/agentHarnessTab/agentHarnessTab', () => ({
  agentHarnessTab: () => ({ id: 'agentHarness', title: 'Agent Harness', order: 8, visible: true, content: null }),
}));

describe('usePanelTabs', () => {
  const createWrapper = () => {
    const store = configureStore({
      reducer: {
        workflow: (state = { nodesMetadata: {} }) => state,
      },
    });

    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, React.createElement(IntlProvider, { locale: 'en', defaultLocale: 'en' }, children));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMonitoringView.mockReturnValue(false);
    mockUseUnitTest.mockReturnValue(false);
    mockUsePanelTabHideKeys.mockReturnValue([]);
    mockUseIsNodePinnedToOperationPanel.mockReturnValue(false);
    mockUseParameterValidationErrors.mockReturnValue([]);
    mockUseSettingValidationErrors.mockReturnValue([]);
    mockUseHasSchema.mockReturnValue(false);
    mockUseRetryHistory.mockReturnValue(undefined);
    mockUseNodeMetadata.mockReturnValue(null);
    mockUseOperationInfo.mockReturnValue({ type: 'Action', connectorId: 'test', operationId: 'test' });
    mockUseIsA2AWorkflow.mockReturnValue(false);
    mockUseIsAgenticWorkflowOnly.mockReturnValue(false);
    mockUseOperationManifest.mockReturnValue({ data: undefined, isLoading: false, isFetched: true });
  });

  it('should return only mockResultsTab when isUnitTestView is true', () => {
    mockUseUnitTest.mockReturnValue(true);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('mockResults');
  });

  it('should return only parametersTab for SWITCH_CASE subgraphType', () => {
    mockUseNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.SWITCH_CASE });

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('parameters');
  });

  it('should return only parametersTab for AGENT_CONDITION subgraphType (non built-in tool)', () => {
    mockUseNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION });

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'myCustomTool' }), { wrapper: createWrapper() });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('parameters');
  });

  it('should return full tab set for built-in agent tools (code_interpreter)', () => {
    mockUseNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION });

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'code_interpreter' }), { wrapper: createWrapper() });

    // Built-in agent tools should not be limited to parameters-only
    expect(result.current.length).toBeGreaterThan(1);
  });

  it('should return limited tabs for MCP_CLIENT subgraphType', () => {
    mockUseNodeMetadata.mockReturnValue({ subgraphType: SUBGRAPH_TYPES.MCP_CLIENT });

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    // MCP_CLIENT should have at most: monitoring, parameters, codeView, about
    // Only visible ones will appear (monitoring is hidden when not monitoring view)
    expect(tabIds).toContain('parameters');
    expect(tabIds).toContain('codeView');
    expect(tabIds).toContain('about');
    expect(tabIds).not.toContain('settings');
    expect(tabIds).not.toContain('testing');
  });

  it('should show monitoring tab only in monitoring view', () => {
    mockUseMonitoringView.mockReturnValue(true);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).toContain('monitoring');
  });

  it('should not show monitoring tab when not in monitoring view', () => {
    mockUseMonitoringView.mockReturnValue(false);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).not.toContain('monitoring');
  });

  it('should show retry tab when monitoring view with retry history', () => {
    mockUseMonitoringView.mockReturnValue(true);
    mockUseRetryHistory.mockReturnValue([{ status: 'Failed' }]);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).toContain('retry');
  });

  it('should not show retry tab when no retry history', () => {
    mockUseMonitoringView.mockReturnValue(true);
    mockUseRetryHistory.mockReturnValue(undefined);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).not.toContain('retry');
  });

  it('should show channels tab for agent nodes in agentic workflow', () => {
    mockUseOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.AGENT, connectorId: 'test', operationId: 'test' });
    mockUseIsAgenticWorkflowOnly.mockReturnValue(true);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).toContain('channels');
  });

  it('should show handoff tab for agent nodes in A2A workflow (non-monitoring)', () => {
    mockUseOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.AGENT, connectorId: 'test', operationId: 'test' });
    mockUseIsA2AWorkflow.mockReturnValue(true);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).toContain('handoff');
  });

  it('should not show handoff tab in monitoring view', () => {
    mockUseOperationInfo.mockReturnValue({ type: constants.NODE.TYPE.AGENT, connectorId: 'test', operationId: 'test' });
    mockUseIsA2AWorkflow.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).not.toContain('handoff');
  });

  it('should filter out tabs based on panelTabHideKeys', () => {
    mockUsePanelTabHideKeys.mockReturnValue(['settings', 'about']);

    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    const tabIds = result.current.map((t) => t.id);
    expect(tabIds).not.toContain('settings');
    expect(tabIds).not.toContain('about');
  });

  it('should sort tabs by order property', () => {
    const { result } = renderHook(() => usePanelTabs({ nodeId: 'testNode' }), { wrapper: createWrapper() });

    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i].order).toBeGreaterThanOrEqual(result.current[i - 1].order);
    }
  });
});
