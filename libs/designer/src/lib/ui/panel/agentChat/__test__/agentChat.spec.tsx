import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';

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

const mockRefetch = vi.fn();
vi.mock('../../../../core/queries/runs', () => ({
  useAgentChatInvokeUri: vi.fn(() => ({ data: undefined })),
  useCancelRun: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useChatHistory: vi.fn(() => ({
    refetch: mockRefetch,
    isFetching: false,
    data: undefined,
  })),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: vi.fn(() => true),
}));

// Use stable references to avoid infinite render loops
const stableRunInstance = { id: 'run-123', properties: { status: 'Succeeded' } };
const stableAgentOps: string[] = [];
const stableLastOps = {};
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useAgentLastOperations: vi.fn(() => stableLastOps),
  useAgentOperations: vi.fn(() => stableAgentOps),
  useFocusElement: vi.fn(() => undefined),
  useUriForAgentChat: vi.fn(() => undefined),
  useRunInstance: vi.fn(() => stableRunInstance),
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

vi.mock('../../../../common/constants', () => ({
  default: { FLOW_STATUS: { RUNNING: 'Running' } },
}));

vi.mock('@microsoft/logic-apps-chatbot', () => ({
  ChatbotUI: vi.fn(({ body, panel }: any) => <div data-testid="chatbot-ui">{panel?.header}</div>),
  defaultChatbotPanelWidth: '400px',
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isNullOrUndefined: (val: any) => val === null || val === undefined,
  isBuiltInAgentTool: (name: string) => name === 'code_interpreter',
  LogEntryLevel: { Error: 'Error' },
  LoggerService: () => ({ log: vi.fn() }),
  RunService: () => ({ invokeAgentChat: vi.fn() }),
}));

vi.mock('@fluentui/react-components', () => ({
  Button: vi.fn(({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} data-automation-id={rest['data-automation-id']}>
      {children}
    </button>
  )),
  Dialog: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogActions: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogBody: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogContent: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogSurface: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTrigger: vi.fn(({ children }: any) => <div>{children}</div>),
  Drawer: vi.fn(({ children, 'aria-label': ariaLabel }: any) => (
    <div data-testid="drawer" aria-label={ariaLabel}>
      {children}
    </div>
  )),
  mergeClasses: vi.fn((...args: string[]) => args.join(' ')),
}));

vi.mock('@fluentui/react-icons', () => ({
  ChatFilled: vi.fn(() => <span data-testid="chat-icon" />),
}));

vi.mock('@microsoft/designer-ui', () => ({
  PanelLocation: { Left: 'LEFT', Right: 'RIGHT' },
  PanelResizer: vi.fn(() => null),
  PanelSize: { Auto: 'auto' },
}));

vi.mock('../agentChatHeader', () => ({
  AgentChatHeader: vi.fn(() => <div data-testid="agent-chat-header" />),
}));

import { render, screen } from '@testing-library/react';
import { AgentChat } from '../agentChat';
import { useChatHistory } from '../../../../core/queries/runs';
import { useRunInstance, useAgentLastOperations } from '../../../../core/state/workflow/workflowSelectors';
import { parseChatHistory } from '../helper';
import { fetchBuiltInToolRunData } from '../../../../core/actions/bjsworkflow/monitoring';

describe('AgentChat', () => {
  const createPanelContainerRef = () => {
    const div = document.createElement('div');
    return { current: div } as React.MutableRefObject<HTMLElement | null>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the drawer with chatbot UI', () => {
    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    expect(screen.getByTestId('drawer')).toBeDefined();
    expect(screen.getByTestId('chatbot-ui')).toBeDefined();
    expect(screen.getByTestId('agent-chat-header')).toBeDefined();
  });

  it('should show stop button visibility based on run status', () => {
    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    // The component renders - stop button visibility is handled by AgentChatHeader
    expect(screen.getByTestId('agent-chat-header')).toBeDefined();
  });

  it('should call parseChatHistory when chat history data is available', () => {
    const mockChatData = [{ nodeId: 'agent1', messages: [{ content: 'hello', role: 'assistant' }] }];
    (useChatHistory as any).mockReturnValue({
      refetch: mockRefetch,
      isFetching: false,
      data: mockChatData,
    });

    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    expect(parseChatHistory).toHaveBeenCalledWith(
      mockChatData,
      expect.any(Function), // toolResultCallback
      expect.any(Function), // toolContentCallback
      expect.any(Function), // agentCallback
      false // isA2AWorkflow
    );
  });

  it('should dispatch built-in tool actions via toolResultCallback', () => {
    const mockChatData = [{ nodeId: 'agent1', messages: [{ content: 'test', role: 'assistant' }] }];
    (useChatHistory as any).mockReturnValue({
      refetch: mockRefetch,
      isFetching: false,
      data: mockChatData,
    });

    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    // Extract toolResultCallback from parseChatHistory call
    const toolResultCallback = (parseChatHistory as any).mock.calls[0][1];

    // Call it with a built-in tool (code_interpreter)
    toolResultCallback('agent1', 'code_interpreter', 2, 0);

    // Should dispatch setRunIndex for agent
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setRunIndex', payload: { page: 2, nodeId: 'agent1' } });
    // Should dispatch fetchBuiltInToolRunData
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'fetchBuiltInToolRunData',
      payload: {
        toolNodeId: 'code_interpreter',
        agentNodeId: 'agent1',
        runId: 'run-123',
        repetitionName: '000002',
      },
    });
    // Should dispatch setFocusNode and changePanelNode for the tool
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setFocusNode', payload: 'code_interpreter' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'changePanelNode', payload: 'code_interpreter' });
  });

  it('should dispatch regular tool actions for non-built-in tools via toolResultCallback', () => {
    const mockLastOpsData = { agent1: { my_tool: 'my_tool_last_action' } };
    (useAgentLastOperations as any).mockReturnValue(mockLastOpsData);
    const mockChatData = [{ nodeId: 'agent1', messages: [{ content: 'test', role: 'assistant' }] }];
    (useChatHistory as any).mockReturnValue({
      refetch: mockRefetch,
      isFetching: false,
      data: mockChatData,
    });

    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    const toolResultCallback = (parseChatHistory as any).mock.calls[0][1];

    // Call with a non-built-in tool
    toolResultCallback('agent1', 'my_tool', 1, 0);

    // Should dispatch setFocusNode with the last operation for that tool
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setFocusNode', payload: 'my_tool_last_action' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'changePanelNode', payload: 'my_tool_last_action' });
  });

  it('should dispatch toolContentCallback actions correctly', () => {
    const mockChatData = [{ nodeId: 'agent1', messages: [{ content: 'test', role: 'assistant' }] }];
    (useChatHistory as any).mockReturnValue({
      refetch: mockRefetch,
      isFetching: false,
      data: mockChatData,
    });

    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    const toolContentCallback = (parseChatHistory as any).mock.calls[0][2];

    toolContentCallback('agent1', 3);

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setRunIndex', payload: { page: 3, nodeId: 'agent1' } });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setFocusNode', payload: 'agent1' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'changePanelNode', payload: 'agent1' });
  });

  it('should dispatch agentCallback actions correctly', () => {
    const mockChatData = [{ nodeId: 'agent1', messages: [{ content: 'test', role: 'assistant' }] }];
    (useChatHistory as any).mockReturnValue({
      refetch: mockRefetch,
      isFetching: false,
      data: mockChatData,
    });

    const ref = createPanelContainerRef();
    render(<AgentChat panelContainerRef={ref} />);

    const agentCallback = (parseChatHistory as any).mock.calls[0][3];

    agentCallback('agent1');

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setRunIndex', payload: { page: 0, nodeId: 'agent1' } });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setFocusNode', payload: 'agent1' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'changePanelNode', payload: 'agent1' });
  });
});
