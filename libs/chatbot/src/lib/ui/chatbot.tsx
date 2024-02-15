import constants from '../common/constants';
import type { RequestData } from '../common/models/Query';
import { isSuccessResponse } from '../core/util';
import { CopilotPanelHeader } from './panelheader';
import type { ITextField } from '@fluentui/react';
import { useTheme, Panel, PanelType, css, getId } from '@fluentui/react';
import { ShieldCheckmarkRegular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService, ChatbotService } from '@microsoft/logic-apps-shared';
import type { ConversationItem, ChatEntryReaction, AdditionalParametersItem } from '@microsoft/designer-ui';
import {
  PanelLocation,
  ChatInput,
  ConversationItemType,
  ConversationMessage,
  FlowOrigin,
  ProgressCardWithStopButton,
  ChatSuggestionGroup,
  ChatSuggestion,
} from '@microsoft/designer-ui';
import type { Workflow } from '@microsoft/logic-apps-designer';
import { guid } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export const chatbotPanelWidth = '360px';

interface ChatbotProps {
  panelLocation?: PanelLocation;
  getAuthToken: () => Promise<string>;
  getUpdatedWorkflow: () => Promise<Workflow>;
  openFeedbackPanel: () => void; // callback when feedback panel is opened
  openAzureCopilotPanel?: (prompt?: string) => void; // callback to open Azure Copilot Panel
  closeChatBot?: () => void; // callback when chatbot is closed
}

const QUERY_MIN_LENGTH = 5;
const QUERY_MAX_LENGTH = 2000;

export const Chatbot = ({
  panelLocation = PanelLocation.Left,
  getAuthToken,
  getUpdatedWorkflow,
  openFeedbackPanel,
  openAzureCopilotPanel,
  closeChatBot,
}: ChatbotProps) => {
  const { isInverted } = useTheme();
  const textInputRef = useRef<ITextField>(null);
  const chatSessionId = useRef(guid());
  const intl = useIntl();
  const chatbotService = ChatbotService();
  const [inputQuery, setInputQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [answerGeneration, stopAnswerGeneration] = useState(true);
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
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
        description: 'Chabot input placeholder text',
      }),
      protectedMessage: intl.formatMessage({
        defaultMessage: 'Your personal and company data are protected in this chat',
        description: 'Letting user know that their data is protected in the chatbot',
      }),
      submitButtonTitle: intl.formatMessage({
        defaultMessage: 'Submit',
        description: 'Submit button',
      }),
      actionsButtonTitle: intl.formatMessage({
        defaultMessage: 'Actions',
        description: 'Actions button',
      }),
      queryTemplates: {
        createFlow1SentenceStart: intl.formatMessage({
          defaultMessage: 'Send me an email when ',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        createFlow2SentenceStart: intl.formatMessage({
          defaultMessage: 'Every week on Monday ',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        createFlow3SentenceStart: intl.formatMessage({
          defaultMessage: 'When a new item ',
          description: 'Chatbot input start of sentence for creating a flow that the user should complete. Trailing space is intentional.',
        }),
        addActionSentenceStart: intl.formatMessage({
          defaultMessage: 'Add an action ',
          description: 'Chatbot input start of sentence for adding an action that the user should complete. Trailing space is intentional.',
        }),
        replaceActionSentenceStartFormat: intl.formatMessage(
          {
            defaultMessage: `Replace "{selectedOperation}" with `,
            description:
              'Chatbot input start of sentence for replacing an action that the user should complete. Trailing space is intentional.',
          },
          { selectedOperation }
        ),
        explainActionSentenceFormat: intl.formatMessage(
          {
            defaultMessage: `Explain what the "{selectedOperation}" action does in this flow`,
            description: 'Chatbot input sentence asking to explain what the selected action does in the flow.',
          },
          { selectedOperation }
        ),
        explainFlowSentence: intl.formatMessage({
          defaultMessage: 'Explain what this flow does',
          description: 'Chatbot query sentence that asks to explain what the workflow does',
        }),
        questionSentenceStart: intl.formatMessage({
          defaultMessage: 'Tell me more about ',
          description: 'Chatbot query start of sentence for asking for more explaination on an item that the user can should complete.',
        }),
        editFlowSentenceStart: intl.formatMessage({
          defaultMessage: 'Edit this flow to ',
          description: 'Chatbot query start of sentence for editing the workflow that the user can should complete.',
        }),
      },
      chatSuggestion: {
        saveButton: intl.formatMessage({
          defaultMessage: 'Save this workflow',
          description: 'Chatbot suggestion button to save workflow',
        }),
        testButton: intl.formatMessage({
          defaultMessage: 'Test this workflow',
          description: 'Chatbot suggestion button to test this workflow',
        }),
      },
      assistantErrorMessage: intl.formatMessage({
        defaultMessage: 'Sorry, something went wrong. Please try again.',
        description: 'Chatbot error message',
      }),
      progressCardText: intl.formatMessage({
        defaultMessage: '🖊️ Working on it...',
        description: 'Chatbot card telling user that the AI response is being generated',
      }),
      progressCardSaveText: intl.formatMessage({
        defaultMessage: '💾 Saving this flow...',
        description: 'Chatbot card telling user that the workflow is being saved',
      }),
      progressCardStopButtonLabel: intl.formatMessage({
        defaultMessage: 'Stop generating',
        description: 'Label for the button on the progress card that stops AI response generation',
      }),
      cancelGenerationText: intl.formatMessage({
        defaultMessage: 'Copilot chat canceled',
        description: 'Chatbot card telling user that the AI response is being canceled',
      }),
    };
  }, [intl, selectedOperation]);

  const inputIconButtonStyles = {
    enabled: {
      root: {
        backgroundColor: 'transparent',
        color: isInverted ? 'rgb(200, 200, 200)' : 'rgb(51, 51, 51)',
      },
    },
    disabled: {
      root: {
        backgroundColor: 'transparent',
        color: isInverted ? 'rgb(79, 79, 79)' : 'rgb(200, 200, 200)',
      },
    },
  };

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
      if (!query) return;
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
          textInputRef.current?.focus();
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
          textInputRef.current?.focus();
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

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

  return (
    <Panel
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      customWidth={chatbotPanelWidth}
      hasCloseButton={false}
      isBlocking={false}
      layerProps={{ styles: { root: { zIndex: 0, display: 'flex' } } }}
    >
      <div className={'msla-chatbot-container'}>
        <CopilotPanelHeader
          closeCopilot={() => {
            setCollapsed(true);
            closeChatBot?.();
            LoggerService().log({
              level: LogEntryLevel.Warning,
              area: 'chatbot',
              message: 'workflow assistant closed',
            });
          }}
        />

        <div className={css('msla-chatbot-content')}>
          {!answerGeneration && (
            <ProgressCardWithStopButton
              onStopButtonClick={() => abortFetching()}
              progressState={intlText.progressCardText}
              stopButtonLabel={intlText.progressCardStopButtonLabel}
            />
          )}
          {isSaving && <ProgressCardWithStopButton progressState={intlText.progressCardSaveText} />}
          {conversation.map((item) => (
            <ConversationMessage key={item.id} item={item} />
          ))}
        </div>
        <div className={'msla-chatbot-footer'}>
          <div className={'msla-protected-footer'}>
            <ShieldCheckmarkRegular className="shield-checkmark-regular" /> {intlText.protectedMessage}
          </div>
          <ChatSuggestionGroup>
            {canSaveCurrentFlow && (
              <ChatSuggestion
                text={intlText.chatSuggestion.saveButton}
                iconName={'Save'}
                onClick={() => saveCurrentFlow(false) /*TODO: add method to save workflow*/}
              />
            )}
            {canTestCurrentFlow && (
              <ChatSuggestion
                text={intlText.chatSuggestion.testButton}
                iconName={'TestBeaker'}
                onClick={() => testCurrentFlow(false) /*TODO: add method to test workflow*/}
              />
            )}
          </ChatSuggestionGroup>
          <ChatInput
            textFieldRef={textInputRef}
            disabled={!answerGeneration}
            isMultiline={true}
            maxQueryLength={QUERY_MAX_LENGTH}
            onQueryChange={(_ev, newValue) => {
              setInputQuery(newValue ?? '');
            }}
            placeholder={intlText.chatInputPlaceholder}
            query={inputQuery}
            showCharCount={true}
            submitButtonProps={{
              title: intlText.submitButtonTitle,
              disabled: !answerGeneration || inputQuery.length < QUERY_MIN_LENGTH,
              iconProps: {
                iconName: 'Send',
                styles:
                  !answerGeneration || inputQuery.length < QUERY_MIN_LENGTH
                    ? inputIconButtonStyles.disabled
                    : inputIconButtonStyles.enabled,
              },
              onClick: () => onSubmitInputQuery(inputQuery),
            }}
          />
        </div>
      </div>
    </Panel>
  );
};
