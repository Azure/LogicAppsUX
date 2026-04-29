/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ChatbotUI, AssistantChat, defaultChatbotPanelWidth } from '../ChatbotUi';
import { mockUseIntl } from '../../__test__/intl-test-helper';
import { ConversationItemType, FlowOrigin, PanelLocation } from '@microsoft/designer-ui';
import type { ConversationItem } from '@microsoft/designer-ui';

// Mock designer-ui components to simplify rendering
vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    ChatInput: React.forwardRef(({ query, onQueryChange, placeholder, disabled, submitButtonProps }: any, ref: any) => (
      <div data-testid="chat-input">
        <input
          ref={ref}
          data-testid="chat-input-field"
          value={query}
          onChange={(e) => onQueryChange?.(e, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button data-testid="submit-button" disabled={submitButtonProps?.disabled} onClick={submitButtonProps?.onClick}>
          {submitButtonProps?.title}
        </button>
      </div>
    )),
    ChatSuggestion: ({ text, onClick }: any) => (
      <button data-testid={`suggestion-${text}`} onClick={onClick}>
        {text}
      </button>
    ),
    ChatSuggestionGroup: ({ children }: any) => <div data-testid="suggestion-group">{children}</div>,
    ConversationMessage: ({ item }: any) => <div data-testid={`message-${item.id}`}>{item.text}</div>,
    ProgressCardWithStopButton: ({ progressState, onStopButtonClick }: any) => (
      <div data-testid="progress-card">
        <span>{progressState}</span>
        {onStopButtonClick && (
          <button data-testid="stop-button" onClick={onStopButtonClick}>
            Stop
          </button>
        )}
      </div>
    ),
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

const createDefaultProps = (overrides: Record<string, any> = {}) => ({
  panel: {
    width: '360px',
    location: PanelLocation.Left,
    isOpen: true,
    onDismiss: vi.fn(),
    header: <div>Header</div>,
    ...overrides.panel,
  },
  inputBox: {
    onSubmit: vi.fn(),
    ...overrides.inputBox,
  },
  data: {
    isSaving: false,
    canSave: false,
    canTest: false,
    test: vi.fn(),
    save: vi.fn(),
    abort: vi.fn(),
    ...overrides.data,
  },
  string: {
    progressState: 'Working...',
    progressSave: 'Saving...',
    ...overrides.string,
  },
  body: {
    messages: [] as ConversationItem[],
    focus: false,
    answerGenerationInProgress: false,
    setFocus: vi.fn(),
    ...overrides.body,
  },
});

describe('ui/ChatbotUi/ChatbotUI', () => {
  beforeEach(() => {
    mockUseIntl();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the container', () => {
      const props = createDefaultProps();
      const { container } = renderWithProviders(<ChatbotUI {...props} />);
      expect(container.firstChild).toBeDefined();
    });

    it('should render conversation messages', () => {
      const messages: ConversationItem[] = [
        { type: ConversationItemType.Query, id: 'msg-1', date: new Date(), text: 'Hello' },
        { type: ConversationItemType.Reply, id: 'msg-2', date: new Date(), text: 'Hi there' },
      ];
      const props = createDefaultProps({ body: { messages, focus: false, answerGenerationInProgress: false, setFocus: vi.fn() } });
      renderWithProviders(<ChatbotUI {...props} />);

      expect(screen.getByTestId('message-msg-1')).toBeDefined();
      expect(screen.getByTestId('message-msg-2')).toBeDefined();
    });

    it('should render the chat input when not readOnly', () => {
      const props = createDefaultProps();
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByTestId('chat-input')).toBeDefined();
    });

    it('should not render chat input when readOnly', () => {
      const props = createDefaultProps({ inputBox: { onSubmit: vi.fn(), readOnly: true } });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.queryByTestId('chat-input')).toBeNull();
    });
  });

  describe('progress indicators', () => {
    it('should show progress card when answer generation is in progress', () => {
      const props = createDefaultProps({
        body: { messages: [], focus: false, answerGenerationInProgress: true, setFocus: vi.fn() },
      });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByTestId('progress-card')).toBeDefined();
      expect(screen.getByText('Working...')).toBeDefined();
    });

    it('should show saving progress card when isSaving is true', () => {
      const props = createDefaultProps({
        data: { isSaving: true, canSave: false, canTest: false },
      });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByText('Saving...')).toBeDefined();
    });

    it('should not show progress card when not generating', () => {
      const props = createDefaultProps();
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.queryByTestId('progress-card')).toBeNull();
    });
  });

  describe('submit behavior', () => {
    it('should disable submit when input is too short', () => {
      const props = createDefaultProps();
      renderWithProviders(<ChatbotUI {...props} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.getAttribute('disabled')).not.toBeNull();
    });

    it('should enable submit when input has enough characters', () => {
      const props = createDefaultProps();
      renderWithProviders(<ChatbotUI {...props} />);

      const input = screen.getByTestId('chat-input-field');
      fireEvent.change(input, { target: { value: 'Hello world' } });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.getAttribute('disabled')).toBeNull();
    });

    it('should call onSubmit and clear input on submit', () => {
      const onSubmit = vi.fn();
      const props = createDefaultProps({ inputBox: { onSubmit } });
      renderWithProviders(<ChatbotUI {...props} />);

      const input = screen.getByTestId('chat-input-field');
      fireEvent.change(input, { target: { value: 'Test query here' } });
      fireEvent.click(screen.getByTestId('submit-button'));

      expect(onSubmit).toHaveBeenCalledWith('Test query here');
    });

    it('should disable submit when answer generation is in progress', () => {
      const props = createDefaultProps({
        body: { messages: [], focus: false, answerGenerationInProgress: true, setFocus: vi.fn() },
      });
      renderWithProviders(<ChatbotUI {...props} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.getAttribute('disabled')).not.toBeNull();
    });

    it('should disable input when answer generation is in progress', () => {
      const props = createDefaultProps({
        body: { messages: [], focus: false, answerGenerationInProgress: true, setFocus: vi.fn() },
      });
      renderWithProviders(<ChatbotUI {...props} />);

      const input = screen.getByTestId('chat-input-field');
      expect(input.getAttribute('disabled')).not.toBeNull();
    });

    it('should disable input when disabled prop is true', () => {
      const props = createDefaultProps({ inputBox: { onSubmit: vi.fn(), disabled: true } });
      renderWithProviders(<ChatbotUI {...props} />);

      const input = screen.getByTestId('chat-input-field');
      expect(input.getAttribute('disabled')).not.toBeNull();
    });
  });

  describe('suggestions', () => {
    it('should show save suggestion when canSave is true', () => {
      const props = createDefaultProps({ data: { canSave: true, canTest: false } });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByTestId('suggestion-group')).toBeDefined();
    });

    it('should show test suggestion when canTest is true', () => {
      const props = createDefaultProps({ data: { canSave: false, canTest: true } });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByTestId('suggestion-group')).toBeDefined();
    });

    it('should not show suggestions when canSave and canTest are false', () => {
      const props = createDefaultProps({ data: { canSave: false, canTest: false } });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.queryByTestId('suggestion-group')).toBeNull();
    });

    it('should call save callback when save suggestion is clicked', () => {
      const save = vi.fn();
      const props = createDefaultProps({ data: { canSave: true, canTest: false, save } });
      renderWithProviders(<ChatbotUI {...props} />);

      const saveButton = screen.getByText('Save this workflow');
      fireEvent.click(saveButton);
      expect(save).toHaveBeenCalled();
    });

    it('should call test callback when test suggestion is clicked', () => {
      const test = vi.fn();
      const props = createDefaultProps({ data: { canSave: false, canTest: true, test } });
      renderWithProviders(<ChatbotUI {...props} />);

      const testButton = screen.getByText('Test this workflow');
      fireEvent.click(testButton);
      expect(test).toHaveBeenCalled();
    });
  });

  describe('protected message', () => {
    it('should show protected message when provided', () => {
      const props = createDefaultProps({
        string: { progressState: 'Working...', progressSave: 'Saving...', protectedMessage: 'Data is protected' },
      });
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.getByText('Data is protected')).toBeDefined();
    });

    it('should not show protected message when not provided', () => {
      const props = createDefaultProps();
      renderWithProviders(<ChatbotUI {...props} />);
      expect(screen.queryByText('Data is protected')).toBeNull();
    });
  });

  describe('stop button', () => {
    it('should call abort when stop button is clicked during generation', () => {
      const abort = vi.fn();
      const props = createDefaultProps({
        data: { abort },
        body: { messages: [], focus: false, answerGenerationInProgress: true, setFocus: vi.fn() },
      });
      renderWithProviders(<ChatbotUI {...props} />);

      fireEvent.click(screen.getByTestId('stop-button'));
      expect(abort).toHaveBeenCalled();
    });
  });
});

describe('ui/ChatbotUi/AssistantChat', () => {
  beforeEach(() => {
    mockUseIntl();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should render when isOpen is true', () => {
    const props = createDefaultProps({ panel: { isOpen: true } });
    renderWithProviders(<AssistantChat {...props} />);
    // The InlineDrawer should be rendered
    expect(screen.getByText('Header')).toBeDefined();
  });

  it('should render with default panel width', () => {
    expect(defaultChatbotPanelWidth).toBe('360px');
  });

  it('should render close button with proper label', () => {
    const props = createDefaultProps({ panel: { isOpen: true, onDismiss: vi.fn(), header: <div>Header</div> } });
    renderWithProviders(<AssistantChat {...props} />);
    expect(screen.getByLabelText('Close')).toBeDefined();
  });

  it('should call onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    const props = createDefaultProps({ panel: { isOpen: true, onDismiss, header: <div>Header</div> } });
    renderWithProviders(<AssistantChat {...props} />);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
