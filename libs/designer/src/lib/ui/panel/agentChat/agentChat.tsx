import type { ConversationItem } from '@microsoft/designer-ui';
import { ConversationItemType, PanelLocation, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { defaultChatbotPanelWidth, ChatbotContent } from '@microsoft/logic-apps-chatbot';
import { useChatHistory } from '../../../core/queries/runs';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useAgentOperations, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { guid, isNullOrUndefined, labelCase } from '@microsoft/logic-apps-shared';
import { Button, Drawer, mergeClasses } from '@fluentui/react-components';
import { ChatFilled, ChevronDoubleRightFilled } from '@fluentui/react-icons';

interface AgentChatProps {
  panelLocation?: PanelLocation;
  closeChatBot?: () => void; // callback when chatbot is closed
  chatbotWidth?: string;
  panelContainerRef: React.MutableRefObject<HTMLElement | null>;
}

const AgentChatHeader = ({
  title,
  toggleCollapse,
}: {
  title: string;
  toggleCollapse: () => void;
}) => {
  return (
    <div style={{ display: 'flex', position: 'relative', justifyContent: 'center', padding: '10px' }}>
      <h3>{title}</h3>
      <Button
        id="msla-agent-chat-header-collapse"
        appearance="subtle"
        icon={<ChevronDoubleRightFilled />}
        aria-label={'buttonText'}
        onClick={toggleCollapse}
        data-automation-id="msla-agent-chat-header-collapse"
        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
};

const parseChatHistory = (chatHistory: Record<string, { messages: any[] }>): ConversationItem[] =>
  Object.entries(chatHistory).reduce<ConversationItem[]>((conversations, [key, { messages }]) => {
    const parsedMessages: any[] = messages.map((message) => parseMessage(message));
    const agentName = labelCase(key ?? '');
    conversations.push(...parsedMessages, {
      id: guid(),
      text: agentName,
      type: ConversationItemType.AgentHeader,
      date: new Date(), // Using current time for header; modify if needed
    });
    return conversations;
  }, []);

const parseMessage = (message: any) => {
  let type: ConversationItemType = ConversationItemType.Reply;
  let text = '';
  switch (message.messageEntryType) {
    case 'Content': {
      type = ConversationItemType.Reply;
      text = message.messageEntryPayload?.content ?? '';
      break;
    }
    case 'ToolResult': {
      type = ConversationItemType.Tool;
      text = message.toolResultsPayload?.toolResult?.toolName ? `${message.toolResultsPayload?.toolResult?.toolName} - got executed` : '';
      break;
    }
    default:
      type = ConversationItemType.Reply;
      break;
  }

  return {
    id: guid(),
    text,
    type,
    timestamp: message.timestamp,
  };
};

export const AgentChat = ({
  panelLocation = PanelLocation.Left,
  chatbotWidth = defaultChatbotPanelWidth,
  panelContainerRef,
}: AgentChatProps) => {
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [controller, _setController] = useState(new AbortController());
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const agentOperations = useAgentOperations();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelContainerElement = panelContainerRef.current as HTMLElement;

  const { isFetching: isChatHistoryFetching, data: chatHistoryData } = useChatHistory(!!isMonitoringView, agentOperations, runInstance?.id);

  const drawerWidth = isCollapsed ? PanelSize.Auto : chatbotWidth;

  useEffect(() => {
    if (!isNullOrUndefined(chatHistoryData)) {
      const newConversations = parseChatHistory(chatHistoryData);
      setConversation((current) => [...newConversations, ...current]);
    }
  }, [setConversation, chatHistoryData]);

  const intlText = useMemo(() => {
    return {
      agentChatHeader: intl.formatMessage({
        defaultMessage: 'Agent chat',
        id: 'PVT2SW',
        description: 'Agent chat header text',
      }),
      chatInputPlaceholder: intl.formatMessage({
        defaultMessage: 'Ask me anything... (read-only mode for now)',
        id: 'pvfstY',
        description: 'Agent chat input placeholder text',
      }),
      protectedMessage: intl.formatMessage({
        defaultMessage: 'Your personal and company data are protected in this chat',
        id: 'Yrw/Qt',
        description: 'Letting user know that their data is protected in the chatbot',
      }),
      submitButtonTitle: intl.formatMessage({
        defaultMessage: 'Submit',
        id: 'Oep6va',
        description: 'Submit button',
      }),
      actionsButtonTitle: intl.formatMessage({
        defaultMessage: 'Actions',
        id: 'Vqs8hE',
        description: 'Actions button',
      }),
      chatSuggestion: {
        saveButton: intl.formatMessage({
          defaultMessage: 'Save this workflow',
          id: 'OYWZE4',
          description: 'Chatbot suggestion button to save workflow',
        }),
        testButton: intl.formatMessage({
          defaultMessage: 'Test this workflow',
          id: 'tTIsTX',
          description: 'Chatbot suggestion button to test this workflow',
        }),
      },
      assistantErrorMessage: intl.formatMessage({
        defaultMessage: 'Sorry, something went wrong. Please try again.',
        id: 'fvGvnA',
        description: 'Chatbot error message',
      }),
      progressCardText: intl.formatMessage({
        defaultMessage: 'Fetching chat history...',
        id: '7col/w',
        description: 'Fetching chat history progress card text',
      }),
      progressCardSaveText: intl.formatMessage({
        defaultMessage: '💾 Saving this flow...',
        id: '4iyEAY',
        description: 'Chatbot card telling user that the workflow is being saved',
      }),
      progressCardStopButtonLabel: intl.formatMessage({
        defaultMessage: 'Stop generating',
        id: 'wP0/uB',
        description: 'Label for the button on the progress card that stops AI response generation',
      }),
      cancelGenerationText: intl.formatMessage({
        defaultMessage: 'Copilot chat canceled',
        id: 'JKZpcd',
        description: 'Chatbot card telling user that the AI response is being canceled',
      }),
    };
  }, [intl]);

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

  return (
    <Drawer
      aria-label={'panelLabel'}
      className="msla-panel-container"
      modalType="non-modal"
      mountNode={{
        className: 'msla-panel-host-container',
        element: panelContainerElement,
      }}
      open={true}
      position={'end'}
      style={{ position: 'relative', maxWidth: '100%', width: drawerWidth, height: '100%' }}
    >
      {isCollapsed ? (
        <Button
          appearance="subtle"
          aria-label={'panelCollapseTitle'}
          className={mergeClasses('collapse-toggle', 'right', 'empty')}
          icon={<ChatFilled />}
          onClick={() => setIsCollapsed(false)}
          data-automation-id="msla-panel-header-collapse-nav"
        />
      ) : null}
      {isCollapsed ? null : (
        <ChatbotContent
          panel={{
            location: panelLocation,
            width: chatbotWidth,
            isOpen: true,
            isBlocking: false,
            onDismiss: () => {},
            header: <AgentChatHeader title={intlText.agentChatHeader} toggleCollapse={() => setIsCollapsed(true)} />,
          }}
          inputBox={{
            value: inputQuery,
            onChange: setInputQuery,
            placeholder: intlText.chatInputPlaceholder,
            onSubmit: () => {},
            disabled: true, // read-only mode
          }}
          data={{
            isSaving: isSaving,
            canSave: canSaveCurrentFlow,
            canTest: canTestCurrentFlow,
            test: () => testCurrentFlow(false),
            save: () => saveCurrentFlow(false),
            abort: abortFetching,
          }}
          string={{
            test: intlText.chatSuggestion.testButton,
            save: intlText.chatSuggestion.saveButton,
            submit: intlText.submitButtonTitle,
            progressState: intlText.progressCardText,
            progressStop: intlText.progressCardStopButtonLabel,
            progressSave: intlText.progressCardSaveText,
            protectedMessage: intlText.protectedMessage,
          }}
          body={{
            messages: conversation,
            focus: focus,
            answerGenerationInProgress: isChatHistoryFetching,
            setFocus: setFocus,
          }}
        />
      )}
    </Drawer>
  );
};
