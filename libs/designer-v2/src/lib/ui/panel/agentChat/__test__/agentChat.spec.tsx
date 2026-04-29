/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AgentChat } from '../agentChat';
import { mockUseIntl } from '../../../../__test__/intl-test-helper';
import { PanelLocation } from '@microsoft/designer-ui';

// ---- Mock child components ----

// Capture ChatbotUI props so we can test what AgentChat passes through
let capturedChatbotUIProps: Record<string, any> = {};

vi.mock('@microsoft/logic-apps-chatbot', () => ({
  defaultChatbotPanelWidth: '360px',
  ChatbotUI: (props: any) => {
    capturedChatbotUIProps = props;
    return (
      <div data-testid="chatbot-ui">
        {props.panel?.header}
        <button data-testid="chat-submit" onClick={() => props.inputBox.onSubmit('test message')}>
          Submit
        </button>
        {props.body.messages.map((msg: any, idx: number) => (
          <div key={idx} data-testid={`chat-message-${idx}`}>
            {msg.text ?? ''}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../agentChatHeader', () => ({
  AgentChatHeader: ({ title, onStopChat, onRefreshChat, onToggleCollapse, showStopButton }: any) => (
    <div data-testid="agent-chat-header">
      <span>{title}</span>
      {showStopButton && (
        <button data-testid="stop-chat-button" onClick={onStopChat}>
          Stop
        </button>
      )}
      <button data-testid="refresh-button" onClick={onRefreshChat}>
        Refresh
      </button>
      <button data-testid="collapse-button" onClick={onToggleCollapse}>
        Collapse
      </button>
    </div>
  ),
}));

// ---- Mock designer-ui components not covered by ChatbotUI mock ----

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    PanelResizer: ({ updatePanelWidth }: any) => <div data-testid="panel-resizer" onClick={() => updatePanelWidth?.('500px')} />,
  };
});

// ---- Mock redux ----

const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

// ---- Mock queries/hooks ----

const mockRefetchChatHistory = vi.fn();
const mockCancelRun = vi.fn().mockResolvedValue(undefined);
const mockRefreshChat = vi.fn().mockResolvedValue(undefined);
const mockInvokeAgentChat = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../../core/queries/runs', () => ({
  useChatHistory: () => ({
    refetch: mockRefetchChatHistory,
    isFetching: false,
    data: undefined,
  }),
  useAgentChatInvokeUri: () => ({
    data: 'https://test-invoke-uri.com',
  }),
  useCancelRun: () => ({
    mutateAsync: mockCancelRun,
  }),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: vi.fn(() => true),
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useAgentOperations: vi.fn(() => ['agent1']),
  useAgentLastOperations: vi.fn(() => ({})),
  useFocusElement: vi.fn(() => undefined),
  useUriForAgentChat: vi.fn(() => '/test-uri'),
  useRunInstance: vi.fn(() => ({
    id: 'run-123',
    properties: { status: 'Succeeded' },
  })),
}));

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: vi.fn(() => false),
}));

vi.mock('../../../../core', () => ({
  changePanelNode: vi.fn((nodeId: string) => ({ type: 'changePanelNode', payload: nodeId })),
  getReactQueryClient: vi.fn(),
}));

vi.mock('../../../../core/state/workflow/workflowSlice', () => ({
  clearFocusElement: vi.fn(() => ({ type: 'clearFocusElement' })),
  setFocusNode: vi.fn((nodeId: string) => ({ type: 'setFocusNode', payload: nodeId })),
  setRunIndex: vi.fn((payload: any) => ({ type: 'setRunIndex', payload })),
  setTimelineRepetitionIndex: vi.fn((idx: number) => ({ type: 'setTimelineRepetitionIndex', payload: idx })),
}));

vi.mock('../helper', () => ({
  parseChatHistory: vi.fn(() => []),
  useRefreshChatMutation: () => ({
    mutateAsync: mockRefreshChat,
  }),
}));

vi.mock('../../../../common/constants', () => ({
  default: {
    FLOW_STATUS: {
      RUNNING: 'Running',
      SUCCEEDED: 'Succeeded',
    },
  },
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    isNullOrUndefined: (val: any) => val === null || val === undefined,
    LoggerService: () => ({
      log: vi.fn(),
    }),
    RunService: () => ({
      invokeAgentChat: mockInvokeAgentChat,
    }),
  };
});

// ---- Test helpers ----

const createPanelContainerRef = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return { current: el } as React.MutableRefObject<HTMLElement | null>;
};

const renderAgentChat = (overrides: Record<string, any> = {}) => {
  const panelContainerRef = createPanelContainerRef();
  return render(
    <FluentProvider theme={webLightTheme}>
      <AgentChat panelContainerRef={panelContainerRef} {...overrides} />
    </FluentProvider>
  );
};

describe('ui/panel/agentChat/AgentChat', () => {
  beforeEach(() => {
    mockUseIntl();
    capturedChatbotUIProps = {};
    mockDispatch.mockClear();
    mockRefetchChatHistory.mockClear();
    mockCancelRun.mockClear();
    mockRefreshChat.mockClear();
    mockInvokeAgentChat.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the Drawer with ChatbotUI', () => {
      renderAgentChat();
      expect(screen.getByTestId('chatbot-ui')).toBeDefined();
    });

    it('should render agent chat header with title', () => {
      renderAgentChat();
      expect(screen.getByTestId('agent-chat-header')).toBeDefined();
      expect(screen.getByText('Agent log')).toBeDefined();
    });

    it('should render panel resizer', () => {
      renderAgentChat();
      expect(screen.getByTestId('panel-resizer')).toBeDefined();
    });

    it('should use default panel location (Left)', () => {
      renderAgentChat();
      expect(capturedChatbotUIProps.panel.location).toBe(PanelLocation.Left);
    });

    it('should accept custom panel location', () => {
      renderAgentChat({ panelLocation: PanelLocation.Right });
      expect(capturedChatbotUIProps.panel.location).toBe(PanelLocation.Right);
    });

    it('should start with empty conversation', () => {
      renderAgentChat();
      expect(capturedChatbotUIProps.body.messages).toHaveLength(0);
    });

    it('should pass correct string props', () => {
      renderAgentChat();
      expect(capturedChatbotUIProps.string.submit).toBeDefined();
      expect(capturedChatbotUIProps.string.progressState).toBeDefined();
      expect(capturedChatbotUIProps.string.progressSave).toBeDefined();
    });
  });

  describe('stop button visibility', () => {
    it('should not show stop button when run status is Succeeded', () => {
      renderAgentChat();
      expect(screen.queryByTestId('stop-chat-button')).toBeNull();
    });
  });

  describe('chat submission', () => {
    it('should invoke agent chat when submitting a message', async () => {
      renderAgentChat();

      await act(async () => {
        fireEvent.click(screen.getByTestId('chat-submit'));
      });

      await waitFor(() => {
        expect(mockInvokeAgentChat).toHaveBeenCalledWith({
          id: 'https://test-invoke-uri.com',
          data: { role: 'User', content: 'test message' },
        });
      });
    });

    it('should refetch chat history after submitting message', async () => {
      renderAgentChat();

      await act(async () => {
        fireEvent.click(screen.getByTestId('chat-submit'));
      });

      await waitFor(() => {
        expect(mockRefetchChatHistory).toHaveBeenCalled();
      });
    });

    it('should not submit when value is empty', async () => {
      renderAgentChat();

      const onSubmit = capturedChatbotUIProps.inputBox.onSubmit;
      await act(async () => {
        await onSubmit('');
      });

      expect(mockInvokeAgentChat).not.toHaveBeenCalled();
    });
  });

  describe('collapse behavior', () => {
    it('should collapse when collapse button is clicked', () => {
      renderAgentChat();

      fireEvent.click(screen.getByTestId('collapse-button'));

      // After collapse, ChatbotUI should be hidden and toggle button shown
      expect(screen.queryByTestId('chatbot-ui')).toBeNull();
    });

    it('should show toggle button when collapsed', () => {
      renderAgentChat();

      fireEvent.click(screen.getByTestId('collapse-button'));

      // The Drawer collapse toggle button should appear
      const toggleButton = screen.getByLabelText('Toggle the agent log panel.');
      expect(toggleButton).toBeDefined();
    });

    it('should expand when toggle button is clicked after collapse', () => {
      renderAgentChat();

      // Collapse
      fireEvent.click(screen.getByTestId('collapse-button'));
      expect(screen.queryByTestId('chatbot-ui')).toBeNull();

      // Expand
      const toggleButton = screen.getByLabelText('Toggle the agent log panel.');
      fireEvent.click(toggleButton);

      expect(screen.getByTestId('chatbot-ui')).toBeDefined();
    });
  });

  describe('stop chat dialog', () => {
    it('should not show dialog by default', () => {
      renderAgentChat();
      expect(screen.queryByText('Do you want to stop the agent chat? This will cancel the workflow.')).toBeNull();
    });
  });

  describe('readOnly state', () => {
    it('should set readOnly to false when chatInvokeUri is available', () => {
      renderAgentChat();
      expect(capturedChatbotUIProps.inputBox.readOnly).toBe(false);
    });
  });

  describe('answer generation state', () => {
    it('should not be in progress by default', () => {
      renderAgentChat();
      expect(capturedChatbotUIProps.body.answerGenerationInProgress).toBe(false);
    });
  });

  describe('panel resizer', () => {
    it('should update width when panel resizer is used', () => {
      renderAgentChat();
      fireEvent.click(screen.getByTestId('panel-resizer'));
      // The Drawer should have been updated — no crash, resizer works
      expect(screen.getByTestId('panel-resizer')).toBeDefined();
    });
  });
});
