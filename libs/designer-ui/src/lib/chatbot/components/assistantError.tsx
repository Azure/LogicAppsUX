import { useFeedbackMessage, useReportBugButton } from '../feedbackHelper';
import { ChatBubble } from './chatBubble';
import type { AssistantErrorItem } from './conversationItem';
import { TechnicalErrorMessage } from './technicalErrorMessage';
import type { IButtonProps } from '@fluentui/react';
import { useIntl } from 'react-intl';

type AssistantErrorProps = {
  item: AssistantErrorItem;
};

export const AssistantError = ({ item }: AssistantErrorProps) => {
  const reportBugButton = useReportBugButton(false);
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const intl = useIntl();
  const intlText = {
    flowCreatedDefaultMessage: intl.formatMessage({
      defaultMessage: 'Here’s your flow.',
      description: 'Chatbot report a bug button',
    }),
    technicalErrorDefaultMessage: intl.formatMessage({
      defaultMessage: 'Sorry, something went wrong. Please try again.',
      description: 'Chatbot report a bug button',
    }),
    throttlingErrorDefaultMessage: intl.formatMessage({
      defaultMessage: 'Sorry, Copilot is at capacity and temporarily unavailable — please try again in a little while.',
      description: 'Chatbot report a bug button',
    }),
    noAnswerDefaultMessage: intl.formatMessage({
      defaultMessage: 'Sorry, I couldn’t understand your request. Please rephrase it and try again.',
      description: 'Chatbot report a bug button',
    }),
    flowUpdatedWithNoDiffDefaultMessage: intl.formatMessage({
      defaultMessage: 'Your flow has been updated.',
      description: 'Chatbot report a bug button',
    }),
  };

  const additionalFooterActions: IButtonProps[] | undefined = [];
  additionalFooterActions.push(reportBugButton);

  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={false}
        date={item.date}
        selectedReaction={reaction}
        onThumbsReactionClicked={(reaction) => onMessageReactionClicked(reaction)}
        disabled={false} // TODO: add state isGeneratingAnswer}
        additionalFooterActions={additionalFooterActions}
      >
        <TechnicalErrorMessage message={intlText.technicalErrorDefaultMessage} chatSessionId={item.chatSessionId} />
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
