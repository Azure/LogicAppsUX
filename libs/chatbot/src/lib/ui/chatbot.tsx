import constants from '../common/constants';
import type { Workflow } from '../common/models/workflow';
import { isSuccessResponse } from '../core/util';
import LogicApps from '../images/LogicApps.svg';
import Sparkle from '../images/Sparkle.svg';
import SparkleDisabled from '../images/SparkleDisabled.svg';
import { IconButton, Panel, PanelType, css, getId } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { LogEntryLevel, LoggerService } from '@microsoft/designer-client-services-logic-apps';
import type { ConversationItem, PromptGuideItem } from '@microsoft/designer-ui';
import {
  PanelLocation,
  ChatInput,
  ConversationItemType,
  ConversationMessage,
  FlowOrigin,
  ProgressCardWithStopButton,
  ChatSuggestionGroup,
  ChatSuggestion,
  PromptGuideContextualMenu,
  PromptGuideMenuKey,
  PromptGuideItemKey,
  PromptGuideCard,
} from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const inputIconButtonStyles = {
  enabled: {
    root: {
      color: 'rgb(51, 51, 51)',
      backgroundColor: 'transparent',
    },
  },
  disabled: {
    root: {
      backgroundColor: 'transparent',
      color: 'rgb(200, 200, 200)',
    },
  },
};

interface ChatbotProps {
  panelLocation?: PanelLocation;
  endpoint?: string;
  getUpdatedWorkflow: () => Promise<Workflow>;
}
const QUERY_MIN_LENGTH = 5;
const QUERY_MAX_LENGTH = 2000;
export const Chatbot = ({ panelLocation = PanelLocation.Left, endpoint, getUpdatedWorkflow }: ChatbotProps) => {
  const chatSessionId = useRef(guid());
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [answerGeneration, stopAnswerGeneration] = useState(true);
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
  const [selectedPromptGuideItemKey, setSelectedPromptGuideItemKey] = useState<PromptGuideItemKey | undefined>(undefined);
  const promptGuideButtonRef = useRef<HTMLButtonElement>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([
    {
      type: ConversationItemType.Greeting,
      origin: FlowOrigin.Default,
      id: getId(),
      date: new Date(),
      reaction: undefined,
      askFeedback: false,
    },
  ]);
  const [isPromptGuideOpen, { toggle: togglePromptGuide, setFalse: closePromptGuide }] = useBoolean(false);
  const [controller, setController] = useState(new AbortController());
  const signal = controller.signal;
  const [selectedOperation] = useState('');

  const intlText = useMemo(() => {
    return {
      headerTitle: intl.formatMessage({
        defaultMessage: 'Copilot',
        description: 'Chatbot header title',
      }),
      pill: intl.formatMessage({
        defaultMessage: 'In-Development',
        description: 'Label in the chatbot header stating the chatbot feature is still in-development',
      }),
      chatInputPlaceholder: intl.formatMessage({
        defaultMessage: 'Ask a question or describe how you want to change this flow',
        description: 'Chabot input placeholder text',
      }),
      submitButtonTitle: intl.formatMessage({
        defaultMessage: 'Submit',
        description: 'Submit button',
      }),
      actionsButtonTitle: intl.formatMessage({
        defaultMessage: 'Actions',
        description: 'Actions button',
      }),
      closeButtonTitle: intl.formatMessage({
        defaultMessage: 'Close',
        description: 'Close button',
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

      const options = {
        content: {
          queryId: guid(),
          createTime: date.toJSON(),
          query,
          workflowJson: await getUpdatedWorkflow(),
        },
      };
      stopAnswerGeneration(false);
      try {
        const response = await axios.post(`${endpoint}/api/QueryWorkflow`, options.content, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          signal,
        });
        if (!isSuccessResponse(response.status)) {
          throw new Error(response.statusText);
        }
        const queryResponse: string = response.data.response;
        setConversation((current) => [
          {
            type: ConversationItemType.Reply,
            id: response.data.queryId,
            date: new Date(),
            text: queryResponse,
            isMarkdownText: false,
            correlationId: chatSessionId.current,
            __rawRequest: options,
            __rawResponse: response,
            reaction: undefined,
            askFeedback: false,
          },
          ...current,
        ]);
        stopAnswerGeneration(true);
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
              __rawRequest: options,
              __rawResponse: error,
              reaction: undefined,
              askFeedback: false,
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
              __rawRequest: options,
              __rawResponse: error,
              reaction: undefined,
              askFeedback: false,
            },
            ...current,
          ]);
          stopAnswerGeneration(true);
        }
      }
    },
    [endpoint, getUpdatedWorkflow, intlText, signal]
  );

  const onPromptGuideItemClicked = useCallback(
    (item: PromptGuideItem) => {
      setSelectedPromptGuideItemKey(item.itemKey);

      const setInputAndFocus = (query: string) => {
        if (query.length === 0) {
          // User removed or rephrased the sentence, discard selected guide.
          setSelectedPromptGuideItemKey(undefined);
        }
        setInputQuery(query);
      };

      switch (item.itemKey) {
        case PromptGuideItemKey.ReplaceAction:
          if (selectedOperation) {
            setInputAndFocus(intlText.queryTemplates.replaceActionSentenceStartFormat);
          }
          break;
        case PromptGuideItemKey.AddAction:
          setInputAndFocus(intlText.queryTemplates.addActionSentenceStart);
          break;
        case PromptGuideItemKey.ExplainAction:
          if (selectedOperation) {
            onSubmitInputQuery(intlText.queryTemplates.explainActionSentenceFormat);
          }
          break;
        case PromptGuideItemKey.ExplainFlow:
          onSubmitInputQuery(intlText.queryTemplates.explainFlowSentence);
          break;
        case PromptGuideItemKey.CreateFlowExample1:
          setInputAndFocus(intlText.queryTemplates.createFlow1SentenceStart);
          break;
        case PromptGuideItemKey.CreateFlowExample2:
          setInputAndFocus(intlText.queryTemplates.createFlow2SentenceStart);
          break;
        case PromptGuideItemKey.CreateFlowExample3:
          setInputAndFocus(intlText.queryTemplates.createFlow3SentenceStart);
          break;
        case PromptGuideItemKey.Question:
          setInputAndFocus(intlText.queryTemplates.questionSentenceStart);
          break;
        case PromptGuideItemKey.EditFlow:
          setInputAndFocus(intlText.queryTemplates.editFlowSentenceStart);
          break;
        case PromptGuideItemKey.CreateFlow:
          // CreateFlow opens a sub-menu
          break;
        default:
          break;
      }
    },
    [onSubmitInputQuery, selectedOperation, intlText.queryTemplates]
  );

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  useEffect(() => {
    setInputQuery('');
    setSelectedPromptGuideItemKey(undefined);
  }, [conversation]);

  return (
    <Panel
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      customWidth={'340px'}
      hasCloseButton={false}
      isBlocking={false}
      layerProps={{ styles: { root: { zIndex: 0, display: 'flex' } } }}
    >
      <div className={'msla-chatbot-container'}>
        <div className={'msla-chatbot-header'}>
          <div className={'msla-chatbot-header-icon'}>
            <img src={LogicApps} alt="Logic Apps" />
          </div>
          <div className={'msla-chatbot-header-title'}>{intlText.headerTitle}</div>
          <div className={'msla-chatbot-header-mode-pill'}>{intlText.pill}</div>
          <IconButton
            className={'msla-chatbot-close-button'}
            title={intlText.closeButtonTitle}
            iconProps={{ iconName: 'Clear' }}
            onClick={() => {
              setCollapsed(true);
            }}
          />
        </div>
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
          {selectedPromptGuideItemKey && <PromptGuideCard itemKey={selectedPromptGuideItemKey} />}
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
            disabled={!answerGeneration}
            footerActionsProps={[
              {
                title: intlText.actionsButtonTitle,
                onClick: togglePromptGuide,
                disabled: !answerGeneration,
                toggle: true,
                checked: isPromptGuideOpen,
                elementRef: promptGuideButtonRef,
                iconProps: {
                  imageProps: {
                    src: !answerGeneration ? SparkleDisabled : Sparkle,
                  },
                },
              },
            ]}
            isMultiline={true}
            maxQueryLength={QUERY_MAX_LENGTH}
            onQueryChange={(ev, newValue) => {
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
          {isPromptGuideOpen ? (
            <PromptGuideContextualMenu
              onDismiss={closePromptGuide}
              target={promptGuideButtonRef}
              initialMenu={PromptGuideMenuKey.DefaultFlow}
              onMenuItemClick={onPromptGuideItemClicked}
            />
          ) : null}
        </div>
      </div>
    </Panel>
  );
};
