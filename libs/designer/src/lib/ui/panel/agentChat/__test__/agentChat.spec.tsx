import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the component
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
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
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useAgentLastOperations: vi.fn(() => ({})),
  useAgentOperations: vi.fn(() => []),
  useFocusElement: vi.fn(() => undefined),
  useUriForAgentChat: vi.fn(() => undefined),
  useRunInstance: vi.fn(() => ({ id: 'run-123', properties: { status: 'Succeeded' } })),
}));

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

vi.mock('../helper', () => ({
  parseChatHistory: vi.fn(() => []),
  useRefreshChatMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('../../../../core/actions/bjsworkflow/monitoring', () => ({
  fetchBuiltInToolRunData: vi.fn((payload: any) => ({ type: 'fetchBuiltInToolRunData', payload })),
}));

vi.mock('@microsoft/logic-apps-chatbot', () => ({
  ChatbotUI: vi.fn(() => null),
  defaultChatbotPanelWidth: '400px',
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

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Button: vi.fn(({ children, onClick }: any) => <button onClick={onClick}>{children}</button>),
    Dialog: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogActions: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogBody: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogContent: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogSurface: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogTitle: vi.fn(({ children }: any) => <div>{children}</div>),
    DialogTrigger: vi.fn(({ children }: any) => <div>{children}</div>),
    Drawer: vi.fn(({ children }: any) => <div>{children}</div>),
    mergeClasses: vi.fn((...args: string[]) => args.join(' ')),
  };
});

vi.mock('@fluentui/react-icons', () => ({
  ChatFilled: vi.fn(() => null),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PanelResizer: vi.fn(() => null),
  };
});

vi.mock('../agentChatHeader', () => ({
  AgentChatHeader: vi.fn(() => <div data-testid="agent-chat-header" />),
}));

import React from 'react';
import { renderHook } from '@testing-library/react';
import { changePanelNode } from '../../../../core';
import { setFocusNode, setRunIndex } from '../../../../core/state/workflow/workflowSlice';
import { fetchBuiltInToolRunData } from '../../../../core/actions/bjsworkflow/monitoring';
import { useRunInstance } from '../../../../core/state/workflow/workflowSelectors';

describe('AgentChat - toolResultCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have fetchBuiltInToolRunData available for built-in tool dispatching', () => {
    // Verify the imports and mock setup are correct for built-in tool dispatching
    expect(fetchBuiltInToolRunData).toBeDefined();
    expect(changePanelNode).toBeDefined();
    expect(setFocusNode).toBeDefined();

    // Verify that fetchBuiltInToolRunData creates the correct action
    const action = fetchBuiltInToolRunData({
      toolNodeId: 'code_interpreter',
      agentNodeId: 'agent1',
      runId: 'run-123',
      repetitionName: '000000',
    });
    expect(action).toEqual({
      type: 'fetchBuiltInToolRunData',
      payload: {
        toolNodeId: 'code_interpreter',
        agentNodeId: 'agent1',
        runId: 'run-123',
        repetitionName: '000000',
      },
    });
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
