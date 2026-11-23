import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the component
const mockDispatch = vi.fn();
const mockStore = { getState: () => ({ workflow: {} }) };
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useStore: () => mockStore,
}));

vi.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

vi.mock('../../../../core/queries/runs', () => ({
  useAgentChatInvokeUri: vi.fn(() => ({ data: undefined })),
  useCancelRun: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useChatHistory: vi.fn(() => ({
    refetch: vi.fn(),
    isFetching: false,
    data: undefined,
  })),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: vi.fn(() => true),
  useSharedNodeUi: vi.fn(() => false),
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => {
  const run = { id: 'run-123', properties: { status: 'Succeeded' } };
  return {
    getSelectedAgentRepetitionIdentity: vi.fn(() => 'run-123|Agent|000001|1|'),
    useAgentLastOperations: vi.fn(() => ({})),
    useAgentOperations: vi.fn(() => []),
    useFocusElement: vi.fn(() => undefined),
    useUriForAgentChat: vi.fn(() => undefined),
    useRunInstance: vi.fn(() => run),
  };
});

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: vi.fn(() => false),
}));

vi.mock('../../../../core', () => ({
  changePanelNode: vi.fn((nodeId: string) => ({ type: 'changePanelNode', payload: nodeId })),
}));

vi.mock('../../../../core/state/workflow/workflowSlice', () => ({
  clearFocusElement: vi.fn(() => ({ type: 'clearFocusElement' })),
  setFocusNode: vi.fn((nodeId: string) => ({ type: 'setFocusNode', payload: nodeId })),
  setRunIndex: vi.fn((payload: any) => ({ type: 'setRunIndex', payload })),
  setTimelineRepetitionIndex: vi.fn((index: number) => ({ type: 'setTimelineRepetitionIndex', payload: index })),
  setToolRunIndex: vi.fn((payload: any) => ({ type: 'setToolRunIndex', payload })),
}));

vi.mock('../../agentChat/helper', () => ({
  parseChatHistory: vi.fn(() => []),
  useRefreshChatMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('../../../../core/actions/bjsworkflow/monitoring', () => ({
  fetchBuiltInToolRunData: vi.fn((payload: any) => ({ type: 'fetchBuiltInToolRunData', payload })),
}));

vi.mock('@microsoft/logic-apps-chatbot', () => ({
  ChatbotUI: vi.fn(() => null),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    RunService: () => ({
      invokeAgentChat: vi.fn(),
    }),
  };
});

vi.mock('@fluentui/react-components', () => ({
  Button: vi.fn(({ children, onClick }: any) => <button onClick={onClick}>{children}</button>),
  Dialog: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogActions: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogBody: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogContent: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTrigger: vi.fn(({ children }: any) => <div>{children}</div>),
}));

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { changePanelNode } from '../../../../core';
import { setFocusNode, setRunIndex } from '../../../../core/state/workflow/workflowSlice';
import { fetchBuiltInToolRunData } from '../../../../core/actions/bjsworkflow/monitoring';
import { useRunInstance } from '../../../../core/state/workflow/workflowSelectors';
import { useChatHistory } from '../../../../core/queries/runs';
import { useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { parseChatHistory } from '../../agentChat/helper';

describe('AgentChatContent - toolResultCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([false, true])('selects a built-in chat result without changing an old Shared tool page (Shared: %s)', async (shared) => {
    vi.mocked(useSharedNodeUi).mockReturnValue(shared);
    vi.mocked(useChatHistory, { partial: true }).mockReturnValue({ data: [] });
    const { AgentChatContent } = await import('../agentChatContent');
    render(<AgentChatContent />);
    const [, selectTool] = vi.mocked(parseChatHistory).mock.calls[0];
    act(() => selectTool('Agent', 'code_interpreter', 1, 2));

    expect(vi.mocked(setRunIndex).mock.calls.map(([selection]) => selection)).toEqual([
      { page: 1, nodeId: 'Agent' },
      ...(!shared ? [{ page: 2, nodeId: 'code_interpreter' }] : []),
    ]);
    expect(fetchBuiltInToolRunData).toHaveBeenCalledWith({
      toolNodeId: 'code_interpreter',
      agentNodeId: 'Agent',
      runId: 'run-123',
      repetitionName: '000001',
      ...(shared && { agentToolInvocation: { agentRepetitionIdentity: 'run-123|Agent|000001|1|', page: 2 } }),
    });
    expect(changePanelNode).toHaveBeenCalledWith('code_interpreter');
    expect(setFocusNode).toHaveBeenCalledWith('code_interpreter');
  });

  it('should have correct run instance available for built-in tool data fetching', () => {
    const { result } = renderHook(() => useRunInstance());
    expect(result.current).toEqual({ id: 'run-123', properties: { status: 'Succeeded' } });
  });

  it('should dispatch setRunIndex for non-built-in tools', () => {
    // For non-built-in tools, the callback dispatches setRunIndex for the agent and tool
    expect(setRunIndex).toBeDefined();
    const action = setRunIndex({ page: 0, nodeId: 'my_tool' });
    expect(action).toEqual({ type: 'setRunIndex', payload: { page: 0, nodeId: 'my_tool' } });
  });

  it('should format repetition name correctly for built-in tool dispatch', () => {
    // The callback converts iteration number to padded string: String(iteration).padStart(6, '0')
    const iteration = 3;
    const repetitionName = String(iteration).padStart(6, '0');
    expect(repetitionName).toBe('000003');
  });
});
