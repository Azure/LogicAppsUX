import { ChatBubble } from './chatBubble';
import type { ReactionItem } from './conversationItem';
import { ChatEntryReaction } from './conversationItem';
import { Link, mergeStyles } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

type FeedbackMessageProps = {
  item: ReactionItem;
};

export const FeedbackMessage: React.FC<FeedbackMessageProps> = ({ item }) => {
  const intl = useIntl();
  const intlText = {
    feedbackCardPanelTitle: intl.formatMessage({
      defaultMessage: 'Send feedback',
      description: 'Chatbot feedback card title',
    }),
    feedbackCardThumbsDownLinkText: intl.formatMessage({
      defaultMessage: 'Tell Microsoft how this feature could be improved',
      description: 'Chatbot feedback card link asking how we can improve this feature',
    }),
    feedbackCardThumbsUpLinkText: intl.formatMessage({
      defaultMessage: 'Tell Microsoft what you liked about this feature',
      description: 'Chatbot feedback card link asking what user liked about the feature',
    }),
  };
  return item.askFeedback ? (
    <ChatBubble
      key={item.id}
      isUserMessage={false}
      isAIGenerated={false}
      date={item.date}
      isMarkdownMessage={false}
      className={mergeStyles({ marginTop: 8 })}
    >
      {item.reaction === ChatEntryReaction.thumbsUp && (
        <Link
          // TODO: onClick={} openFeedbackPanel(item)}
          text={intlText.feedbackCardThumbsUpLinkText}
          isUnderlinedStyle={true}
        />
      )}
      {item.reaction === ChatEntryReaction.thumbsDown && (
        <Link
          // TODO: onClick={} openFeedbackPanel(item)}
          text={intlText.feedbackCardThumbsUpLinkText}
          isUnderlinedStyle={true}
        />
      )}
    </ChatBubble>
  ) : null;
};
