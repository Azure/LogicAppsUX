import { useCallback, useMemo, useState, type FC, type FormEvent } from 'react';
import { Nl2fInputBox } from './nl2fInputBox';
import { TokenPickerHeader } from './tokenpickerheader';
import { ThumbsReactionButton } from '../../lib/chatbot/components/thumbsReactionButton';
import { ChatEntryReaction } from '../../lib/chatbot/components/chatBubble';
import { Button } from '@fluentui/react-components';
import {
  Checkmark20Filled,
  ChevronLeft16Filled,
  ChevronLeft16Regular,
  ChevronRight16Filled,
  ChevronRight16Regular,
  bundleIcon,
} from '@fluentui/react-icons';
import type { ExpressionEditorEvent } from '../../lib/expressioneditor';
import { TokenPickerMode } from '.';
import useIntl from 'react-intl/src/components/useIntl';
import type { Nl2fSuggestedExpression } from '@microsoft/logic-apps-shared';
import { CopilotService, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { ProgressCardWithStopButton } from '../../lib/chatbot';

export interface INl2fExpressionAssistantProps {
  isFullScreen: boolean;
  expression: ExpressionEditorEvent;
  isFixErrorRequest: boolean;
  setFullScreen: (fullScreen: boolean) => void;
  setSelectedMode: (value: React.SetStateAction<TokenPickerMode>) => void;
  setExpression: React.Dispatch<React.SetStateAction<ExpressionEditorEvent>>;
  setExpressionEditorError: (error: string) => void;
}

export const Nl2fExpressionAssistant: FC<INl2fExpressionAssistantProps> = ({
  isFullScreen,
  expression,
  isFixErrorRequest,
  setFullScreen,
  setSelectedMode,
  setExpression,
  setExpressionEditorError,
}) => {
  const [userInput, setUserInput] = useState('');
  const [nl2fOutput, setNl2fOutput] = useState(expression?.value);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [isInvalidExpression, setIsInvalidExpression] = useState(isFixErrorRequest);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestedExpressions, setSuggestedExpressions] = useState<Nl2fSuggestedExpression[]>();
  const [suggestedExpressionIndex, setSuggestedExpressionIndex] = useState<number>(0);
  const [controller, setController] = useState(new AbortController());
  const signal = controller.signal;
  const abortFetching = useCallback(() => {
    controller.abort();
  }, [controller]);

  const intl = useIntl();
  const intlText = useMemo(() => {
    return {
      fixExpressionText: intl.formatMessage(
        {
          defaultMessage: 'Fix my expression: {expression}',
          id: 'kBTFhL',
          description: 'Prepopulated text in the input box when the user is trying to fix an invalid expression by using copilot.',
        },
        {
          expression: expression.value,
        }
      ),
      progressBarText: intl.formatMessage({
        defaultMessage: '🖊️ Working on it...',
        id: 'eDHwU7',
        description: 'Progress bar telling user that the AI response is being generated',
      }),
      progressCardStopButtonLabel: intl.formatMessage({
        defaultMessage: 'Stop generating',
        id: 'wP0/uB',
        description: 'Label for the button on the progress card that stops AI response generation',
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
      showPreviousSuggestion: intl.formatMessage({
        defaultMessage: 'Previous suggestion',
        id: 'EMbxLf',
        description: 'The hover over text and alt text for the suggestions left navigation button',
      }),
      showNextSuggestion: intl.formatMessage({
        defaultMessage: 'Next suggestion',
        id: 'aWdfiw',
        description: 'The hover over text and alt text for the suggestions right navigation button',
      }),
      suggestionIndex: intl.formatMessage(
        {
          defaultMessage: '{suggestionIndex} of {suggestionsCount}',
          id: '2yUM4j',
          description: 'The position in the results carrousel',
        },
        {
          suggestionIndex: suggestedExpressionIndex + 1,
          suggestionsCount: suggestedExpressions?.length,
        }
      ),
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
      },
    };
  }, [expression.value, intl, lastSubmittedQuery, suggestedExpressionIndex, suggestedExpressions?.length]);

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

  const setNl2fOutputError = (errorMessage: string) => {
    setErrorMessage(errorMessage);
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
        setSuggestedExpressions(undefined);
        return;
      }

      if (query === expression.value) {
        setNl2fOutputError(intlText.errors.originalExpressionError);
        setIsGeneratingAnswer(false);
        setSuggestedExpressions(undefined);
        return;
      }

      setLastSubmittedQuery(query);
      setIsGeneratingAnswer(true);

      try {
        const response = await CopilotService().getNl2fExpressions(query, expression.value, signal);
        if (response.errorMessage) {
          setNl2fOutputError(response.errorMessage);
          setSuggestedExpressions(undefined);
        } else {
          setSuggestedExpressions(response.suggestions);
          setSuggestedExpressionIndex(0);
          setNl2fOutput((response.suggestions && response.suggestions[0].suggestedExpression) ?? '');
          setNl2fOutputError('');
        }
      } catch (error: any) {
        const cancelled_code = 'ERR_CANCELED';
        if (error?.code === cancelled_code) {
          setController(new AbortController());
          LoggerService().log({
            level: LogEntryLevel.Warning,
            area: 'nl2fExpressionAssistant',
            message: error.message,
            error: error instanceof Error ? error : undefined,
          });
        } else {
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: 'nl2fExpressionAssistant',
            message: error.message,
            error: error instanceof Error ? error : undefined,
          });
          setNl2fOutputError(error.message);
        }
      } finally {
        setIsGeneratingAnswer(false);
      }
    },
    [lastSubmittedQuery, expression.value, intlText.errors, signal]
  );

  const onQueryChange = (_ev: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue: string | undefined) => {
    setUserInput(newValue ?? '');
  };

  const handleAcceptResult = () => {
    setExpressionEditorError('');
    setExpression({ ...expression, value: nl2fOutput });
    setSelectedMode(TokenPickerMode.EXPRESSION);
  };

  const navigateToPreviousSuggestion = () => {
    if (suggestedExpressions && suggestedExpressionIndex > 0) {
      const newIndex = suggestedExpressionIndex - 1;
      setNl2fOutput(suggestedExpressions[newIndex].suggestedExpression);
      setSuggestedExpressionIndex(newIndex);
    }
  };

  const navigateToNextSuggestion = () => {
    if (suggestedExpressions && suggestedExpressionIndex < suggestedExpressions.length - 1) {
      const newIndex = suggestedExpressionIndex + 1;
      setNl2fOutput(suggestedExpressions[newIndex].suggestedExpression);
      setSuggestedExpressionIndex(newIndex);
    }
  };

  const LeftNavigateIcon = bundleIcon(ChevronLeft16Filled, ChevronLeft16Regular);
  const RightNavigateIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);

  if (isInvalidExpression) {
    setUserInput(intlText.fixExpressionText);
    onSubmitInputQuery(intlText.fixExpressionText);
    setIsInvalidExpression(false);
  }

  return (
    <div className="msla-token-picker-nl2f">
      <TokenPickerHeader
        fullScreen={isFullScreen}
        isExpression={true}
        isNl2fExpression={true}
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
          query={userInput}
          showCharCount={true}
          onSubmitInputQuery={onSubmitInputQuery}
        />
      </div>

      {isGeneratingAnswer && (
        <div className="msla-token-picker-nl2fex-result-section">
          <ProgressCardWithStopButton
            data-testId={'expression-assistant-progress-card'}
            onStopButtonClick={() => abortFetching()}
            progressState={intlText.progressBarText}
            stopButtonLabel={intlText.progressCardStopButtonLabel}
          />
        </div>
      )}
      {!isGeneratingAnswer && (!!nl2fOutput || errorMessage) && (
        <div className="msla-token-picker-nl2fex-result-section" data-testId={'expression-assistant-result-section'}>
          <div className="msla-token-picker-nl2f-results-title-container">
            <span className="msla-token-picker-nl2f-title" data-testId={'expression-assistant-output-box-title'}>
              {!!nl2fOutput && !lastSubmittedQuery ? intlText.originalExpressionTitle : intlText.suggestedExpressionTitle}
            </span>
          </div>
          <div className="msla-token-picker-nl2fex-result-output" data-testId={'expression-assistant-output-box'}>
            <span>{errorMessage ? errorMessage : nl2fOutput}</span>
          </div>
          <div
            className="msla-token-picker-nl2fex-result-footer"
            data-testId={'expression-assistant-result-footer'}
            style={{ visibility: !!nl2fOutput && !lastSubmittedQuery ? 'hidden' : 'visible' }}
          >
            <div
              data-testId={'expression-assistant-result-carousel'}
              className="msla-token-picker-nl2fex-result-carousel"
              style={{ visibility: suggestedExpressions && suggestedExpressions.length > 1 ? 'visible' : 'hidden' }}
            >
              <Button
                appearance="subtle"
                aria-label={intlText.showPreviousSuggestion}
                icon={<LeftNavigateIcon />}
                className={'msla-token-picker-nl2f-suggestions-navigation'}
                onClick={() => {
                  navigateToPreviousSuggestion();
                }}
                data-automation-id="msla-token-picker-nl2f-suggestions-previous"
                disabled={suggestedExpressionIndex === 0}
              />
              <span className="msla-token-picker-nl2fex-suggestions-index">{intlText.suggestionIndex}</span>
              <Button
                appearance="subtle"
                icon={<RightNavigateIcon />}
                className={'msla-token-picker-nl2f-suggestions-navigation'}
                onClick={() => {
                  navigateToNextSuggestion();
                }}
                aria-label={intlText.showNextSuggestion}
                data-automation-id="msla-token-picker-nl2f-suggestions-next"
                disabled={suggestedExpressionIndex === (suggestedExpressions && suggestedExpressions.length - 1)}
              />
            </div>
            <div className="msla-token-picker-nl2fex-result-disclaimer-tag">
              <span className="msla-token-picker-nl2fex-result-disclaimer-text">{intlText.aIGeneratedDisclaimer}</span>
            </div>
            <div
              className="msla-token-picker-nl2fex-result-feedback-buttons-container"
              data-testId={'expression-assistant-result-feedback'}
            >
              <ThumbsReactionButton
                onClick={() => onMessageReactionClicked(ChatEntryReaction.thumbsUp)}
                isVoted={reaction === ChatEntryReaction.thumbsUp}
                isDownvote={false}
              />
              <ThumbsReactionButton
                onClick={() => onMessageReactionClicked(ChatEntryReaction.thumbsDown)}
                isVoted={reaction === ChatEntryReaction.thumbsDown}
                isDownvote={true}
              />
            </div>
          </div>
          <div className="msla-token-picker-nl2fex-result-footer">
            <Button
              data-testId={'expression-assistant-ok-button'}
              className="msla-token-picker-nl2fex-result-footer-ok-button"
              disabled={!!errorMessage}
              aria-label={intlText.OK}
              onClick={handleAcceptResult}
            >
              <Checkmark20Filled />
              {intlText.OK}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
