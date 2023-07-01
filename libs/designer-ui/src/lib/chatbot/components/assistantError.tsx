import { ChatBubble } from './chatBubble';
import type { AssistantErrorItem } from './conversationItem';
import { FeedbackMessage } from './feedbackMessage';
import { TechnicalErrorMessage } from './message';
import type { IButtonProps } from '@fluentui/react';
import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

type AssistantErrorProps = {
  item: AssistantErrorItem;
};

export const AssistantError: React.FC<AssistantErrorProps> = ({ item }) => {
  const intl = useIntl();
  const intlText = {
    reportABugText: intl.formatMessage({
      defaultMessage: 'Report a bug',
      description: 'Chatbot report a bug button',
    }),
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
  const onReportBugClick = useCallback(() => {
    const githubIssuesLink = 'https://github.com/Azure/LogicAppsUX/issues/new?assignees=&labels=&projects=&template=bug_report.yml';
    window.open(githubIssuesLink, '_blank');
  }, []);

  const footerActions: IButtonProps[] | undefined = [];
  footerActions.push({
    text: intlText.reportABugText,
    onClick: onReportBugClick,
    iconProps: { iconName: 'Bug' },
  });

  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={false}
        date={item.date}
        isMarkdownMessage={false}
        selectedReaction={item.reaction}
        onThumbsReactionClicked={(reaction) => reaction} // TODO: add onMessageReactionClicked(item, reaction)}
        disabled={false} // TODO: add state isGeneratingAnswer}
        footerActions={footerActions}
      >
        <TechnicalErrorMessage message={intlText.technicalErrorDefaultMessage} chatSessionId={item.chatSessionId} />
      </ChatBubble>
      <FeedbackMessage item={item} />
    </div>
  );
};
