import { IconButton, Panel, PanelType, css, getId, getTheme } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
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
import { guid, type LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

interface ChatbotProps {
  panelLocation?: PanelLocation;
  workflowDefinition?: LogicAppsV2.WorkflowDefinition;
}

const getInputIconButtonStyles = () => {
  const theme = getTheme();
  return {
    root: { color: theme.palette.neutralPrimary, backgroundColor: 'transparent' },
    rootDisabled: { backgroundColor: 'transparent' },
  };
};

const QUERY_MAX_LENGTH = 2000;

export const Chatbot = ({ panelLocation = PanelLocation.Left, workflowDefinition }: ChatbotProps) => {
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [answerGeneration, stopAnswerGeneration] = useState(true);
  const [canSaveCurrentFlow, saveCurrentFlow] = useState(false);
  const [canTestCurrentFlow, testCurrentFlow] = useState(false);
  const [isSaving] = useState(false);
  const [selectedPromptGuideItemKey, setSelectedPromptGuideItemKey] = useState<PromptGuideItemKey | undefined>(undefined);
  const inputIconButtonStyles = getInputIconButtonStyles();
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
  const [selectedOperation] = useState('');
  const intlText = {
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
  };

  const onSubmitInputQuery = useCallback(
    async (input: string) => {
      let query = input.trim(); //Query.trim();
      if (query !== '') {
        setConversation((current) => [
          {
            type: ConversationItemType.Query,
            id: guid(), // using this for now to give it a unique id, but will change later
            date: new Date(),
            text: input.trim(),
          },
          ...current,
        ]);
        if (query.includes(intlText.queryTemplates.explainFlowSentence.toLocaleLowerCase()) && workflowDefinition) {
          query = query.concat(': ' + JSON.stringify(workflowDefinition));
        }
        setInputQuery(query);
        stopAnswerGeneration(false);
        fetch('http://localhost:3000/submit', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ role: 'user', content: query }),
        })
          .then((response) => response.json())
          .then((body) => {
            setConversation((current) => [
              {
                type: ConversationItemType.Reply,
                id: guid(),
                date: new Date(),
                text: body.content,
                isMarkdownText: false,
                correlationId: '',
                __rawRequest: '',
                __rawResponse: '',
                reaction: undefined,
                askFeedback: false,
              },
              ...current,
            ]);
            stopAnswerGeneration(true);
          })
          .catch((error) => {
            console.error(error);
          });
      }
    },
    [intlText.queryTemplates.explainFlowSentence, workflowDefinition]
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
          {/*TODO: Add icon for header*/}
          <div className={'msla-chatbot-header-title'}>{intlText.headerTitle}</div>
          <div className={'msla-chatbot-header-mode-pill'}>{intlText.pill}</div>
          <IconButton
            title={intlText.closeButtonTitle}
            iconProps={{ iconName: 'Clear' }}
            onClick={() => {
              setCollapsed(true);
            }}
            className={'msla-chatbot-close-button'}
          />
        </div>
        <div className={css('msla-chatbot-content')}>
          {!answerGeneration && (
            <ProgressCardWithStopButton
              progressState={'🖊️ Working on it...'}
              //onStopButtonClick={() => stopAnswerGeneration(true)}
              //stopButtonLabel={'Stop generating'}
            />
          )}
          {isSaving && <ProgressCardWithStopButton progressState={'💾 Saving this flow...'} />}
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
            query={inputQuery}
            placeholder={intlText.chatInputPlaceholder}
            isMultiline={true}
            showCharCount={true}
            maxQueryLength={QUERY_MAX_LENGTH}
            submitButtonProps={{
              title: intlText.submitButtonTitle,
              disabled: false, // TODO: add var to set isChatInputSubmitDisabled,
              iconProps: {
                iconName: 'Send',
                styles: inputIconButtonStyles,
              },
              onClick: () => onSubmitInputQuery(inputQuery),
            }}
            footerActionsProps={[
              {
                title: intlText.actionsButtonTitle,
                onClick: togglePromptGuide, // TODO: Should open up list of options
                toggle: true,
                checked: isPromptGuideOpen,
                elementRef: promptGuideButtonRef,
              },
            ]}
            onQueryChange={(ev, newValue) => {
              setInputQuery(newValue ?? '');
            }}
          />
          <PromptGuideContextualMenu
            isOpen={isPromptGuideOpen}
            onDismiss={closePromptGuide}
            target={promptGuideButtonRef}
            initialMenu={PromptGuideMenuKey.DefaultFlow}
            onMenuItemClick={onPromptGuideItemClicked}
          />
        </div>
      </div>
    </Panel>
  );
};
