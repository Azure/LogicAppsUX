import constants from '../common/constants';
import type { RequestData } from '../common/models/Query';
import { isSuccessResponse } from '../core/util';
import { CopilotPanelHeader } from './panelheader';
import { getId } from '@fluentui/react';
import { LogEntryLevel, LoggerService, ChatbotService, guid, type Workflow } from '@microsoft/logic-apps-shared';
import type { ConversationItem, ChatEntryReaction, AdditionalParametersItem } from '@microsoft/designer-ui';
import { PanelLocation, ConversationItemType, FlowOrigin } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { AssistantChat, defaultChatbotPanelWidth } from './ChatbotUi';

interface CoPilotChatbotProps {
  panelLocation?: PanelLocation;
  getAuthToken: () => Promise<string>;
  getUpdatedWorkflow: () => Promise<Workflow>;
  openFeedbackPanel: () => void; // callback when feedback panel is opened
  openAzureCopilotPanel?: (prompt?: string) => void; // callback to open Azure Copilot Panel
  closeChatBot?: () => void; // callback when chatbot is closed
  chatbotWidth?: string;
}

export const CoPilotChatbot = ({
  panelLocation = PanelLocation.Left,
  getAuthToken,
  getUpdatedWorkflow,
  openFeedbackPanel,
  openAzureCopilotPanel,
  closeChatBot,
  chatbotWidth = defaultChatbotPanelWidth,
}: CoPilotChatbotProps) => {
  const chatSessionId = useRef(guid());
  const intl = useIntl();
  const chatbotService = ChatbotService();
  const [inputQuery, setInputQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [answerGeneration, stopAnswerGeneration] = useState(true);
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([
    {
      type: ConversationItemType.Greeting,
      origin: FlowOrigin.Default,
      id: getId(),
      date: new Date(),
      reaction: undefined,
    },
  ]);
  const [controller, setController] = useState(new AbortController());
  const signal = controller.signal;
  const [selectedOperation] = useState('');

  const intlText = useMemo(() => {
    return {
      chatInputPlaceholder: intl.formatMessage({
        defaultMessage: 'Ask a question about this workflow or about Azure Logic Apps as a whole ...',
        id: 'kXn5e0',
        description: 'Chabot input placeholder text',
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

  const logFeedbackVote = useCallback((reaction: ChatEntryReaction, isRemovedVote?: boolean) => {
    if (isRemovedVote) {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'chatbot: feedback',
        message: `Feedback Reaction: ${reaction} removed`,
      });
    } else {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'chatbot: feedback',
        message: `Feedback Reaction: ${reaction}`,
      });
    }
  }, []);

  const onSubmitInputQuery = useCallback(
    async (input: string) => {
      const query = input.trim();
      if (!query) {
        return;
      }
      const date = new Date();
      setConversation((current) => [
        {
          type: ConversationItemType.Query,
          id: guid(),
          date,
          text: input.trim(),
        },
        ...current,
      ]);

      const requestPayload: RequestData = {
        properties: {
          query,
          workflow: await getUpdatedWorkflow(),
        },
      };
      stopAnswerGeneration(false);
      try {
        const response = await chatbotService.getCopilotResponse(query, await getUpdatedWorkflow(), signal, await getAuthToken());
        if (!isSuccessResponse(response.status)) {
          throw new Error(response.statusText);
        }
        const queryResponse: string = response.data.properties.response;
        // commenting out usage of additionalParameters until Logic Apps backend is updated to include this response property
        const additionalParameters: AdditionalParametersItem = response.data.properties.additionalParameters;
        setConversation((current) => [
          {
            type: ConversationItemType.Reply,
            id: response.data.properties.queryId,
            date: new Date(),
            text: queryResponse,
            isMarkdownText: false,
            correlationId: chatSessionId.current,
            __rawRequest: requestPayload,
            __rawResponse: response,
            reaction: undefined,
            additionalDocURL: additionalParameters?.url ?? undefined,
            azureButtonCallback:
              /*additionalParameters?.includes(constants.WorkflowResponseAdditionalParameters.SendToAzure)*/ queryResponse ===
                constants.DefaultAzureResponseCallback && openAzureCopilotPanel
                ? () => openAzureCopilotPanel(query)
                : undefined,
            openFeedback: openFeedbackPanel,
            logFeedbackVote,
          },
          ...current,
        ]);
        stopAnswerGeneration(true);
        setTimeout(() => {
          setFocus(true);
        }, 100);
      } catch (error: any) {
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'workflowQuery',
          message: error.message,
          error: error instanceof Error ? error : undefined,
        });
        const responseId = guid();
        if (error?.code === constants.ErrorCodes.Cancelled) {
          stopAnswerGeneration(true);
          setController(new AbortController());
          setConversation((current) => [
            {
              type: ConversationItemType.Reply,
              id: responseId,
              date: new Date(),
              text: intlText.cancelGenerationText,
              isMarkdownText: false,
              chatSessionId: chatSessionId.current,
              correlationId: guid(),
              __rawRequest: requestPayload,
              __rawResponse: error,
              reaction: undefined,
              hideFooter: true,
            },
            ...current,
          ]);
        } else {
          setConversation((current) => [
            {
              type: ConversationItemType.ReplyError,
              id: responseId,
              date: new Date(),
              error: intlText.assistantErrorMessage,
              chatSessionId: chatSessionId.current,
              __rawRequest: requestPayload,
              __rawResponse: error,
              reaction: undefined,
              openFeedback: openFeedbackPanel,
              logFeedbackVote,
            },
            ...current,
          ]);
          stopAnswerGeneration(true);
        }
        setTimeout(() => {
          setFocus(true);
        }, 100);
      }
    },
    [
      getUpdatedWorkflow,
      chatbotService,
      signal,
      getAuthToken,
      openAzureCopilotPanel,
      openFeedbackPanel,
      logFeedbackVote,
      intlText.cancelGenerationText,
      intlText.assistantErrorMessage,
    ]
  );

  const dismissCopilot = useCallback(() => {
    setCollapsed(true);
    closeChatBot?.();
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'chatbot',
      message: 'workflow assistant closed',
    });
  }, [closeChatBot]);

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

  return (
    <AssistantChat
      panel={{
        location: panelLocation,
        width: chatbotWidth,
        isOpen: !collapsed,
        onDismiss: dismissCopilot,
        header: <CopilotPanelHeader closeCopilot={dismissCopilot} />,
      }}
      inputBox={{
        value: inputQuery,
        onChange: setInputQuery,
        placeholder: intlText.chatInputPlaceholder,
        onSubmit: onSubmitInputQuery,
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
