import type { ConversationItem } from '@microsoft/designer-ui';
import { ConversationItemType, PanelLocation } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { defaultChatbotPanelWidth, ChatbotUi } from '@microsoft/logic-apps-chatbot';
import { useChatHistory } from '../../../core/queries/runs';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useAgentOpertations, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { guid, isNullOrUndefined } from '@microsoft/logic-apps-shared';

interface AgentChatProps {
  panelLocation?: PanelLocation;
  closeChatBot?: () => void; // callback when chatbot is closed
  chatbotWidth?: string;
}

const AgentChatHeader = ({
  title,
}: {
  title: string;
}) => {
  return <h1>{title}</h1>;
};

const parseChatHistory = (message: any) => {
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

export const AgentChat = ({ panelLocation = PanelLocation.Left, chatbotWidth = defaultChatbotPanelWidth }: AgentChatProps) => {
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [answerGeneration, _stopAnswerGeneration] = useState(true);
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [controller, _setController] = useState(new AbortController());
  const [selectedOperation] = useState('');
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const agentOperations = useAgentOpertations();

  const { isFetching: isActionsRepetitionFetching, data: agentActionsRepetitionData } = useChatHistory(
    !!isMonitoringView,
    agentOperations,
    runInstance?.id
  );

  console.log('charlie', agentOperations, isActionsRepetitionFetching, agentActionsRepetitionData);

  useEffect(() => {
    if (!isNullOrUndefined(agentActionsRepetitionData)) {
      const newConversations = agentActionsRepetitionData.map((message: any) => parseChatHistory(message)) as any;
      setConversation((current) => [...newConversations, ...current]);
    }
  }, [setConversation, agentActionsRepetitionData]);

  const intlText = useMemo(() => {
    return {
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
      queryTemplates: {
        createFlow1SentenceStart: intl.formatMessage({
          defaultMessage: 'Send me an email when ',
          id: '4Levd5',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        createFlow2SentenceStart: intl.formatMessage({
          defaultMessage: 'Every week on Monday ',
          id: '635Koz',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        createFlow3SentenceStart: intl.formatMessage({
          defaultMessage: 'When a new item ',
          id: 'IsbbsG',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        addActionSentenceStart: intl.formatMessage({
          defaultMessage: 'Add an action ',
          id: 'iXW+2l',
          description: 'Chatbot input start of sentence for adding an action that the user should complete. Trailing space is intentional.',
        }),
        replaceActionSentenceStartFormat: intl.formatMessage(
          {
            defaultMessage: 'Replace "{selectedOperation}" with ',
            id: '9QS9a3',
            description:
              'Chatbot input start of sentence for replacing an action that the user should complete. Trailing space is intentional.',
          },
          { selectedOperation }
        ),
        explainActionSentenceFormat: intl.formatMessage(
          {
            defaultMessage: 'Explain what the "{selectedOperation}" action does in this flow',
            id: 'VEbE93',
            description: 'Chatbot input sentence asking to explain what the selected action does in the flow.',
          },
          { selectedOperation }
        ),
        explainFlowSentence: intl.formatMessage({
          defaultMessage: 'Explain what this flow does',
          id: 'vF+gWH',
          description: 'Chatbot query sentence that asks to explain what the workflow does',
        }),
        questionSentenceStart: intl.formatMessage({
          defaultMessage: 'Tell me more about ',
          id: 'dKCp2j',
          description: 'Chatbot query start of sentence for asking for more explaination on an item that the user can should complete.',
        }),
        editFlowSentenceStart: intl.formatMessage({
          defaultMessage: 'Edit this flow to ',
          id: 'eI00kb',
          description: 'Chatbot query start of sentence for editing the workflow that the user can should complete.',
        }),
      },
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
        defaultMessage: '🖊️ Working on it...',
        id: 'O0tSvb',
        description: 'Chatbot card telling user that the AI response is being generated',
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
  }, [intl, selectedOperation]);

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

  return (
    <ChatbotUi
      panel={{
        location: panelLocation,
        width: chatbotWidth,
        isOpen: true,
        isBlocking: false,
        onDismiss: () => {},
        header: <AgentChatHeader title="Agent Chat" />,
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
        answerGenerationInProgress: !answerGeneration,
        setFocus: setFocus,
      }}
    />
  );
};
