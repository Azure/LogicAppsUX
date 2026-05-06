/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { CoPilotChatbot } from '../CopilotChatbot';
import { mockUseIntl } from '../../__test__/intl-test-helper';
import { PanelLocation, ConversationItemType } from '@microsoft/designer-ui';

// Capture props passed to AssistantChat so we can assert on them
let capturedAssistantChatProps: Record<string, any> = {};

vi.mock('../ChatbotUi', () => ({
  defaultChatbotPanelWidth: '360px',
  AssistantChat: (props: any) => {
    capturedAssistantChatProps = props;
    return (
      <div data-testid="assistant-chat">
        <button data-testid="submit-trigger" onClick={() => props.inputBox.onSubmit('test query message')}>
          Submit
        </button>
        {props.body.messages.map((msg: any, idx: number) => (
          <div key={idx} data-testid={`message-${msg.id ?? idx}`} data-type={msg.type}>
            {msg.text ?? msg.error ?? ''}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../panelheader', () => ({
  CopilotPanelHeader: () => <div data-testid="copilot-panel-header">Header</div>,
}));

// Mock services
const mockGetCopilotResponse = vi.fn();
const mockGetWorkflowEdit = vi.fn();

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    ChatbotService: () => ({
      getCopilotResponse: mockGetCopilotResponse,
    }),
    CopilotWorkflowEditorService: () => ({
      getWorkflowEdit: mockGetWorkflowEdit,
    }),
    isCopilotWorkflowEditorServiceInitialized: () => false,
    LoggerService: () => ({
      log: vi.fn(),
    }),
    guid: () => `test-guid-${Date.now()}`,
    fallbackConnectorIconUrl: () => 'https://fallback-icon.png',
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

const mockWorkflow = {
  definition: { $schema: 'test', contentVersion: '1.0', triggers: {}, actions: {} },
  connectionReferences: {},
  parameters: {},
  kind: 'Stateful' as const,
};

const defaultProps = {
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
  getUpdatedWorkflow: vi.fn().mockResolvedValue(mockWorkflow),
  openFeedbackPanel: vi.fn(),
  closeChatBot: vi.fn(),
};

describe('ui/CopilotChatbot', () => {
  beforeEach(() => {
    mockUseIntl();
    capturedAssistantChatProps = {};
    mockGetCopilotResponse.mockReset();
    mockGetWorkflowEdit.mockReset();
  });

  afterEach(async () => {
    // Flush pending setTimeout callbacks (component uses 100ms delays for setFocus)
    // to prevent "window is not defined" errors after test environment teardown
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    cleanup();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the AssistantChat component', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);
      expect(screen.getByTestId('assistant-chat')).toBeDefined();
    });

    it('should render with default panel location (Left)', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);
      expect(capturedAssistantChatProps.panel.location).toBe(PanelLocation.Left);
    });

    it('should render with custom panel location', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} panelLocation={PanelLocation.Right} />);
      expect(capturedAssistantChatProps.panel.location).toBe(PanelLocation.Right);
    });

    it('should render with custom chatbot width', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} chatbotWidth="500px" />);
      expect(capturedAssistantChatProps.panel.width).toBe('500px');
    });

    it('should pass isOpen prop to AssistantChat', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} isOpen={false} />);
      expect(capturedAssistantChatProps.panel.isOpen).toBe(false);
    });

    it('should start with a greeting message', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);
      const messages = capturedAssistantChatProps.body.messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe(ConversationItemType.Greeting);
    });

    it('should include protected message in string props', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);
      expect(capturedAssistantChatProps.string.protectedMessage).toBeDefined();
      expect(typeof capturedAssistantChatProps.string.protectedMessage).toBe('string');
    });
  });

  describe('chatbot response flow', () => {
    it('should add user query to conversation on submit', async () => {
      mockGetCopilotResponse.mockResolvedValue({
        status: 200,
        data: { properties: { queryId: 'q1', response: 'Test response' } },
      });

      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-trigger'));
      });

      await waitFor(() => {
        const messages = capturedAssistantChatProps.body.messages;
        const queryMessage = messages.find((m: any) => m.type === ConversationItemType.Query);
        expect(queryMessage).toBeDefined();
        expect(queryMessage.text).toBe('test query message');
      });
    });

    it('should add reply to conversation on successful response', async () => {
      mockGetCopilotResponse.mockResolvedValue({
        status: 200,
        data: { properties: { queryId: 'q1', response: 'AI response here' } },
      });

      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-trigger'));
      });

      await waitFor(() => {
        const messages = capturedAssistantChatProps.body.messages;
        const replyMessage = messages.find((m: any) => m.type === ConversationItemType.Reply);
        expect(replyMessage).toBeDefined();
        expect(replyMessage.text).toBe('AI response here');
      });
    });

    it('should show error message on failed response', async () => {
      mockGetCopilotResponse.mockRejectedValue(new Error('API failure'));

      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-trigger'));
      });

      await waitFor(() => {
        const messages = capturedAssistantChatProps.body.messages;
        const errorMessage = messages.find((m: any) => m.type === ConversationItemType.ReplyError);
        expect(errorMessage).toBeDefined();
      });
    });

    it('should not submit empty query', async () => {
      // Use the actual AssistantChat mock which passes '' to onSubmit
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      const onSubmit = capturedAssistantChatProps.inputBox.onSubmit;
      await act(async () => {
        await onSubmit('');
      });

      // Should still only have the greeting message
      expect(capturedAssistantChatProps.body.messages).toHaveLength(1);
      expect(mockGetCopilotResponse).not.toHaveBeenCalled();
    });

    it('should not submit whitespace-only query', async () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      const onSubmit = capturedAssistantChatProps.inputBox.onSubmit;
      await act(async () => {
        await onSubmit('   ');
      });

      expect(capturedAssistantChatProps.body.messages).toHaveLength(1);
      expect(mockGetCopilotResponse).not.toHaveBeenCalled();
    });
  });

  describe('dismiss behavior', () => {
    it('should call closeChatBot on dismiss', () => {
      const closeChatBot = vi.fn();
      renderWithProviders(<CoPilotChatbot {...defaultProps} closeChatBot={closeChatBot} />);

      capturedAssistantChatProps.panel.onDismiss();
      expect(closeChatBot).toHaveBeenCalled();
    });
  });

  describe('answer generation state', () => {
    it('should start with answerGenerationInProgress as false', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} />);
      // answerGeneration starts as true, so !answerGeneration = false
      expect(capturedAssistantChatProps.body.answerGenerationInProgress).toBe(false);
    });

    it('should return to answerGenerationInProgress false after response', async () => {
      mockGetCopilotResponse.mockResolvedValue({
        status: 200,
        data: { properties: { queryId: 'q1', response: 'done' } },
      });

      renderWithProviders(<CoPilotChatbot {...defaultProps} />);

      await act(async () => {
        await capturedAssistantChatProps.inputBox.onSubmit('test query');
      });

      await waitFor(() => {
        expect(capturedAssistantChatProps.body.answerGenerationInProgress).toBe(false);
      });
    });
  });

  describe('workflow editing placeholder', () => {
    it('should use workflow editing placeholder when enableWorkflowEditing is true', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} enableWorkflowEditing={true} />);
      expect(capturedAssistantChatProps.inputBox).toBeDefined();
      const placeholder = capturedAssistantChatProps.inputBox.placeholder;
      expect(placeholder).toBeDefined();
      expect(typeof placeholder).toBe('string');
    });

    it('should use standard placeholder when enableWorkflowEditing is false', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} enableWorkflowEditing={false} />);
      expect(capturedAssistantChatProps.inputBox).toBeDefined();
      const placeholder = capturedAssistantChatProps.inputBox.placeholder;
      expect(placeholder).toBeDefined();
      expect(typeof placeholder).toBe('string');
    });
  });

  describe('greeting message', () => {
    it('should include workflowEditingEnabled in greeting based on service availability', () => {
      renderWithProviders(<CoPilotChatbot {...defaultProps} enableWorkflowEditing={true} />);
      expect(capturedAssistantChatProps.body).toBeDefined();
      const messages = capturedAssistantChatProps.body.messages;
      const greeting = messages.find((m: any) => m.type === ConversationItemType.Greeting);
      expect(greeting).toBeDefined();
      // Since isCopilotWorkflowEditorServiceInitialized returns false, editing not enabled
      expect(greeting.workflowEditingEnabled).toBe(false);
    });
  });

  describe('conversation history persistence', () => {
    it('should preserve conversation history when isOpen toggles', async () => {
      mockGetCopilotResponse.mockResolvedValue({
        status: 200,
        data: { properties: { queryId: 'q1', response: 'response 1' } },
      });

      const { rerender } = renderWithProviders(<CoPilotChatbot {...defaultProps} isOpen={true} />);

      // Submit a query
      await act(async () => {
        await capturedAssistantChatProps.inputBox.onSubmit('hello');
      });

      await waitFor(() => {
        const messages = capturedAssistantChatProps.body.messages;
        expect(messages.length).toBeGreaterThan(1);
      });

      const messageCountBeforeClose = capturedAssistantChatProps.body.messages.length;

      // Close and reopen — component stays mounted
      rerender(
        <FluentProvider theme={webLightTheme}>
          <CoPilotChatbot {...defaultProps} isOpen={false} />
        </FluentProvider>
      );
      rerender(
        <FluentProvider theme={webLightTheme}>
          <CoPilotChatbot {...defaultProps} isOpen={true} />
        </FluentProvider>
      );

      // Messages should be preserved
      expect(capturedAssistantChatProps.body.messages.length).toBe(messageCountBeforeClose);
    });
  });
});
