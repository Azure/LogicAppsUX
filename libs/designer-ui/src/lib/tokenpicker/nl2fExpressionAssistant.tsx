import { useCallback, useMemo, useState, type FC, type FormEvent } from 'react';
import { Nl2fInputBox } from './nl2fInputBox';
import { TokenPickerHeader } from './tokenpickerheader';
import { ThumbsReactionButton } from '../../lib/chatbot/components/thumbsReactionButton';
import { ChatEntryReaction } from '../../lib/chatbot/components/chatBubble';
import { Button } from '@fluentui/react-components';
import { Checkmark20Filled } from '@fluentui/react-icons';
import { FontSizes, IconButton } from '@fluentui/react';
import { ProgressCardWithStopButton } from '../../lib/chatbot/components/progressCardWithStopButton';
import type { ExpressionEditorEvent } from 'lib/expressioneditor';
import { TokenPickerMode } from '.';
import useIntl from 'react-intl/src/components/useIntl';
import { CopilotService, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export interface INl2fExpressionAssistantProps {
  isFullScreen: boolean;
  isExpression: boolean;
  isNl2fExpression: boolean;
  setFullScreen: (fullScreen: boolean) => void;
  expression: ExpressionEditorEvent;
  setExpression: React.Dispatch<React.SetStateAction<ExpressionEditorEvent>>;
  feedbackDisabled?: boolean;
  setSelectedMode: (value: React.SetStateAction<TokenPickerMode>) => void;
  setExpressionEditorError: (error: string) => void;
}

export const Nl2fExpressionAssistant: FC<INl2fExpressionAssistantProps> = ({
  isFullScreen,
  isExpression,
  isNl2fExpression,
  setFullScreen,
  expression,
  setExpression,
  feedbackDisabled,
  setSelectedMode,
  setExpressionEditorError,
}) => {
  const [nl2fOutput, setNl2fOutput] = useState(expression?.value);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [nl2fInput, setNl2fInput] = useState(''); // CHANGE THIS - Should be empty and on submit append the current expression if it's updating it
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const intl = useIntl();
  const intlText = useMemo(() => {
    return {
      progressBarText: intl.formatMessage({
        defaultMessage: '🖊️ Working on it...',
        id: 'eDHwU7',
        description: 'Progress bar telling user that the AI response is being generated',
      }),
      stopGeneratingText: intl.formatMessage({
        defaultMessage: 'Stop generating',
        id: 'qWJIYw',
        description: 'Text for button that stops the generation of an output.',
      }),
      aIGeneratedDisclaimer: intl.formatMessage({
        defaultMessage: 'AI-generated content may be incorrect',
        id: 'JMwMaK',
        description: 'Disclaimer message on AI-generated content potentially being incorrect',
      }),
      suggestedExpressionTitle: intl.formatMessage({
        defaultMessage: 'Suggested expression',
        id: 'pjC3M9',
        description: 'Title of section containing suggested expressions.',
      }),
      originalExpressionTitle: intl.formatMessage({
        defaultMessage: 'Original expression',
        id: 'tQIXhy',
        description: 'Title of section containing the original expression that will be updated.',
      }),
      OK: intl.formatMessage({
        defaultMessage: 'OK',
        id: '70cHmm',
        description: 'OK button',
      }),
      refreshResults: intl.formatMessage({
        defaultMessage: 'Refresh results',
        id: '5VxGRF',
        description: 'The hover over text and alt text for the refresh results button',
      }),
      placeholders: {
        updateExpressionPlaceholderText: intl.formatMessage({
          defaultMessage: "Describe how you'd like to update your expression.",
          id: 'Agqhgu',
          description: 'Placeholder used when a user is trying to update an existing expression.',
        }),
        newExpressionPlaceholderText: intl.formatMessage({
          defaultMessage:
            'Describe the expression you want Copilot to create. You can reference data from other actions in the flow. For example, “Combine the first and last name of the person who went the email” or “Check the status of the current job.”',
          id: 'Pkxg6Q',
          description: 'Placeholder used when a user is trying to create a new expression.',
        }),
      },
      errors: {
        duplicateSubmissionError: intl.formatMessage(
          {
            defaultMessage:
              'Please submit a different query than the previously submitted query. Previously submitted query: {lastSubmittedQuery}',
            id: 'eyuBr7',
            description: 'Error message displayed when user submits the same query twice',
          },
          { lastSubmittedQuery }
        ),
        originalExpressionError: intl.formatMessage(
          {
            defaultMessage: 'Please explain how you would like to update your expression: "{expression}"',
            id: 'v4JmCE',
            description: 'Error message displayed when user submits the original query without anything else.',
          },
          { expression: expression.value }
        ),
        serviceIssueError: intl.formatMessage({
          defaultMessage:
            'There was a problem creating an expression. This is usually due to a temporary issue, so please try again in a little while.',
          id: '1dxaVh',
          description: 'Error message shown when we are experiencing service issues.',
        }),
        clientIssueError: intl.formatMessage({
          defaultMessage: 'There was a problem creating an expression. Please rephrase your prompt and try again.',
          id: 'v1v/0n',
          description: 'Error message shown when we are experiencing service issues.',
        }),
      },
    };
  }, [expression.value, intl, lastSubmittedQuery]);

  const [reaction, setReaction] = useState<ChatEntryReaction | undefined>(undefined);
  const logFeedbackVote = useCallback((reaction: ChatEntryReaction, isRemovedVote?: boolean) => {
    if (isRemovedVote) {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'nl2fExpressionAssistant: feedback',
        message: `Feedback Reaction: ${reaction} removed`,
      });
    } else {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'nl2fExpressionAssistant: feedback',
        message: `Feedback Reaction: ${reaction}`,
      });
    }
  }, []);

  const onMessageReactionClicked = (chatReaction: ChatEntryReaction) => {
    if (reaction) {
      logFeedbackVote?.(reaction, /*isRemovedVote*/ true);
    }
    if (reaction === chatReaction) {
      setReaction(undefined);
    } else {
      logFeedbackVote?.(chatReaction);
      setReaction(chatReaction);
    }
  };

  const [controller, setController] = useState(new AbortController());
  const signal = controller.signal;

  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  const setNl2fOutputError = (errorMessage: string) => {
    setErrorMessage(errorMessage);
  };

  // TODO: Check this lint error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formatInputPrompt = (input: string) => {
    return expression.value ? `${input}: original expression {${expression.value}}` : input;
  };

  const onSubmitInputQuery = useCallback(
    async (input: string) => {
      const query = input.trim();
      if (!query) {
        return;
      }

      if (lastSubmittedQuery === query) {
        setNl2fOutputError(intlText.errors.duplicateSubmissionError);
        setIsGeneratingAnswer(false);
        return;
      }

      if (query === expression.value) {
        setNl2fOutputError(intlText.errors.originalExpressionError);
        setIsGeneratingAnswer(false);
        return;
      }

      setLastSubmittedQuery(query);
      setIsGeneratingAnswer(true);

      try {
        const response = await CopilotService().getNl2fExpression(formatInputPrompt(query), signal);

        // TODO: remove this once client interface is implemented + make it a promise then-able
        setTimeout(() => {
          setNl2fOutput(formatInputPrompt(query));
          setIsGeneratingAnswer(false);
        }, 2000);
        if (!isSuccessResponse(response.status)) {
          throw new Error(response.statusText);
        }

        setNl2fOutputError('');
        // const queryResponse: string = response.data.properties.response;
        // commenting out usage of additionalParameters until Logic Apps backend is updated to include this response property
        // const additionalParameters: AdditionalParametersItem = response.data.properties.additionalParameters;
      } catch (error: any) {
        setNl2fOutput('');
        if (error?.code === 'ERR_CANCELED') {
          setIsGeneratingAnswer(false);
          setController(new AbortController());
        } else {
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: 'nl2fExpressionAssistant',
            message: error.message,
            error: error instanceof Error ? error : undefined,
          });
          setNl2fOutputError('Some Error Message');
          setIsGeneratingAnswer(false);
        }
      }
    },
    [
      lastSubmittedQuery,
      expression.value,
      intlText.errors.duplicateSubmissionError,
      intlText.errors.originalExpressionError,
      formatInputPrompt,
    ]
  );

  const onQueryChange = (_ev: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue: string | undefined) => {
    setNl2fInput(newValue ?? '');
  };

  const handleAcceptResult = () => {
    setExpressionEditorError('');
    setExpression({ ...expression, value: nl2fOutput });
    setSelectedMode(TokenPickerMode.EXPRESSION);
  };

  return (
    <div className="msla-token-picker-nl2f">
      <TokenPickerHeader
        fullScreen={isFullScreen}
        isExpression={isExpression}
        isNl2fExpression={isNl2fExpression}
        setFullScreen={setFullScreen}
        setSelectedMode={setSelectedMode}
      />
      <div>
        <Nl2fInputBox
          textFieldRef={undefined}
          disabled={isGeneratingAnswer}
          isMultiline={true}
          maxQueryLength={300}
          onQueryChange={onQueryChange}
          placeholder={
            expression?.value ? intlText.placeholders.updateExpressionPlaceholderText : intlText.placeholders.newExpressionPlaceholderText
          }
          query={nl2fInput}
          showCharCount={true}
          onSubmitInputQuery={onSubmitInputQuery}
        />
      </div>

      {isGeneratingAnswer && (
        <div className="msla-token-picker-nl2fex-result-section">
          <ProgressCardWithStopButton
            onStopButtonClick={() => abortFetching()}
            progressState={intlText.progressBarText}
            stopButtonLabel={intlText.stopGeneratingText}
          />
        </div>
      )}
      {((!!nl2fOutput && !isGeneratingAnswer) || errorMessage) && (
        <div className="msla-token-picker-nl2fex-result-section">
          <div className="msla-token-picker-nl2f-results-title-container">
            <span className="msla-token-picker-nl2f-title">
              {!!nl2fOutput && !lastSubmittedQuery ? intlText.originalExpressionTitle : intlText.suggestedExpressionTitle}
            </span>
          </div>
          <div className="msla-token-picker-nl2fex-result-output">
            <span>{errorMessage ? errorMessage : nl2fOutput}</span>
          </div>
          <div className="msla-token-picker-nl2fex-result-feedback-container">
            <div className="msla-token-picker-nl2fex-result-disclaimer-tag">
              <span className="msla-token-picker-nl2fex-result-disclaimer-text">{intlText.aIGeneratedDisclaimer}</span>
            </div>
            <div className="msla-token-picker-nl2fex-result-feedback-buttons-container">
              <ThumbsReactionButton
                onClick={() => onMessageReactionClicked(ChatEntryReaction.thumbsUp)}
                isVoted={reaction === ChatEntryReaction.thumbsUp}
                isDownvote={false}
                disabled={feedbackDisabled}
              />
              <ThumbsReactionButton
                onClick={() => onMessageReactionClicked(ChatEntryReaction.thumbsDown)}
                isVoted={reaction === ChatEntryReaction.thumbsDown}
                isDownvote={true}
                disabled={feedbackDisabled}
              />
            </div>
          </div>
          <div className="msla-token-picker-nl2fex-result-footer">
            <Button
              className="msla-token-picker-nl2fex-result-footer-ok-button"
              disabled={false}
              aria-label={intlText.OK}
              onClick={handleAcceptResult}
            >
              <Checkmark20Filled />
              {intlText.OK}
            </Button>
            <IconButton
              className={'msla-token-picker-nl2fex-result-footer-refresh-button'}
              title={intlText.refreshResults}
              styles={{ icon: { fontSize: FontSizes.medium } }}
              iconProps={{ iconName: 'Sync' }}
              onClick={() => {
                console.log('refresh results clicked');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export function isSuccessResponse(statusCode: number): boolean {
  return statusCode >= 200 && statusCode <= 299;
}
